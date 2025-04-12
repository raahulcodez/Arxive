import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { exec } from 'child_process';
import fs from 'fs';
dotenv.config();
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import FormData from 'form-data';
import os from 'os';
import { AptosClient, AptosAccount, TxnBuilderTypes, BCS } from "aptos";
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import pkg from 'pg';
import jwt from 'jsonwebtoken';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const execAsync = promisify(exec);

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const APTOS_NODE_URL = process.env.APTOS_NODE_URL as string;
const TEMP_DIR = path.join(__dirname, 'temp');

const { Pool } = pkg;

const generateToken = (email: any) => {
  const jwtSecret = process.env.JWT_SECRET || 'your_default_secret';
  return jwt.sign({ email }, jwtSecret, { expiresIn: "7d" });
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.post('/connect-to-wallet', async (req: express.Request, res: express.Response): Promise<any> => {
  const { frontendWalletAddress } = req.body;

  if (!frontendWalletAddress) {
    return res.status(400).json({ error: 'No wallet address provided' });
  }

  try {
    const response = await axios.get(`${APTOS_NODE_URL}/accounts/${frontendWalletAddress}/resource/0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>`);
    
    const balance = response.data.data.coin.value;
    const formattedBalance = (parseInt(balance) / Math.pow(10, 8)).toFixed(2);

    res.json({
      address: frontendWalletAddress,
      balance: formattedBalance,
      rawBalance: balance
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      address: frontendWalletAddress,
      error: 'Failed to fetch balance',
      balance: '0.00'
    });
  }
});

app.get('/get-contracts/:address', async (req: express.Request, res: express.Response): Promise<any> => {
  const { address } = req.params;

  if (!address) {
    return res.status(400).json({ error: 'No wallet address provided' });
  }

  try {
    const modulesResponse = await axios.get(`${APTOS_NODE_URL}/accounts/${address}/modules`);
    const modules = modulesResponse.data;
    const contracts = {
      address: address,
      modules: modules.map((m: any) => ({
        bytecode: m.bytecode,
        abi: m.abi
      }))
    };

    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({
      address: address,
      error: 'Failed to fetch contracts',
      resources: [],
      modules: []
    });
  }
});

app.get('/get-contract-details', async (req: express.Request, res: express.Response): Promise<any> => {
  const { accountAddress, moduleName } = req.query;

  if (!accountAddress || !moduleName) {
    return res.status(400).json({ 
      error: 'Both accountAddress and moduleName parameters are required' 
    });
  }

  try {
    const moduleResponse = await axios.get(
      `${APTOS_NODE_URL}/accounts/${accountAddress}/module/${moduleName}`
    );
    const moduleData = moduleResponse.data;
    let abiData = null;
    try {
      const abiResponse = await axios.get(
        `${APTOS_NODE_URL}/accounts/${accountAddress}/module/${moduleName}/abi`
      );
      abiData = abiResponse.data;
    } catch (abiError) {
      console.warn('ABI not available for this contract');
    }

    let sourceCode = null;
    try {
      const sourceResponse = await axios.get(
        `${APTOS_NODE_URL}/accounts/${accountAddress}/module/${moduleName}/source`
      );
      sourceCode = sourceResponse.data;
    } catch (sourceError) {
      console.warn('Source code not available for this contract');
    }

    res.json({
      contractAddress: `${accountAddress}::${moduleName}`,
      bytecode: moduleData.bytecode,
      abi: abiData,
      source: sourceCode,
      metadata: {
        accountAddress,
        moduleName,
        chainId: moduleData.chain_id,
        timestamp: moduleData.timestamp
      }
    });
  } catch (error: any) {
    console.error('Error fetching contract details:', error);
    res.status(500).json({
      contractAddress: `${accountAddress}::${moduleName}`,
      error: 'Failed to fetch contract details',
      details: error.response?.data || error.message
    });
  }
});

app.post('/generate-deployment', async (req: express.Request, res: express.Response): Promise<any> => {
  const { senderAddress, moduleName, sourceCode } = req.body;

  if (!senderAddress || !moduleName || !sourceCode) {
    return res.status(400).json({ 
      error: 'senderAddress, moduleName, and sourceCode are required' 
    });
  }

  const tempDir = path.join(TEMP_DIR, uuidv4());
  const sourcesDir = path.join(tempDir, 'sources');

  try {
    // Create directory structure
    await mkdir(sourcesDir, { recursive: true });

    // Create Move.toml
    const moveTomlContent = `
[package]
name = "${moduleName}"
version = "1.0.0"
authors = []

[addresses]
sender = "${senderAddress}"

[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-framework.git"
rev = "mainnet"
subdir = "aptos-framework"
    `.trim();

    // Create Move source file
    const moveFilePath = path.join(sourcesDir, `${moduleName}.move`);

    await Promise.all([
      writeFile(path.join(tempDir, 'Move.toml'), moveTomlContent),
      writeFile(moveFilePath, sourceCode)
    ]);

    // Compile contract first
    await execAsync(
      `cd ${tempDir} && aptos move compile --save-metadata --named-addresses sender=${senderAddress}`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    // Generate raw transaction payload with better error handling
    const { stdout, stderr } = await execAsync(
      `cd ${tempDir} && aptos move publish --named-addresses sender=${senderAddress} --json`,
      { maxBuffer: 1024 * 1024 * 10 }
    );

    // Debug logging
    console.log('Command stdout:', stdout);
    console.log('Command stderr:', stderr);

    if (!stdout.trim()) {
      throw new Error('Empty response from aptos CLI');
    }

    let payload;
    try {
      const result = JSON.parse(stdout);
      payload = result.Result;
      if (!payload) {
        throw new Error('Invalid payload format');
      }
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      throw new Error(`Failed to parse aptos CLI output: ${stdout}`);
    }

    res.json({
      success: true,
      payload,
      moduleName,
      senderAddress
    });

  } catch (error: any) {
    console.error('Deployment Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stdout || error.stderr || 'No additional details'
    });
  } finally {
    // Cleanup
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Cleanup failed:', e);
    }
  }
});

