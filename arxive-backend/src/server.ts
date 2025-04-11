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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

