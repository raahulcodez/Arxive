import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const APTOS_NODE_URL = process.env.APTOS_NODE_URL as string;

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