app.post('/submit-signed-txn', async (req: express.Request, res: express.Response) : Promise<any>=> {
  const { signedTxn } = req.body;

  if (!signedTxn) {
    return res.status(400).json({ error: 'signedTxn is required' });
  }

  try {
    const response = await axios.post(
      `${APTOS_NODE_URL}/transactions`,
      signedTxn,
      { headers: { 'Content-Type': 'application/x.aptos.signed_transaction+bcs' } }
    );

    res.json({
      success: true,
      transactionHash: response.data.hash
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Transaction submission failed',
      details: error.response?.data || error.message
    });
  }
});

app.post('/archive-contract', async (req: express.Request, res: express.Response): Promise<any> => {
  const { contractData, address } = req.body;

  if (!contractData || !address) {
    return res.status(400).json({ error: 'Missing contractData or address' });
  }

  try {
    // 1. Upload to IPFS (simulate your local IPFS or Pinata)
    const tmpFileName = path.join(os.tmpdir(), `${contractData.moduleName || 'contract'}.json`);
    await fs.promises.writeFile(tmpFileName, JSON.stringify(contractData, null, 2));

    const form = new FormData();
    form.append('file', await fs.promises.readFile(tmpFileName), {
      filename: `${contractData.moduleName || 'contract'}.json`,
      contentType: 'application/json',
    });

    const response = await axios.post('http://172.16.44.147:3000/sendfile', form, {
      headers: form.getHeaders()
    });

    const cid = response.data.cid;

    // 2. Call Move function to store on-chain metadata
    const client = new AptosClient(APTOS_NODE_URL);
    const privateKey = process.env.APTOS_PRIVATE_KEY;
    if (!privateKey) {
      return res.status(500).json({ error: 'APTOS_PRIVATE_KEY is not set in environment variables' });
    }
    const keyBytes = Buffer.from(privateKey, 'hex');
    const registryAccount = new AptosAccount(keyBytes);

    const payload = {
      type: "entry_function_payload",
      function: `${process.env.APTOS_ACCOUNT_ADDRESS}::registry::archive_contract`,
      type_arguments: [],
      arguments: [cid, contractData.moduleName],
    };

    const txnRequest = await client.generateTransaction(registryAccount.address(), payload);
    const signedTxn = await client.signTransaction(registryAccount, txnRequest);
    const result = await client.submitTransaction(signedTxn);
    await client.waitForTransaction(result.hash);

    // 3. Cleanup and respond
    await fs.promises.unlink(tmpFileName);

    return res.json({
      success: true,
      cid,
      walletAddress: address,
      transactionHash: result.hash,
      message: 'Contract archived to IPFS and registered on-chain successfully.'
    });

  } catch (error: any) {
    console.error('Error archiving contract:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Archival failed',
      details: error.message
    });
  }
});


