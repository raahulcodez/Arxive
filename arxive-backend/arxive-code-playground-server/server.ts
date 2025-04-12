import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { Account, Aptos, AptosConfig, Network, SimpleTransaction } from '@aptos-labs/ts-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Accept'],
}));
app.use(express.json({ limit: '10mb' }));

const GEMINI_API_KEYS: string[] = [
  process.env.GEMINI_API_KEY1 || '',
  process.env.GEMINI_API_KEY2 || '',
  process.env.GEMINI_API_KEY3 || ''
].filter(key => key !== '');

const APTOS_NETWORK = (process.env.APTOS_NETWORK as Network) || Network.DEVNET;
const aptosConfig = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(aptosConfig);

const APTOS_NODE_URL = APTOS_NETWORK === Network.MAINNET 
  ? "https://fullnode.mainnet.aptoslabs.com" 
  : APTOS_NETWORK === Network.TESTNET 
    ? "https://fullnode.testnet.aptoslabs.com" 
    : "https://fullnode.devnet.aptoslabs.com";

let currentKeyIndex = 0;

interface Logger {
  info: (message: string) => void;
  error: (message: string, error?: any) => void;
  debug: (message: string) => void;
}

const logger: Logger = {
  info: (message: string): void => console.log(`[INFO] ${new Date().toISOString()}: ${message}`),
  error: (message: string, error?: any): void => {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
    if (error) {
      if (error.stack) {
        console.error(error.stack);
      } else {
        console.error(error);
      }
    }
  },
  debug: (message: string): void => {
    if (process.env.DEBUG) {
      console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
    }
  }
};

// Basic health check endpoint
app.get('/health', (req: Request, res: Response): void => {
  logger.info('Health check request received');
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

function getNextApiKey(): string {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('No API keys available');
  }
  const key = GEMINI_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;
  logger.info(`Rotating to API key index: ${currentKeyIndex}`);
  return key;
}

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = getNextApiKey();
  return new GoogleGenerativeAI(apiKey);
}

interface CursorPosition {
  line: number;
  column: number;
}

interface CompletionResponse {
  code: string;
  insertPosition?: CursorPosition;
  replacementLength?: number;
}

interface AssistResponse {
  code: string;
  description?: string;
  changeType: 'ADDITION' | 'MODIFICATION' | 'REPLACEMENT';
  placement?: {
    startLine: number;
    endLine: number;
  };
  imports?: string[];
}

interface ExplainConcept {
  name: string;
  explanation: string;
}

interface ExplainSecurity {
  aspect: string;
  analysis: string;
}

interface ExplainSuggestion {
  description: string;
  code?: string;
}

interface ExplainFunction {
  name: string;
  purpose: string;
  parameters: string;
  returns: string;
}

interface ExplainResponse {
  summary: string;
  functionality: string;
  concepts?: ExplainConcept[];
  security?: ExplainSecurity[];
  suggestions?: ExplainSuggestion[];
  functions?: ExplainFunction[];
}

function enhanceCompletionPrompt(userCode: string, cursor?: CursorPosition, userRequest?: string): string {
  return `
You are an expert in the MOVE programming language used in the Aptos blockchain.

CODE CONTEXT:
\`\`\`move
${userCode}
\`\`\`

CURSOR POSITION: Line ${cursor?.line || 'N/A'}, Column ${cursor?.column || 'N/A'}

USER REQUEST:
${userRequest || 'Complete this code'}

INSTRUCTIONS:
1. Based on the code and cursor position, generate the most appropriate code completion.
2. Focus on Aptos best practices, resource safety, and idiomatic MOVE code.
3. Your response must be in the following JSON format (and ONLY this format):

{
  "code": "YOUR_GENERATED_CODE_HERE",
  "insertPosition": {
    "line": LINE_NUMBER_FOR_INSERTION,
    "column": COLUMN_NUMBER_FOR_INSERTION
  },
  "replacementLength": NUMBER_OF_CHARACTERS_TO_REPLACE_IF_ANY
}

Notes:
- The "code" should contain ONLY the code to insert, no additional explanation.
- If you're unsure about exact positions, provide your best estimate.
- Keep code idiomatic to MOVE language and ensure it addresses resource handling properly.
`;
}

function enhanceAssistPrompt(userCode: string, userRequest: string): string {
  return `
You are an expert in the MOVE programming language used in the Aptos blockchain.

CODE CONTEXT:
\`\`\`move
${userCode}
\`\`\`

USER REQUEST:
${userRequest}

INSTRUCTIONS:
1. Provide the most accurate, efficient, and idiomatic MOVE code that addresses the user's request.
2. Focus on Aptos best practices, safety, and resource management.
3. If generating a new module or extending existing code, ensure proper resource handling with 'has' abilities.
4. Your response must be in the following JSON format (and ONLY this format):

{
  "code": "YOUR_GENERATED_CODE_HERE",
  "description": "A brief description of what the generated code does",
  "changeType": "ADDITION | MODIFICATION | REPLACEMENT",
  "placement": {
    "startLine": START_LINE_NUMBER_IF_APPLICABLE,
    "endLine": END_LINE_NUMBER_IF_APPLICABLE
  },
  "imports": ["List of required imports if any"]
}

Notes:
- The "code" field should contain the complete code solution.
- "changeType" must be one of: "ADDITION" (new code), "MODIFICATION" (edits to existing), or "REPLACEMENT" (full replacement).
- Be as precise as possible with line numbers if they can be determined.
- If adding new imports, list them in the "imports" array.
`;
}

