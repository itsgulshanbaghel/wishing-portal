const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const https = require('https');
const cloudinary = require('cloudinary').v2;

console.log('__dirname:', __dirname);

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Multer config for template uploads
const uploadsDir = path.join(__dirname, 'uploads');
console.log('uploadsDir:', uploadsDir);
console.log('exists:', fs.existsSync(uploadsDir));
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('created uploads dir');
}
const upload = multer({ dest: uploadsDir });

// Favicon — suppress 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Save shared config + HTML
app.post('/api/config', async (req, res) => {
    try {
        const { html, config, userData } = req.body;
        if (!html) return res.status(400).json({ error: 'HTML is required' });
        const id = Math.random().toString(36).substring(2, 12);
        const data = JSON.stringify({ html, config, userData });
        const dataUri = `data:application/json;base64,${Buffer.from(data).toString('base64')}`;
        const result = await cloudinary.uploader.upload(dataUri, {
            resource_type: 'raw',
            public_id: id,
            folder: 'configs'
        });
        res.json({ id });
    } catch (err) {
        console.error('Error saving config:', err);
        res.status(500).json({ error: 'Failed to save' });
    }
});

// Retrieve shared config + HTML
app.get('/api/config/:id', async (req, res) => {
    try {
        const safeName = req.params.id.replace(/[^a-z0-9]/gi, '');
        const url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/configs/${safeName}`;
        const response = await fetch(url);
        if (!response.ok) return res.status(404).json({ error: 'Not found' });
        const data = await response.text();
        try {
            const json = JSON.parse(data);
            res.json(json);
        } catch (err) {
            res.status(500).json({ error: 'Failed to parse' });
        }
    } catch (err) {
        console.error('Error reading config:', err);
        res.status(500).json({ error: 'Failed to read' });
    }
});

// API Endpoint to proxy requests to Gemini API
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not configured in environment variables.");
            return res.status(500).json({ error: "Server configuration error" });
        }

        const model = "gemma-3-27b-it";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.9, maxOutputTokens: 800 }
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error("Gemini API Error:", err);
            return res.status(response.status).json({ error: err.error?.message || `HTTP ${response.status}` });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/api/magic', (req, res) => {
    try {
        const features = fs.readFileSync(path.join(__dirname, 'features.js'), 'utf8');
        const encoded = Buffer.from(features).toString('base64');
        res.json({ magic: encoded });
    } catch (err) {
        console.error("Error reading features:", err);
        res.status(500).json({ error: "Magic not found" });
    }
});

// Upload custom template
app.post('/api/upload-template', upload.any(), (req, res) => {
    console.log('Upload request received', { body: req.body, files: req.files });
    try {
        const { category } = req.body;
        if (!category || !req.files || req.files.length === 0) {
            console.log('Missing category or file');
            return res.status(400).json({ error: 'Category and file required' });
        }
        const file = req.files[0];

        const templatesDir = path.join(__dirname, 'public', 'templates');
        console.log('templatesDir:', templatesDir);
        if (!fs.existsSync(templatesDir)) {
            fs.mkdirSync(templatesDir, { recursive: true });
        }

        const files = fs.readdirSync(templatesDir).filter(f => f.startsWith(category) && f.endsWith('.html'));
        console.log('files:', files);

        let maxNum = 0;
        files.forEach(f => {
            const match = f.match(new RegExp(`^${category}(\\d+)\\.html$`));
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNum) maxNum = num;
            }
        });
        console.log('maxNum:', maxNum);

        const newNum = maxNum + 1;
        const newName = `${category}${newNum}.html`;
        const newPath = path.join(templatesDir, newName);
        console.log('newNum:', newNum, 'newName:', newName, 'newPath:', newPath);
        console.log('Saving to', newPath, 'from', file.path);

        fs.renameSync(file.path, newPath);

        console.log('Upload successful');
        res.json({ success: true, filename: newName });
    } catch (err) {
        console.error('Error uploading template:', err);
        res.status(500).json({ error: 'Failed to upload' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});