
# ![arxive-logo](../../arxive-chrome-extension/public/icons/icon16.png) Aptos Blockchain Interface Server


## Features

- Connect to Aptos wallets and retrieve balance information
- Fetch contract modules for a given address
- Get detailed contract information including bytecode, ABI, and source code
- Compile MOVE contracts with automatic Move.toml generation
- Secure temporary file handling for contract compilation

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Install required packages if not included:
   ```bash
   npm install express cors axios dotenv uuid
   ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```
PORT=3001
APTOS_NODE_URL=https://fullnode.devnet.aptoslabs.com
```

Available Aptos node options:
- Mainnet: `https://fullnode.mainnet.aptoslabs.com`
- Testnet: `https://fullnode.testnet.aptoslabs.com`
- Devnet: `https://fullnode.devnet.aptoslabs.com`

## Starting the Server

```bash
npm start
```

The server will start and display: `Server running on http://localhost:3001` (or your configured port)

## API Endpoints

### Connect to Wallet

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/connect-to-wallet` | POST | Connect to an Aptos wallet and retrieve balance |

**Request:**
```json
{
  "frontendWalletAddress": "0x1a2b3c4d5e..."
}
```

**Response:**
```json
{
  "address": "0x1a2b3c4d5e...",
  "balance": "100.50",
  "rawBalance": "10050000000"
}
```

### Get Contracts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get-contracts/:address` | GET | Get all contracts deployed by an address |

**Request:**
Path parameter: `address` - The account address to query

**Response:**
```json
{
  "address": "0x1a2b3c4d5e...",
  "modules": [
    {
      "bytecode": "0x1a2b3c...",
      "abi": { ... }
    }
  ]
}
```

### Get Contract Details

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/get-contract-details` | GET | Get detailed information about a specific contract |

**Request:**
Query parameters:
- `accountAddress` - The address of the contract deployer
- `moduleName` - The name of the contract module

**Response:**
```json
{
  "contractAddress": "0x1a2b3c::MyModule",
  "bytecode": "0x1a2b3c...",
  "abi": { ... },
  "source": "module MyModule { ... }",
  "metadata": {
    "accountAddress": "0x1a2b3c...",
    "moduleName": "MyModule",
    "chainId": "1",
    "timestamp": "123456789"
  }
}
```

### Compile Contract

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/compile-contract` | POST | Compile a MOVE contract |

**Request:**
```json
{
  "senderAddress": "0x1a2b3c...",
  "moduleName": "MyModule",
  "sourceCode": "module MyModule { ... }"
}
```

**Response:**
```json
{
  "success": true,
  "moduleName": "MyModule",
  "senderAddress": "0x1a2b3c...",
  "bytecode": "base64_encoded_bytecode",
  "abi": { ... },
  "compilationOutput": "Compilation output...",
  "warnings": "Any warnings..."
}
```

## How It Works

### Contract Compilation Process

1. The server creates a temporary directory structure:
   ```
   temp/
   ├── [uuid]/
   │   ├── sources/
   │   │   └── ModuleName.move
   │   └── Move.toml
   ```

2. It writes the Move.toml file with proper dependencies and address mappings
3. It writes the source code to the appropriate file
4. It executes the Aptos CLI to compile the contract
5. It reads the resulting bytecode and ABI files
6. It returns the compilation results and cleans up temporary files

## Error Handling

The server includes error handling for:
- Missing parameters in requests
- Failed API calls to Aptos node
- Contract compilation errors
- File system operations

## Security Considerations

- Temporary directories are automatically cleaned up after use
- Each compilation uses a UUID to prevent conflicts
- File paths are properly joined to prevent directory traversal
- External process execution is limited to compilation

## Usage Examples

### Connecting to a Wallet

```javascript
// Frontend example with fetch
const response = await fetch('http://localhost:3001/connect-to-wallet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ frontendWalletAddress: '0x1a2b3c...' })
});
const data = await response.json();
console.log(`Balance: ${data.balance} APT`);
```

### Compiling a Contract

```javascript
// Frontend example with fetch
const response = await fetch('http://localhost:3001/compile-contract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    senderAddress: '0x1a2b3c...',
    moduleName: 'MyToken',
    sourceCode: `
      module sender::MyToken {
        // Contract code here
      }
    `
  })
});
const result = await response.json();
if (result.success) {
  console.log('Compilation successful!');
}
```