function enhanceExplainPrompt(userCode: string): string {
  return `
You are an expert in the MOVE programming language for Aptos blockchain.

CODE TO EXPLAIN:
\`\`\`move
${userCode}
\`\`\`

INSTRUCTIONS:
Analyze the provided MOVE code and return a response in the following JSON format (and ONLY this format):

{
  "summary": "One sentence summary of what this code does",
  "functionality": "Detailed explanation of the code's purpose and functionality",
  "concepts": [
    {
      "name": "Concept name (e.g., 'Resource Management', 'Struct Definition')",
      "explanation": "Explanation of how this concept is used in the code"
    }
  ],
  "security": [
    {
      "aspect": "Security aspect name (e.g., 'Resource Safety', 'Access Control')",
      "analysis": "Analysis of this security aspect in the code"
    }
  ],
  "suggestions": [
    {
      "description": "Description of improvement suggestion",
      "code": "Example code implementing the suggestion (if applicable)"
    }
  ],
  "functions": [
    {
      "name": "Function name",
      "purpose": "Function purpose",
      "parameters": "Function parameters",
      "returns": "Return type/values"
    }
  ]
}
`;
}

function safeParseJSON(text: string): any | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Failed to parse JSON from AI response:", error);
    return null;
  }
}

function extractCodeFromText(text: string): string {
  const codeBlockMatch = text.match(/```(?:move)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }
  return text;
}

interface CodeCompleteRequest {
  code: string;
  cursor?: CursorPosition;
  request?: string;
}

app.post('/api/code/complete', async (req: Request<{}, {}, CodeCompleteRequest>, res: Response): Promise<void> => {
  try {
    const { code, cursor, request } = req.body;
    logger.info(`Code completion request received. Cursor: ${JSON.stringify(cursor)}`);
    
    if (!code) {
      logger.error('Missing code in completion request');
      res.status(400).json({ error: 'Code is required' });
      return;
    }
    
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = enhanceCompletionPrompt(code, cursor, request);
    logger.info('Sending completion request to Gemini API');
    
    const result = await model.generateContent(prompt);
    logger.info('Received completion response from Gemini API');
    const response = result.response;
    const text = response.text();
    
    const jsonResponse = safeParseJSON(text) as CompletionResponse | null;
    
    if (jsonResponse) {
      logger.info('Successfully parsed JSON response for completion');
      res.json(jsonResponse);
    } else {
      logger.info('Falling back to text extraction for completion response');
      const codeCompletion = extractCodeFromText(text);
      res.json({ 
        code: codeCompletion,
        insertPosition: cursor || { line: 0, column: 0 },
        replacementLength: 0
      });
    }
  } catch (error: any) {
    logger.error('Gemini API error in code completion:', error);
    res.status(500).json({ error: 'Failed to generate code completion', message: error.message });
  }
});

interface CodeAssistRequest {
  code: string;
  request: string;
}

app.post('/api/code/assist', async (req: Request<{}, {}, CodeAssistRequest>, res: Response): Promise<void> => {
  try {
    const { code, request } = req.body;
    logger.info(`Code assist request received. Request: "${request?.substring(0, 50)}${request?.length > 50 ? '...' : ''}"`);
    
    if (!code || !request) {
      logger.error('Missing code or request in assist request');
      res.status(400).json({ error: 'Code and request are required' });
      return;
    }
    
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = enhanceAssistPrompt(code, request);
    logger.info('Sending assist request to Gemini API');
    
    const result = await model.generateContent(prompt);
    logger.info('Received assist response from Gemini API');
    const response = result.response;
    const text = response.text();
    
    const jsonResponse = safeParseJSON(text) as AssistResponse | null;
    
    if (jsonResponse) {
      logger.info('Successfully parsed JSON response for assist');
      res.json(jsonResponse);
    } else {
      logger.info('Falling back to text extraction for assist response');
      const assistedCode = extractCodeFromText(text);
      res.json({ 
        code: assistedCode,
        description: "Generated code based on your request",
        changeType: "REPLACEMENT" as const,
        placement: { startLine: 1, endLine: code.split('\n').length },
        imports: []
      });
    }
  } catch (error: any) {
    logger.error('Gemini API error in code assist:', error);
    res.status(500).json({ error: 'Failed to generate code assistance', message: error.message });
  }
});

interface CodeExplainRequest {
  code: string;
}

app.post('/api/code/explain', async (req: Request<{}, {}, CodeExplainRequest>, res: Response): Promise<void> => {
  try {
    const { code } = req.body;
    logger.info('Code explain request received');
    
    if (!code) {
      logger.error('Missing code in explain request');
      res.status(400).json({ error: 'Code is required' });
      return;
    }
    
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = enhanceExplainPrompt(code);
    logger.info('Sending explain request to Gemini API');
    
    const result = await model.generateContent(prompt);
    logger.info('Received explain response from Gemini API');
    const response = result.response;
    const text = response.text();
    
    const jsonResponse = safeParseJSON(text) as ExplainResponse | null;
    
    if (jsonResponse) {
      logger.info('Successfully parsed JSON response for explain');
      res.json(jsonResponse);
    } else {
      logger.info('Falling back to text-based explanation');
      const explanation = text;
      res.json({ 
        summary: "Code analysis",
        functionality: explanation,
        concepts: [],
        security: [],
        suggestions: [],
        functions: []
      });
    }
  } catch (error: any) {
    logger.error('Gemini API error in code explanation:', error);
    res.status(500).json({ error: 'Failed to generate code explanation', message: error.message });
  }
});

interface CodeCompileRequest {
  code: string;
}

interface CodeFixRequest {
  code: string;
  errors: string;
}

interface CompilationError {
  message: string;
  location?: {
    line: number;
    column: number;
  };
  code?: string;
  details?: string;
}

interface CompilationResult {
  success: boolean;
  errors?: string[];
  errorDetails?: CompilationError[];
  gasEstimate?: number;
  gasBreakdown?: {
    computationCost: number;
    storageCost: number;
    storageFee: number;
  };
  estimatedCostApt?: string;
  transactionOutput?: any;
}

function enhanceFixPrompt(userCode: string, errorMessages: string): string {
  return `
You are an expert in the MOVE programming language used in the Aptos blockchain.

CODE WITH ERRORS:
\`\`\`move
${userCode}
\`\`\`

COMPILATION ERRORS:
${errorMessages}

INSTRUCTIONS:
1. Analyze the code and the compilation errors.
2. Fix ALL errors in the code according to Move language rules and Aptos best practices.
3. Provide the complete fixed code, not just the changes.
4. Your response must be in the following JSON format (and ONLY this format):

{
  "fixedCode": "YOUR_FIXED_CODE_HERE",
  "explanation": "Brief explanation of the issues and how they were fixed"
}

Notes:
- Make sure your fixes follow Move language best practices and maintain the original intent of the code.
- If there are multiple errors, fix all of them.
- If you're unsure about how to fix a specific error, make your best educated guess based on Move language syntax and semantics.
- The "fixedCode" should contain the entire corrected module, not just the fixed lines.
`;
}

function execWithTimeout(command: string, timeoutMs: number = 20000): Promise<{stdout: string, stderr: string}> {
  return new Promise((resolve, reject) => {
    logger.info(`Executing command with ${timeoutMs}ms timeout: ${command}`);
    
    const childProcess = exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
    
    const timeout = setTimeout(() => {
      childProcess.kill();
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
    }, timeoutMs);
    
    childProcess.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

async function createTempMoveProject(code: string): Promise<{ projectPath: string, filePath: string, moduleName: string, address: string }> {
  
  const moduleMatch = code.match(/module\s+(?:([a-zA-Z0-9_]+)::)?([a-zA-Z0-9_]+)/);
  let moduleName = 'temp_module';
  let addressName = 'module_addr';
  let address = '0x1'; // Default address
  
  if (moduleMatch) {
    if (moduleMatch[1]) {
      addressName = moduleMatch[1];
      moduleName = moduleMatch[2];
      
      if (addressName.startsWith('0x')) {
        address = addressName;
      } else {
        address = '0x1'; 
        logger.info(`Found named address: ${addressName}, will map to ${address} in Move.toml`);
      }
    } else {
      moduleName = moduleMatch[2];
    }
  }
  
  logger.info(`Extracted module info - name: ${moduleName}, address: ${addressName}, hex: ${address}`);
  
  const tempDir = path.join(os.tmpdir(), `aptos-move-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  
  fs.mkdirSync(tempDir, { recursive: true });
  const sourcesDir = path.join(tempDir, 'sources');
  fs.mkdirSync(sourcesDir, { recursive: true });
  
  const addressMappings: Record<string, string> = {};
  
  const standardAddresses = {
    'std': '0x1',
    'aptos_framework': '0x1',
    'aptos_std': '0x1',
    'aptos_token': '0x3'
  };
  
  addressMappings[addressName] = address;
  
  const addressRegex = /(?:address|use)\s+([a-zA-Z0-9_]+)::/g;
  let match;
  while ((match = addressRegex.exec(code)) !== null) {
    const namedAddr = match[1];
    if (!namedAddr.startsWith('0x') && !addressMappings[namedAddr]) {
      addressMappings[namedAddr] = '0x1';
      logger.info(`Found reference to named address: ${namedAddr}, mapping to 0x1`);
    }
  }
  
  Object.entries(standardAddresses).forEach(([name, addr]) => {
    if (!addressMappings[name]) {
      addressMappings[name] = addr;
    }
  });
  
  const addressEntries = Object.entries(addressMappings)
    .map(([name, addr]) => `${name} = "${addr}"`)
    .join('\n');
  
  const moveToml = `
[package]
name = "MoveProject"
version = "0.0.1"

[dependencies]
AptosFramework = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/aptos-framework/", rev = "mainnet" }

[addresses]
${addressEntries}
`;
  
  const moveTomlPath = path.join(tempDir, 'Move.toml');
  fs.writeFileSync(moveTomlPath, moveToml);
  logger.info(`Created Move.toml at ${moveTomlPath}`);
  logger.debug(`Move.toml content:\n${moveToml}`);
  
  const filePath = path.join(sourcesDir, `${moduleName}.move`);
  fs.writeFileSync(filePath, code);
  
  logger.info(`Created module file at ${filePath}`);
  logger.info(`Address mappings in Move.toml: ${JSON.stringify(addressMappings)}`);
  
  try {
    const fileList = listFilesRecursively(tempDir);
    logger.info(`Created project structure with files: ${JSON.stringify(fileList)}`);
  } catch (error) {
    logger.error(`Error listing project files: ${error}`);
  }
  
  return { projectPath: tempDir, filePath, moduleName, address };
}

function listFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(listFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  });
  
  return results;
}

async function estimateGas(projectPath: string, moduleName: string, address: string): Promise<any> {
  try {
    const sender = Account.generate();
    
    if (APTOS_NETWORK !== Network.MAINNET) {
      try {
        await aptos.fundAccount({
          accountAddress: sender.accountAddress,
          amount: 100_000_000, // 1 APT
        });
      } catch (error: any) {
        logger.error('Error funding account for simulation:', error);
      }
    }
    
    try {
      logger.info(`Compiling module to get bytecode in ${projectPath}`);
      const { stdout } = await execWithTimeout(`aptos move compile --package-dir ${projectPath} --save-metadata`, 30000);
      
      const buildDir = path.join(projectPath, 'build', 'MoveProject');
      const metadataPath = path.join(buildDir, 'package-metadata.bcs');
      const bytecodePath = path.join(buildDir, 'bytecode_modules', `${moduleName}.mv`);
      
      logger.info(`Looking for metadata at: ${metadataPath}`);
      logger.info(`Looking for bytecode at: ${bytecodePath}`);
      
      if (!fs.existsSync(metadataPath)) {
        logger.error(`Metadata file not found at ${metadataPath}`);
        throw new Error('Metadata file not found');
      }
      
      if (!fs.existsSync(bytecodePath)) {
        logger.error(`Bytecode file not found at ${bytecodePath}`);
        
        if (fs.existsSync(path.join(buildDir, 'bytecode_modules'))) {
          const files = fs.readdirSync(path.join(buildDir, 'bytecode_modules'));
          logger.info(`Files in bytecode_modules directory: ${JSON.stringify(files)}`);
        } else {
          logger.error(`bytecode_modules directory doesn't exist in ${buildDir}`);
        }
        
        throw new Error('Bytecode artifacts not found');
      }
      
      const metadata = fs.readFileSync(metadataPath);
      const bytecode = fs.readFileSync(bytecodePath);
      
      logger.info('Successfully read metadata and bytecode, building transaction');
      
      const transaction = await aptos.transaction.build.simple({
        sender: sender.accountAddress,
        data: {
          function: "0x1::code::publish_package_txn",
          functionArguments: [
            Array.from(metadata), 
            [Array.from(bytecode)], 
          ],
        },
      });
      
      logger.info('Simulating transaction for gas estimation');
      
      const [simulationResult] = await aptos.transaction.simulate.simple({
        transaction,
      });
      
      const gasUsed = parseInt(simulationResult.gas_used);
      
      let gasUnitPrice = 100; 
      try {
        const gasPriceResponse = await fetch(`${APTOS_NODE_URL}/v1/estimate_gas_price`);
        const gasPriceData = await gasPriceResponse.json();
        gasUnitPrice = gasPriceData.gas_estimate || gasUnitPrice;
        logger.info(`Current gas unit price from API: ${gasUnitPrice}`);
      } catch (gasPriceError) {
        logger.error('Error fetching gas price, using default:', gasPriceError);
      }
      
      const estimatedCostApt = (gasUsed * gasUnitPrice / 100_000_000).toFixed(8);
      
      logger.info(`SDK simulation successful, gas used: ${gasUsed}, gas unit price: ${gasUnitPrice}`);
      
      return {
        success: true,
        method: 'simulation',
        gasEstimate: gasUsed,
        gasUnitPrice: gasUnitPrice,
        estimatedCostApt,
        gasBreakdown: {
          computationCost: Math.floor(gasUsed * 0.7), 
          storageCost: Math.floor(gasUsed * 0.2),     
          storageFee: Math.floor(gasUsed * 0.1)       
        },
        transactionOutput: simulationResult
      };
    } catch (error: any) {
      logger.error('Error in SDK gas estimation:', error);
      
      try {
        logger.info('Falling back to CLI gas estimation');
        const { stdout } = await execWithTimeout(`aptos move compile --package-dir ${projectPath} --estimate-gas`, 30000);
        logger.info(`CLI gas estimation output: ${stdout.substring(0, 200)}...`);
        
        const gasMatch = stdout.match(/Gas estimate: (\d+)/i);
        const gasEstimate = gasMatch ? parseInt(gasMatch[1]) : null;
        
        if (gasEstimate) {
          logger.info(`CLI gas estimation successful, gas estimate: ${gasEstimate}`);
          
          let gasUnitPrice = 100; 
          try {
            const gasPriceResponse = await fetch(`${APTOS_NODE_URL}/v1/estimate_gas_price`);
            const gasPriceData = await gasPriceResponse.json();
            gasUnitPrice = gasPriceData.gas_estimate || gasUnitPrice;
            logger.info(`Current gas unit price from API: ${gasUnitPrice}`);
          } catch (gasPriceError) {
            logger.error('Error fetching gas price, using default:', gasPriceError);
          }
          
          const estimatedCostApt = (gasEstimate * gasUnitPrice / 100_000_000).toFixed(8);
          
          return {
            success: true,
            method: 'cli',
            gasEstimate,
            gasUnitPrice: gasUnitPrice,
            estimatedCostApt,
            gasBreakdown: {
              computationCost: Math.floor(gasEstimate * 0.7),
              storageCost: Math.floor(gasEstimate * 0.2),
              storageFee: Math.floor(gasEstimate * 0.1)
            }
          };
        } else {
          logger.info('Could not parse gas estimate from CLI output');
        }
      } catch (cliError: any) {
        logger.error('CLI gas estimation error:', cliError);
      }
      
      logger.info('Using fixed gas estimate as fallback');
      
      let gasUnitPrice = 100; 
      try {
        const gasPriceResponse = await fetch(`${APTOS_NODE_URL}/v1/estimate_gas_price`);
        const gasPriceData = await gasPriceResponse.json();
        gasUnitPrice = gasPriceData.gas_estimate || gasUnitPrice;
        logger.info(`Current gas unit price from API for fallback: ${gasUnitPrice}`);
      } catch (gasPriceError) {
        logger.error('Error fetching gas price for fallback, using default:', gasPriceError);
      }
      
      const estimatedCostApt = (50000 * gasUnitPrice / 100_000_000).toFixed(8);
      
      return {
        success: true,
        method: 'estimate',
        gasEstimate: 50000, // Conservative estimate
        gasUnitPrice: gasUnitPrice,
        estimatedCostApt,
        gasBreakdown: {
          computationCost: 35000,
          storageCost: 10000,
          storageFee: 5000
        },
        note: 'This is an approximation as exact estimation failed',
        error: error.message || 'Unknown error in gas estimation'
      };
    }
  } catch (error: any) {
    logger.error('Error in gas estimation:', error);
    return {
      success: false,
      method: 'failed',
      error: error.message || 'Unknown error in gas estimation'
    };
  }
}

async function compileMoveWithCLI(projectPath: string): Promise<{ success: boolean, output: string, detailedErrors?: string }> {
  try {
    logger.info(`Running Aptos CLI command: aptos move compile --package-dir ${projectPath}`);
    
    try {
      const { stdout: versionOutput } = await execWithTimeout('aptos --version', 5000);
      logger.info(`Aptos CLI version: ${versionOutput.trim()}`);
    } catch (versionError) {
      logger.error('Error checking Aptos CLI version:', versionError);
      return { 
        success: false, 
        output: 'Aptos CLI not found or not properly installed. Please install Aptos CLI: https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli' 
      };
    }
    
    logger.info('Starting compilation with 30 second timeout');
    try {
      const { stdout, stderr } = await execWithTimeout(`aptos move compile --package-dir ${projectPath}`, 30000);
      logger.info(`Stdout: ${stdout}`);
      logger.info(`Stderr: ${stderr}`);
      
      if (stdout.includes('"Error"') || stderr.includes('"Error"') || 
          stdout.includes('error[E') || stderr.includes('error[E') || 
          stdout.toLowerCase().includes('compilation failed') || stderr.toLowerCase().includes('compilation failed')) {
        
        const fullErrorOutput = [stderr, stdout].filter(Boolean).join('\n\n');
        logger.error(`Compilation failed with output: ${fullErrorOutput}`);
        
        try {
          const { stdout: traceStdout, stderr: traceStderr } = 
            await execWithTimeout(`aptos move compile --package-dir ${projectPath} 2>&1`, 30000);
          
          const traceOutput = [traceStderr, traceStdout].filter(Boolean).join('\n\n');
          logger.info(`Got additional output from trace: ${traceOutput.length} chars`);
          
          return { 
            success: false, 
            output: fullErrorOutput || 'Compilation failed',
            detailedErrors: traceOutput || fullErrorOutput
          };
        } catch (error) {
          logger.error('Failed to get additional error details');
          return {
            success: false,
            output: fullErrorOutput || 'Compilation failed',
            detailedErrors: fullErrorOutput
          };
        }
      }
      
      logger.info(`Compilation successful: ${stdout}`);
      return { success: true, output: stdout };
    } catch (error: any) {
      const errorOutput = [error.stderr, error.stdout, error.message].filter(Boolean).join('\n\n');
      logger.error(`Compilation failed with error: ${errorOutput}`);
      
      if (error.message && error.message.includes('timed out')) {
        return {
          success: false,
          output: 'Compilation timed out after 30 seconds. Your code may be too complex or there might be an issue with the Aptos CLI.'
        };
      }
      
      return { 
        success: false, 
        output: errorOutput,
        detailedErrors: errorOutput
      };
    }
  } catch (error: any) {
    logger.error('Unexpected error in compileMoveWithCLI:', error);
    return {
      success: false,
      output: error.message || 'Unexpected error during compilation',
      detailedErrors: error.message || 'Unexpected error during compilation'
    };
  }
}

function parseCompilationErrors(errorOutput: string, filePath: string, detailedErrors?: string): CompilationError[] {
  const errors: CompilationError[] = [];
  
  if (detailedErrors && detailedErrors.length > 0) {
    logger.info('Attempting to parse detailed error information');
    
    const errorLines = detailedErrors.split('\n');
    
    for (let i = 0; i < errorLines.length; i++) {
      const line = errorLines[i].trim();
      
      if (line.match(/error\[E\d+\]:/) || line.match(/^error:/i)) {
        const errorMatch = line.match(/error(?:\[E\d+\])?:(.+)/i);
        const message = errorMatch ? errorMatch[1].trim() : line.trim();
        
        let location = undefined;
        let code = undefined;
        let j = i + 1;
        
        while (j < errorLines.length && j < i + 10) {
          const nextLine = errorLines[j].trim();
          
          const locationMatch = nextLine.match(/(?:in\s+)?(?:file\s+)?([^:]+):(\d+):(\d+)(?:\s*->\s*(\d+):(\d+))?/i);
          if (locationMatch && !location) {
            location = {
              file: locationMatch[1],
              line: parseInt(locationMatch[2]),
              column: parseInt(locationMatch[3])
            };
          }
          
          if (nextLine.includes('│') && nextLine.match(/\d+\s*│/)) {
            if (!code) code = '';
            code += nextLine + '\n';
          }
          
          j++;
        }
        
        errors.push({
          message,
          location: location ? {
            line: location.line,
            column: location.column
          } : undefined,
          code: code || undefined
        });
      }
    }
    
    if (errors.length > 0) {
      logger.info(`Parsed ${errors.length} detailed errors from verbose output`);
      return errors;
    }
  }
  
  logger.info('Falling back to standard error parsing');
  const lines = errorOutput.split('\n');
  
  const errorRegex = /(?:error\[E\d+\]:|error:)\s*(.+?)(?:\s*at location (\d+):(\d+)(?:->\s*(\d+):(\d+))?|$)/i;
  const fileErrorRegex = new RegExp(`(?:${path.basename(filePath)}|sources/[^:]+):(?:(\\d+):(\\d+)|(\\d+)).*?: (.+)`, 'i');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.includes('error[E') || line.includes('error:')) {
      const match = line.match(errorRegex);
      const fileMatch = line.match(fileErrorRegex);
      
      if (fileMatch) {
        const lineNum = parseInt(fileMatch[1] || fileMatch[3] || '1');
        const colNum = parseInt(fileMatch[2] || '1');
        const message = fileMatch[4];
        
        let codeContext = '';
        if (i + 1 < lines.length && 
            !lines[i + 1].match(errorRegex) && 
            !lines[i + 1].match(fileErrorRegex) &&
            !lines[i + 1].includes('error')) {
          codeContext = lines[i + 1].trim();
        }
        
        errors.push({
          message: message,
          location: {
            line: lineNum,
            column: colNum
          },
          code: codeContext || undefined
        });
      } else if (match) {
        const message = match[1];
        const startLine = match[2] ? parseInt(match[2]) : undefined;
        const startCol = match[3] ? parseInt(match[3]) : undefined;
        
        errors.push({
          message: message,
          location: startLine ? {
            line: startLine,
            column: startCol || 1
          } : undefined
        });
      } else {
        errors.push({
          message: line.replace(/error(?:\[E\d+\])?:/, '').trim()
        });
      }
    }
  }
  
  if (errors.length === 0 && errorOutput.includes('{"Error":')) {
    try {
      const errorJson = JSON.parse(errorOutput);
      if (errorJson.Error) {
        errors.push({
          message: `Compilation error: ${errorJson.Error}`,
          details: 'The compiler did not provide detailed error information. Check your code syntax and structure.'
        });
      }
    } catch (e) {
      errors.push({
        message: 'Compilation failed',
        details: errorOutput.substring(0, 500) 
      });
    }
  }
  
  return errors.length > 0 ? errors : [{
    message: errorOutput.substring(0, 500), 
    details: 'The compiler did not provide structured error information.'
  }];
}

