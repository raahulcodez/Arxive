
# ![Arxive-logo](../../arxive-chrome-extension/public/icons/icon16.png) IPFS File Storage Server

## Features

- Upload files to IPFS with automatic pinning
- Retrieve file contents by CID
- Automatic cleanup of temporary files
- Simple REST API interface


## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Make sure you have the required dependencies:
   ```bash
   npm install express multer ipfs-http-client
   ```

## Configuration

By default, the server:
- Runs on port 3000
- Connects to a local IPFS node at `http://localhost:5001/api/v0`
- Stores temporary uploads in a `uploads/` directory

To modify these settings, edit the constants at the top of the file:

```javascript
const port = 3000; // Change port number
const ipfs = create({ url: 'http://localhost:5001/api/v0' }); // Change IPFS node URL
```

## Starting the IPFS Daemon

Before running the server, make sure you have an IPFS daemon running:

```bash
# Install IPFS if you haven't already
# Then start the daemon
ipfs daemon
```

## Starting the Server

```bash
node server.js
```

The server will start and display: `Server running at http://localhost:3000`

## API Endpoints

### Upload a File

**Endpoint:** `POST /sendfile`

**Request:** 
- Content-Type: `multipart/form-data`
- Body: Form data with a field named `file` containing the file to upload

**Response:**
- Success (200): JSON object with the file's CID
  ```json
  {
    "cid": "QmZ9mjJu..."
  }
  ```
- Error (400): "No file uploaded."
- Error (500): "Error uploading file."

**Example using curl:**
```bash
curl -X POST -F "file=@/path/to/your/file.txt" http://localhost:3000/sendfile
```

### Retrieve a File

**Endpoint:** `GET /viewfile?cid=<CID>`

**Request:**
- Query parameter: `cid` - The Content Identifier of the file to retrieve

**Response:**
- Success (200): The file content as text/plain
- Error (400): "CID is required."
- Error (500): "Unable to fetch file content."

**Example using curl:**
```bash
curl "http://localhost:3000/viewfile?cid=QmZ9mjJu..."
```

**Example using browser:**
Simply navigate to `http://localhost:3000/viewfile?cid=QmZ9mjJu...`

## How It Works

1. **File Upload Process:**
   - The file is temporarily stored in the `uploads/` directory
   - The file is read into memory
   - The file is added to IPFS and pinned (ensuring persistence)
   - The temporary file is deleted
   - The CID is returned to the client

2. **File Retrieval Process:**
   - The CID is extracted from the query parameters
   - The file content is streamed from IPFS
   - The content is converted to a UTF-8 string (assuming text files)
   - The content is sent to the client


