# ![arxive-logo](../arxive-chrome-extension/public/icons/icon16.png) Aptos MOVE Development Backend Servers

## System Architecture

The backend consists of three specialized servers:

1. **MOVE Language Assistant Server** (`server.ts`) - Provides AI-powered code assistance, compilation, and analysis for MOVE language
2. **Aptos Blockchain Interface** (`src/server.ts`) - Handles wallet connections, contract retrieval, and compilation for deployment
3. **IPFS Storage Server** (`arxive-ifps-server/src/server.ts`) - Manages document and file storage using IPFS


### Environment Configuration

Create a `.env` file in the root directory with the following variables:

```
# MOVE Language Assistant Server
GEMINI_API_KEY1 = your_first_api_key
GEMINI_API_KEY2 = your_second_api_key  # Optional
GEMINI_API_KEY3 = your_third_api_key   # Optional
APTOS_NETWORK = DEVNET  # Options: MAINNET, TESTNET, DEVNET
DEBUG = true  # Optional for additional debug logs
PORT = 3001   # Port for MOVE Language Assistant Server

# Aptos Blockchain Interface
APTOS_NODE_URL = https://fullnode.devnet.aptoslabs.com  # URL for Aptos node
PORT = 3002  # Port for Aptos Blockchain Interface

# IPFS Storage Server
PORT = 3003  # Port for IPFS Storage Server
```


## 1. MOVE Language Assistant Server

### Description

This server provides AI-powered assistance for MOVE smart contract development using Google's Gemini AI models. It offers code completion, assistance, explanations, compilation, error fixing, and gas estimation.

### API Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/health` | GET | Server health check | None | `{"status": "ok", "message": "Server is running"}` |
| `/api/code/complete` | POST | Complete code at cursor position | `{"code": "module MyModule { ... }", "cursor": {"line": 10, "column": 15}, "request": "Complete this function"}` | `{"code": "public fun transfer(...)", "insertPosition": {"line": 10, "column": 15}, "replacementLength": 0}` |
| `/api/code/assist` | POST | Get assistance for code changes | `{"code": "module MyModule { ... }", "request": "Add a function to transfer resources"}` | `{"code": "public fun transfer(...)", "description": "Function to transfer tokens...", "changeType": "ADDITION", "placement": {"startLine": 15, "endLine": 25}, "imports": ["std::signer", "std::vector"]}` |
| `/api/code/explain` | POST | Get detailed code explanation | `{"code": "module MyModule { ... }"}` | Complex JSON response with summary, functionality, concepts, security aspects, suggestions, and function details |
| `/api/code/compile` | POST | Compile MOVE code and estimate gas | `{"code": "module MyModule { ... }"}` | On success: `{"success": true, "compilationSuccess": true, "gasEstimate": 50000, ...}` On failure: `{"success": false, "errors": [...], "errorDetails": [...]}` |
| `/api/code/function-gas` | POST | Estimate gas for specific function | `{"code": "module MyModule { ... }", "functionName": "transfer", "args": ["&signer", "100"]}` | `{"success": true, "functionName": "transfer", "gasEstimate": 5000, "estimatedCostApt": "0.00005000", ...}` |
| `/api/code/fix` | POST | Auto-fix code compilation errors | `{"code": "module MyModule { ... }", "errors": "Compilation error messages..."}` | `{"fixedCode": "module MyModule { ... fixed code ... }", "explanation": "Fixed invalid function signature..."}` |

#### Response Example for `/api/code/explain`
```json
{
  "summary": "Module for handling token transfers with access control",
  "functionality": "Detailed explanation of module functionality...",
  "concepts": [
    {
      "name": "Resource Management",
      "explanation": "This code uses Move's resource system to..."
    }
  ],
  "security": [
    {
      "aspect": "Access Control",
      "analysis": "The module implements access control through..."
    }
  ],
  "suggestions": [
    {
      "description": "Consider adding error handling for insufficient balance",
      "code": "if (balance < amount) { abort(INSUFFICIENT_BALANCE) }"
    }
  ],
  "functions": [
    {
      "name": "transfer",
      "purpose": "Transfers tokens between accounts",
      "parameters": "sender: &signer, recipient: address, amount: u64",
      "returns": "None"
    }
  ]
}
```

### Technical Features

- AI-powered code completion with cursor position awareness
- Intelligent code assistance with context-aware suggestions
- Detailed code explanations with concepts, security, and suggestions
- Automatic compilation with gas estimation
- Error fixing with AI-generated suggestions
- Gas estimation for entire modules and specific functions
- Support for all Aptos networks (Mainnet, Testnet, Devnet)
- Round-robin API key rotation for load balancing

## 2. Aptos Blockchain Interface

### Description

This server serves as the interface between the frontend application and the Aptos blockchain. It handles wallet connections, contract retrievals, and contract compilations for deployment.

### API Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/connect-to-wallet` | POST | Connect to wallet and get balance | `{"frontendWalletAddress": "0x1a2b3c4d5e..."}` | `{"address": "0x1a2b3c4d5e...", "balance": "100.50", "rawBalance": "10050000000"}` |
| `/get-contracts/:address` | GET | Get contracts for an address | Path parameter: `address` | `{"address": "0x1a2b3c4d5e...", "modules": [{"bytecode": "0x1a2b3c...", "abi": {...}}]}` |
| `/get-contract-details` | GET | Get detailed contract information | Query parameters: `accountAddress`, `moduleName` | `{"contractAddress": "0x1a2b3c::MyModule", "bytecode": "0x1a2b3c...", "abi": {...}, "source": "module MyModule { ... }", "metadata": {...}}` |
| `/compile-contract` | POST | Compile a contract | `{"senderAddress": "0x1a2b3c...", "moduleName": "MyModule", "sourceCode": "module MyModule { ... }"}` | `{"success": true, "moduleName": "MyModule", "senderAddress": "0x1a2b3c...", "bytecode": "base64_encoded_bytecode", "abi": {...}, "compilationOutput": "...", "warnings": "..."}` |

### Technical Features

- Wallet connection with balance retrieval
- Contract discovery and metadata retrieval
- Contract source code and ABI retrieval
- Contract compilation with automatic Move.toml generation
- Temporary directory management for secure compilations

## 3. IPFS Storage Server

### Description

This server provides IPFS-based document and file storage capabilities, allowing users to upload and retrieve documents using content-addressable storage.

### API Endpoints

| Endpoint | Method | Description | Request | Response |
|----------|--------|-------------|---------|----------|
| `/sendfile` | POST | Upload a file to IPFS | Form data with `file` field | `{"cid": "QmZ9mjJu..."}` |
| `/viewfile` | GET | Retrieve file content by CID | Query parameter: `cid` | File content as text/plain |

### Technical Features

- IPFS-based file storage
- Content-addressable retrieval
- Automatic cleanup of temporary files
- Binary and text file support