async function cleanupTempFiles(projectPath: string): Promise<void> {
  try {
    if (fs.existsSync(projectPath)) {
      const rmrf = (dirPath: string) => {
        if (fs.existsSync(dirPath)) {
          fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
              rmrf(curPath);
            } else {
              fs.unlinkSync(curPath);
            }
          });
          fs.rmdirSync(dirPath);
        }
      };
      rmrf(projectPath);
    }
  } catch (error) {
    logger.error(`Failed to clean up temp files at ${projectPath}:`, error);
  }
}

app.post('/api/code/compile', async (req: Request<{}, {}, CodeCompileRequest>, res: Response): Promise<void> => {
  let projectPath = '';
  
  try {
    const { code } = req.body;
    logger.info('Code compilation request received');
    
    if (!code) {
      logger.error('Missing code in compilation request');
      res.status(400).json({ 
        success: false,
        compilationSuccess: false,
        errors: ['Code is required'],
        errorDetails: [{ message: 'Code is required for compilation' }]
      });
      return;
    }
    
    logger.info('Creating temporary Move project');
    const tempProject = await createTempMoveProject(code);
    projectPath = tempProject.projectPath;
    logger.info(`Temporary project created at ${projectPath}`);
    
    logger.info('Compiling with Aptos CLI');
    const compileResult = await compileMoveWithCLI(projectPath);
    
    if (compileResult.success) {
      logger.info('Compilation successful, estimating gas...');
      
      try {
        
        const gasEstimate = await estimateGas(
          tempProject.projectPath, 
          tempProject.moduleName,
          tempProject.address
        );
        
        logger.info(`Returning compilation success with ${gasEstimate.method} gas estimate: ${gasEstimate.gasEstimate}`);
        res.json({
          success: true,
          compilationSuccess: true,
          gasEstimationSuccess: true,
          gasEstimate: gasEstimate.gasEstimate,
          estimatedCostApt: gasEstimate.estimatedCostApt,
          gasBreakdown: gasEstimate.gasBreakdown,
          estimationMethod: gasEstimate.method,
          compilerOutput: compileResult.output
        });
      } catch (gasError: any) {
        
        logger.error('Error during gas estimation after successful compilation:', gasError);
        res.json({
          success: true,
          compilationSuccess: true,
          gasEstimationSuccess: false,
          compilerOutput: compileResult.output,
          warnings: [gasError.message || 'Unknown error in gas estimation'],
          gasEstimate: 50000, // Fallback estimate
          estimatedCostApt: '0.00050000',
          gasBreakdown: {
            computationCost: 35000,
            storageCost: 10000,
            storageFee: 5000
          },
          estimationMethod: 'fallback'
        });
      }
    } else {
      logger.info('Compilation failed...');
      logger.error(`Compilation error output: ${compileResult.output}`);
      
      res.json({
        success: false,
        compilationSuccess: false,
        gasEstimationSuccess: false,
        errors: [compileResult.output],
        errorDetails: [{
          message: compileResult.output
        }],
        rawError: compileResult.output
      });
    }
    
  } catch (error: any) {
    logger.error('Error in code compilation:', error);
    res.status(500).json({ 
      success: false,
      compilationSuccess: false,
      gasEstimationSuccess: false,
      errors: [error.message || 'Internal server error during compilation'],
      errorDetails: [{
        message: error.message || 'Unknown error occurred'
      }]
    });
  } finally {
    
    if (projectPath) {
      logger.info(`Cleaning up temporary project at ${projectPath}`);
      await cleanupTempFiles(projectPath);
    }
  }
});

