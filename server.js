const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const https = require('https');
const cloudinary = require('cloudinary').v2;
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

console.log('__dirname:', __dirname);

dotenv.config();

// Pre-written messages database (fallback when APIs are rate limited)
const prewriteDB = {
  en: {
    birthday: {
      happy: [
        "Happy Birthday {name}! May your special day be filled with joy, laughter, and wonderful memories!",
        "Wishing you a fantastic birthday {name}! Here's to another year of amazing adventures!",
        "Happy Birthday {name}! May all your dreams come true and your year be filled with happiness!"
      ],
      romantic: [
        "Happy Birthday my love {name}! Every moment with you is a treasure, and today we celebrate you!",
        "To my dear {name}, on your birthday, I want you to know how much you mean to me. Happy Birthday!",
        "Happy Birthday {name}! You make every day brighter just by being in my life!"
      ],
      emotional: [
        "Happy Birthday {name}. Today we celebrate not just your birth, but the incredible person you've become.",
        "Another year older, another year wiser. Happy Birthday {name}, you're truly special!",
        "Happy Birthday {name}. May this year bring you all the peace and happiness you deserve!"
      ]
    },
    anniversary: {
      romantic: [
        "Happy Anniversary {name}! Every moment with you has been a blessing, and I look forward to many more!",
        "To my amazing {name}, happy anniversary! Thank you for making every day special!",
        "Happy Anniversary {name}! Our love story is my favorite tale, and I can't wait for more chapters!"
      ]
    },
    festival: {
      happy: [
        "Happy {festival} {name}! May this festival bring you joy, prosperity, and happiness!",
        "Wishing you a wonderful {festival} {name}! May all your celebrations be merry and bright!",
        "Happy {festival} {name}! May this special time bring you closer to your loved ones!"
      ]
    }
  },
  hi: {
    birthday: {
      happy: [
        "जन्मदिन मुबारक हो {name}! आपका विशेष दिन खुशी, हंसी और अद्भुत यादों से भरा हो!",
        "आपको एक शानदार जन्मदिन {name}! एक और साल की अद्भुत यात्राओं की शुभकामनाएं!",
        "जन्मदिन मुबारक हो {name}! आपके सभी सपने सच हों और आपका साल खुशी से भरा हो!"
      ]
    }
  }
};

// Helper function to get pre-written messages
function getPreWrittenMessages(event, mood, name, relation, age, festival) {
  const db = prewriteDB['en']; // Default to English
  if (!db || !db[event] || !db[event][mood]) return [];
  
  const messages = db[event][mood];
  return messages.map(msg => 
    msg.replace(/{name}/g, name || 'someone')
       .replace(/{relation}/g, relation || 'friend')
       .replace(/{age}/g, age || '')
       .replace(/{festival}/g, festival || 'celebration')
  );
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "res.cloudinary.com", "*.cloudinary.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "api.groq.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Stricter rate limiting for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 uploads per hour
  message: 'Too many upload attempts, please try again later.'
});