app.post('/compile-contract', async (req: express.Request, res: express.Response): Promise<any> => {
  const { senderAddress, moduleName, sourceCode } = req.body;

  if (!senderAddress || !moduleName || !sourceCode) {
    return res.status(400).json({ 
      error: 'senderAddress, moduleName, and sourceCode are required' 
    });
  }

  const tempDir = path.join(TEMP_DIR, uuidv4());
  const sourcesDir = path.join(tempDir, 'sources');
  const buildDir = path.join(tempDir, 'build');

  try {
    await mkdir(sourcesDir, { recursive: true });

    const moveTomlContent = `
[package]
name = "${moduleName}"
version = "1.0.0"
authors = []

[addresses]
sender = "${senderAddress}"

[dependencies.AptosFramework]
git = "https://github.com/aptos-labs/aptos-framework.git"
rev = "mainnet"
subdir = "aptos-framework"
    `.trim();
    const moveFilePath = path.join(sourcesDir, `${moduleName}.move`);
    
    await Promise.all([
      writeFile(path.join(tempDir, 'Move.toml'), moveTomlContent),
      writeFile(moveFilePath, sourceCode)
    ]);
    const { stdout, stderr } = await execAsync(
      `cd ${tempDir} && aptos move compile --save-metadata --named-addresses sender=${senderAddress}`,
      { maxBuffer: 1024 * 1024 * 10 }
    );
    const bytecodePath = path.join(tempDir, `build/${moduleName}/bytecode_modules/${moduleName}.mv`);
    const abiPath = path.join(tempDir, `build/${moduleName}/abi/${moduleName}.abi`);
    
    let bytecode = null;
    let abi = null;

    try {
      bytecode = (await fs.promises.readFile(bytecodePath)).toString('base64');
    } catch (e) {
      console.warn('Bytecode file not found');
    }

    try {
      abi = JSON.parse((await fs.promises.readFile(abiPath)).toString());
    } catch (e) {
      console.warn('ABI file not found or invalid');
    }

    res.json({
      success: true,
      moduleName,
      senderAddress,
      bytecode,
      abi,
      compilationOutput: stdout.trim(),
      warnings: stderr.trim()
    });

  } catch (error: any) {
    console.error('Compilation error:', error);
    res.status(500).json({
      success: false,
      error: 'Compilation failed',
      details: error.message,
      compilationOutput: error.stdout?.trim(),
      errors: error.stderr?.trim()
    });
  } finally {
    try {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError);
    }
  }
});

app.get('/ipfs/:cid', async (req: express.Request, res: express.Response) => {
  const { cid } = req.params;

  try {
    const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`);
    res.json({ data: response.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch IPFS content' });
  }
});

app.get('/archived-contracts/:address', async (req: express.Request, res: express.Response): Promise<any> => {
  const { address } = req.params;

  try {
    const client = new AptosClient(APTOS_NODE_URL);

    const resourceType = `${process.env.APTOS_ACCOUNT_ADDRESS}::registry::ArchiveRegistry`;
    const response = await client.getAccountResource(address, resourceType);

    const archivedContracts = response.data.entries.map((entry: any) => ({
      ipfs_cid: entry.ipfs_cid,
      module_name: entry.module_name,
      archived_at: new Date(parseInt(entry.archived_at) * 1000).toISOString()
    }));

    return res.json({ address, contracts: archivedContracts });

  } catch (error: any) {
    console.error('Error fetching archived contracts:', error.message);

    // Handle case when resource does not exist (registry not initialized yet)
    if (error.response?.status === 404) {
      return res.json({ address, contracts: [] });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch archived contracts',
      details: error.message
    });
  }
});

app.post('/register', async (req: Request, res: Response) :Promise<any> => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING *",
      [email, username, hashedPassword]
    );

    res.status(201).json({ message: "User registered successfully", user: result.rows[0] });
  } catch (err: any) {
    console.error("Database Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req: Request, res: Response) :Promise<any> => {
  try {
    const { email, password } = req.body;
    const user = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (user.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = generateToken(email);
    res.json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