interface FunctionGasEstimateRequest {
  code: string;
  functionName: string;  
  args?: string[];      
}

app.post('/api/code/function-gas', async (req: Request<{}, {}, FunctionGasEstimateRequest>, res: Response): Promise<void> => {
  let projectPath = '';
  
  try {
    const { code, functionName, args = [] } = req.body;
    logger.info(`Function gas estimation request received for function: ${functionName}`);
    
    if (!code || !functionName) {
      logger.error('Missing code or function name in request');
      res.status(400).json({ error: 'Code and function name are required' });
      return;
    }
    
    const tempProject = await createTempMoveProject(code);
    projectPath = tempProject.projectPath;
    
    const compileResult = await compileMoveWithCLI(projectPath);
    
    if (!compileResult.success) {
      
      const errorDetails = parseCompilationErrors(compileResult.output, tempProject.filePath, compileResult.detailedErrors);
      res.json({
        success: false,
        errors: [compileResult.output],
        errorDetails: errorDetails
      });
      return;
    }
    
    try {
      const testScriptDir = path.join(projectPath, 'tests');
      fs.mkdirSync(testScriptDir, { recursive: true });
      
      const functionCallArgs = args.join(', ');
      const testScript = `
#[test]
fun test_function_gas() {
  module_addr::${tempProject.moduleName}::${functionName}(${functionCallArgs});
}
`;
      
      const testScriptPath = path.join(testScriptDir, `test_${functionName}.move`);
      fs.writeFileSync(testScriptPath, testScript);
      
      const { stdout, stderr } = await execAsync(`aptos move test --estimate-gas --package-dir ${projectPath}`);
      
      const gasMatch = stdout.match(/Gas used: (\d+)/i);
      const gasEstimate = gasMatch ? parseInt(gasMatch[1]) : 1000; // Default fallbac 
      
      res.json({
        success: true,
        functionName,
        gasEstimate,
        estimatedCostApt: (gasEstimate * 100 / 100_000_000).toFixed(8),
        gasBreakdown: {
          computationCost: Math.floor(gasEstimate * 0.8), 
          storageCost: Math.floor(gasEstimate * 0.15),
          storageFee: Math.floor(gasEstimate * 0.05)
        },
        output: stdout
      });
    } catch (error: any) {
      logger.error(`Error estimating gas for function ${functionName}:`, error);
      
      res.json({
        success: true,
        functionName,
        gasEstimate: 5000, 
        estimatedCostApt: '0.00005000',
        gasBreakdown: {
          computationCost: 4000,
          storageCost: 750,
          storageFee: 250
        },
        note: 'This is an approximation as exact function estimation failed',
        error: error.message || error.stderr || 'Unknown error in function gas estimation'
      });
    }
    
  } catch (error: any) {
    logger.error('Error in function gas estimation:', error);
    res.status(500).json({ 
      success: false,
      errors: ['Internal server error during function gas estimation'],
      errorDetails: [{
        message: error.message || 'Unknown error occurred'
      }]
    });
  } finally {
    // Clean up temporary files
    if (projectPath) {
      await cleanupTempFiles(projectPath);
    }
  }
});