app.use(cors({
  origin: ['https://thegreeterindia.web.app', 'https://thegreeterindia.firebaseapp.com', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' })); // Reduced from 100mb for security

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
// Secure multer configuration with file validation
const fileFilter = (req, file, cb) => {
  // Only allow HTML files
  if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {
    cb(null, true);
  } else {
    cb(new Error('Only HTML files are allowed'), false);
  }
};

const upload = multer({ 
  dest: uploadsDir,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Only 1 file at a time
  }
});

// Favicon — suppress 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Save shared config + HTML with input validation
app.post('/api/config', async (req, res) => {
    try {
        const { html, config, userData } = req.body;
        
        // Input validation
        if (!html || typeof html !== 'string') {
            return res.status(400).json({ error: 'Valid HTML content is required' });
        }
        
        if (html.length > 10 * 1024 * 1024) { // 10MB limit
            return res.status(400).json({ error: 'HTML content too large' });
        }
        
        // Sanitize HTML content (basic XSS prevention)
        const sanitizedHtml = html
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        
        const id = Math.random().toString(36).substring(2, 12);
        const data = JSON.stringify({ html: sanitizedHtml, config, userData });
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

// Retrieve shared config + HTML with enhanced validation
app.get('/api/config/:id', async (req, res) => {
    try {
        // Validate ID parameter
        const id = req.params.id;
        if (!id || typeof id !== 'string' || id.length > 50) {
            return res.status(400).json({ error: 'Invalid configuration ID' });
        }
        
        const safeName = id.replace(/[^a-zA-Z0-9]/g, '');
        if (safeName.length < 3) {
            return res.status(400).json({ error: 'Invalid configuration ID format' });
        }
        
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

// Helper function to call Groq API with failover
async function callGroqWithFailover(prompt) {
    const apis = [
        { key: process.env.GROQ_API_KEY, name: "Primary" },
        { key: process.env.GROQ_API_KEY_BACKUP, name: "Backup" }
    ].filter(api => api.key); // Filter out null/undefined keys

    const model = "llama-3.1-8b-instant";
    const url = "https://api.groq.com/openai/v1/chat/completions";
    let lastError = null;

    for (const api of apis) {
        try {
            console.log(`Trying ${api.name} API...`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${api.key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.9,
                    max_tokens: 800
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`${api.name} API successful`);
                return { success: true, data, source: api.name };
            } else {
                const err = await response.json().catch(() => ({}));
                console.error(`${api.name} API Error:`, err);
                lastError = err.error?.message || `HTTP ${response.status}`;
                
                // Check if it's a rate limit error
                if (response.status === 429 || (err.error && (err.error.includes('rate limit') || err.error.includes('limit')))) {
                    console.log(`${api.name} API rate limit reached, trying next...`);
                    continue; // Try next API
                } else {
                    // Non-rate-limit error, return immediately
                    return { success: false, error: lastError, source: api.name };
                }
            }
        } catch (error) {
            console.error(`${api.name} API Exception:`, error);
            lastError = error.message;
            continue; // Try next API
        }
    }

    // All APIs exhausted or failed
    return { success: false, error: lastError || "All APIs exhausted", source: "None", rateLimited: true };
}

// API Endpoint to proxy requests to Groq API with failover and validation
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        // Input validation
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Valid prompt is required' });
        }
        
        if (prompt.length > 10000) {
            return res.status(400).json({ error: 'Prompt too long (max 10000 characters)' });
        }
        
        // Basic content filtering
        const forbiddenWords = ['password', 'secret', 'token', 'api_key', 'private'];
        const hasForbiddenWords = forbiddenWords.some(word => 
            prompt.toLowerCase().includes(word)
        );
        
        if (hasForbiddenWords) {
            return res.status(400).json({ error: 'Prompt contains inappropriate content' });
        }

        // Check if we have any API keys configured
        if (!process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY_BACKUP) {
            console.error("No Groq API keys configured in environment variables.");
            return res.status(500).json({ error: "Server configuration error" });
        }

        // Try APIs with automatic failover
        const result = await callGroqWithFailover(prompt);
        
        if (result.success) {
            // API call successful - return the response
            return res.json(result.data);
        } else {
            // All APIs failed - check if it's due to rate limits
            console.log("All APIs failed, checking if we should use prewritten fallback...");
            
            // Only use prewritten database if BOTH APIs are rate limited
            if (result.rateLimited) {
                console.log("Both APIs rate limited, using prewritten database as fallback");
                
                // Extract parameters from prompt to get appropriate prewritten messages
                try {
                    // Parse the prompt to extract name, event, mood, relation
                    const nameMatch = prompt.match(/for ([^)]+)/);
                    const eventMatch = prompt.match(/celebrating ([^.]+)/);
                    const moodMatch = prompt.match(/Mood: ([^.]+)/);
                    
                    const name = nameMatch ? nameMatch[1].trim() : 'someone';
                    const event = eventMatch ? eventMatch[1].trim() : 'birthday';
                    const mood = moodMatch ? moodMatch[1].trim() : 'happy';
                    
                    // Get prewritten messages
                    const preMessages = getPreWrittenMessages(event, mood, name, '', '', '');
                    
                    if (preMessages.length > 0) {
                        // Return a random prewritten message
                        const randomMessage = preMessages[Math.floor(Math.random() * preMessages.length)];
                        const mockApiResponse = {
                            choices: [{
                                message: {
                                    content: randomMessage
                                }
                            }]
                        };
                        
                        console.log("Successfully used prewritten database as fallback");
                        return res.json(mockApiResponse);
                    }
                } catch (parseError) {
                    console.error("Error parsing prompt for fallback:", parseError);
                }
            } else {
                // APIs failed for non-rate-limit reasons, return proper error
                console.log("APIs failed for non-rate-limit reasons, returning error to user");
                return res.status(500).json({ error: result.error || "Service temporarily unavailable" });
            }
        }
    } catch (error) {
        console.error("Error in API endpoint:", error);
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

// Upload custom template with enhanced security
app.post('/api/upload-template', uploadLimiter, upload.any(), (req, res) => {
    console.log('Upload request received', { body: req.body, files: req.files });
    try {
        const { category } = req.body;
        
        // Input validation
        if (!category || typeof category !== 'string') {
            return res.status(400).json({ error: 'Valid category is required' });
        }
        
        // Validate category against allowed values
        const allowedCategories = ['birthday', 'anniversary', 'festival', 'proposal'];
        if (!allowedCategories.includes(category.toLowerCase())) {
            return res.status(400).json({ error: 'Invalid category' });
        }
        
        if (!req.files || req.files.length === 0) {
            console.log('Missing category or file');
            return res.status(400).json({ error: 'Category and file required' });
        }
        
        const file = req.files[0];
        
        // Additional file validation
        if (!file.originalname.endsWith('.html')) {
            return res.status(400).json({ error: 'Only HTML files are allowed' });
        }
        
        // Read and validate file content
        const fileContent = fs.readFileSync(file.path, 'utf8');
        if (fileContent.length > 1024 * 1024) { // 1MB limit for HTML content
            fs.unlinkSync(file.path); // Clean up
            return res.status(400).json({ error: 'File too large' });
        }

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