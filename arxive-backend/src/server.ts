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

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const execAsync = promisify(exec);

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const APTOS_NODE_URL = process.env.APTOS_NODE_URL as string;
const TEMP_DIR = path.join(__dirname, 'temp');

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