app.post('/api/code/fix', async (req: Request<{}, {}, CodeFixRequest>, res: Response): Promise<void> => {
  try {
    const { code, errors } = req.body;
    logger.info('Code fix request received');
    
    if (!code || !errors) {
      logger.error('Missing code or errors in fix request');
      res.status(400).json({ 
        success: false,
        error: 'Code and errors are required'
      });
      return;
    }
    
    logger.info('Generating fix prompt');
    const prompt = enhanceFixPrompt(code, errors);
    
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    logger.info('Sending fix request to Gemini API');
    const result = await model.generateContent(prompt);
    logger.info('Received fix response from Gemini API');
    const response = result.response;
    const text = response.text();
    
    const jsonResponse = safeParseJSON(text);
    
    if (jsonResponse && jsonResponse.fixedCode) {
      logger.info('Successfully generated fixed code');
      res.json({ 
        fixedCode: jsonResponse.fixedCode,
        explanation: jsonResponse.explanation || 'Code fixed automatically'
      });
    } else {
      logger.error('Failed to parse fix response', text);
      const fixedCode = extractCodeFromText(text);
      res.json({ 
        fixedCode: fixedCode || code,
        explanation: 'Failed to parse AI response, extracted best guess'
      });
    }
  } catch (error: any) {
    logger.error('Error in code fix:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fix code', 
      message: error.message 
    });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error:', err);
  

  if (res.headersSent) {
    return next(err);
  }
  

  res.status(500).json({ 
    success: false, 
    error: 'Internal server error', 
    message: err.message || 'Unknown error occurred',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});


app.use((req: Request, res: Response): void => {
  res.status(404).json({ 
    success: false, 
    error: 'Not Found', 
    message: `The requested URL ${req.path} was not found on this server.`
  });
});


app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Using ${GEMINI_API_KEYS.length} Gemini API keys for load balancing`);
  logger.info(`Using Aptos Network: ${APTOS_NETWORK}`);
  logger.info(`API endpoints available: 
  - POST /api/code/complete
  - POST /api/code/assist
  - POST /api/code/explain
  - POST /api/code/compile
  - POST /api/code/function-gas 
  - POST /api/code/fix
  - GET /health`);
}); 