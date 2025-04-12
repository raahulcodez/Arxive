import express from 'express';
import multer from 'multer';
import { create } from 'ipfs-http-client';
import fs from 'fs/promises';

const app = express();
const port = 3000;
const upload = multer({ dest: 'uploads/' });

const ipfs = create({ url: 'http://localhost:5001/api/v0' });

// POST /sendfile – Upload a file to IPFS
app.post('/sendfile', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).send('No file uploaded.');
      return;
    }

    const filePath = req.file.path;
    const fileBuffer = await fs.readFile(filePath);

    const { cid } = await ipfs.add(fileBuffer);
    await ipfs.pin.add(cid);

    await fs.unlink(filePath); // Clean up local temp file

    res.json({ cid: cid.toString() }); // ✅ No `return` here
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).send('Error uploading file.');
  }
});

// GET /viewfile?cid=<CID> – Fetch file contents via CID
app.get('/viewfile', async (req, res) => {
  const { cid } = req.query;
  if (!cid || typeof cid !== 'string') {
    res.status(400).send('CID is required.');
    return;
  }

  try {
    const stream = ipfs.cat(cid);
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const fileBuffer = Buffer.concat(chunks);
    const fileContent = fileBuffer.toString('utf-8');

    res.setHeader('Content-Type', 'text/plain');
    res.send(fileContent); // ✅ Again, no `return` needed
  } catch (err) {
    console.error('Fetch Error:', err);
    res.status(500).send('Unable to fetch file content.');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
