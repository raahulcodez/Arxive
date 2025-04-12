# ![arxive-logo](../../arxive-chrome-extension/public/icons/icon16.png) MOVE Language Assistant Backend

Backend API server for MOVE language code assistance using Google's Gemini AI and Aptos integration.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file in the root directory with your Gemini API keys and Aptos configuration:
   ```
   GEMINI_API_KEY1 = your_first_api_key
   GEMINI_API_KEY2 = your_second_api_key
   GEMINI_API_KEY3 = your_third_api_key
   APTOS_NETWORK = DEVNET  # Options: MAINNET, TESTNET, DEVNET
   DEBUG = true  # Optional for additional debug logs
   PORT = 3001   # Optional to override default port
   ```

3. Install Aptos CLI:
   The server requires Aptos CLI for MOVE compilation and gas estimation.
   Installation instructions: https://aptos.dev/cli-tools/aptos-cli-tool/install-aptos-cli

4. Start the server:
   ```
   npm start
   ```
   
   For development with auto-restart:
   ```
   npm run dev
   ```

## API Endpoints

### Health Check

`GET /health`

Response format:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### Code Completion

`POST /api/code/complete`

Request body:
```json
{
  "code": "module MyModule { ... }",
  "cursor": { "line": 10, "column": 15 },
  "request": "Complete this function"
}
```

Response format:
```json
{
  "code": "public fun transfer(account: &signer, amount: u64) { ... }",
  "insertPosition": {
    "line": 10,
    "column": 15
  },
  "replacementLength": 0
}
```

### Code Assistance

`POST /api/code/assist`

Request body:
```json
{
  "code": "module MyModule { ... }",
  "request": "Add a function to transfer resources"
}
```

Response format:
```json
{
  "code": "public fun transfer(account: &signer, amount: u64) { ... }",
  "description": "Function to transfer tokens between accounts",
  "changeType": "ADDITION",
  "placement": {
    "startLine": 15,
    "endLine": 25
  },
  "imports": ["std::signer", "std::vector"]
}
```

### Code Explanation

`POST /api/code/explain`

Request body:
```json
{
  "code": "module MyModule { ... }"
}
```

Response format:
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

### Code Compilation

`POST /api/code/compile`

Request body:
```json
{
  "code": "module MyModule { ... }"
}
```

Successful response format:
```json
{
  "success": true,
  "compilationSuccess": true,
  "gasEstimationSuccess": true,
  "gasEstimate": 50000,
  "estimatedCostApt": "0.00050000",
  "gasBreakdown": {
    "computationCost": 35000,
    "storageCost": 10000,
    "storageFee": 5000
  },
  "estimationMethod": "simulation",
  "compilerOutput": "Compilation successful output..."
}
```

Error response format:
```json
{
  "success": false,
  "compilationSuccess": false,
  "gasEstimationSuccess": false,
  "errors": ["Compilation error message"],
  "errorDetails": [
    {
      "message": "Type mismatch error",
      "location": {
        "line": 10,
        "column": 15
      },
      "code": "function code snippet"
    }
  ],
  "rawError": "Raw compiler error output"
}
```

### Function Gas Estimation

`POST /api/code/function-gas`

Request body:
```json
{
  "code": "module MyModule { ... }",
  "functionName": "transfer",
  "args": ["&signer", "100"]
}
```

Response format:
```json
{
  "success": true,
  "functionName": "transfer",
  "gasEstimate": 5000,
  "estimatedCostApt": "0.00005000",
  "gasBreakdown": {
    "computationCost": 4000,
    "storageCost": 750,
    "storageFee": 250
  },
  "output": "Gas estimation output..."
}
```

### Code Fix

`POST /api/code/fix`

Request body:
```json
{
  "code": "module MyModule { ... }",
  "errors": "Compilation error messages..."
}
```

Response format:
```json
{
  "fixedCode": "module MyModule { ... fixed code ... }",
  "explanation": "Fixed invalid function signature and missing resource ability"
}
```



## Technical Details

### Compilation Process

The server creates a temporary Move project structure including:
- `Move.toml` file with appropriate dependencies and address mappings
- Source files organized in a standard Move project layout
- Automatic named address detection and mapping

### Gas Estimation

Gas estimation is performed using multiple methods with fallbacks:
1. SDK-based transaction simulation (most accurate)
2. CLI-based gas estimation (fallback)
3. Fixed estimates when both methods fail

### Error Handling

Compilation errors are parsed and structured to provide:
- Error messages with code context
- Line and column information
- Suggested fixes when possible

### Security

- Temporary files are automatically cleaned up after use
- Command execution is handled with timeouts to prevent hanging
- Error messages are sanitized before being returned to the client

## Features

- Round-robin API key rotation to handle rate limiting
- MOVE language-specific prompt tuning for Aptos blockchain
- JSON-structured responses for easy frontend integration
- Code completion with precise insert position data
- Code assistance with change type and placement info
- Detailed code explanations with structured analysis
- Automatic MOVE code compilation using Aptos CLI
- Gas estimation for entire modules and specific functions
- Automatic error parsing with line and column information
- AI-powered code error fixing
- Support for all Aptos networks (Mainnet, Testnet, Devnet)
- Temporary MOVE project creation for compilation and testing
- Enhanced error handling and logging