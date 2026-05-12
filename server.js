const express = require('express');

const cors = require('cors');

const dotenv = require('dotenv');

const path = require('path');

const fs = require('fs');

const multer = require('multer');

const https = require('https');

const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const { Website } = require('./models');
const analytics = require('./analytics');



console.log('__dirname:', __dirname);



dotenv.config();



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB Connection with fallback
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gulshanbaghel:greetly06@thegreeter.eu9o9le.mongodb.net/?appName=TheGreeter';
let mongoConnected = false;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('[Server] Connected to MongoDB Atlas');
    mongoConnected = true;
  })
  .catch(err => {
    console.error('[Server] MongoDB connection error:', err);
    console.log('[Server] Running in fallback mode - analytics will be limited');
    mongoConnected = false;
  });



const app = express();

const PORT = process.env.PORT || 3000;



// CORS configuration
const corsOptions = {
  origin: [
    'https://thegreeterindia.web.app',
    'https://thegreeterindia.firebaseapp.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};
app.use(cors(corsOptions));



// Rate limiting

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, 
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check / Keep-alive route
app.get('/ping', (req, res) => res.send('pong'));



app.use(express.json({ limit: '10mb' })); // Reduced from 100mb to 10mb



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

const upload = multer({

  dest: uploadsDir,

  limits: {

    fileSize: 5 * 1024 * 1024, // 5MB limit

    files: 1 // Only 1 file at a time

  },

  fileFilter: (req, file, cb) => {

    // Only allow HTML files for template uploads

    if (file.mimetype === 'text/html' || file.originalname.endsWith('.html')) {

      cb(null, true);

    } else {

      cb(new Error('Only HTML files are allowed'), false);

    }

  }

});



// Favicon — suppress 404

app.get('/favicon.ico', (req, res) => res.status(204).end());



// Save shared config + HTML
app.post('/api/config', async (req, res) => {
  try {
    const { html, config } = req.body;
    if (!html) return res.status(400).json({ error: 'HTML is required' });
    const id = Math.random().toString(36).substring(2, 12);

    // Extract metadata for analytics
    const metadata = {
      id,
      eventType: config?.eventType || config?.category || 'unknown',
      templateName: config?.templateName || config?.template || 'unknown',
      recipientName: config?.recipientName || config?.name || config?.userName || 'Unknown',
      features: config?.activeFeatures?.map(f => f[0]) || []
    };

    const data = JSON.stringify({ html, config, metadata });
    const dataUri = `data:application/json;base64,${Buffer.from(data).toString('base64')}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      resource_type: 'raw',
      public_id: id,
      folder: 'configs',
      context: {
        event_type: metadata.eventType,
        recipient: metadata.recipientName,
        template: metadata.templateName,
        created: new Date().toISOString()
      }
    });

    // Register website in analytics
    console.log('[Server] Registering website:', metadata.id, metadata.recipientName);
    try {
      await analytics.registerWebsite(req, metadata);
      analytics.trackEvent(req, { type: 'website_created', details: { id, eventType: metadata.eventType } });
      console.log('[Server] Website registered successfully');
    } catch (e) {
      console.error('[Server] Analytics registration failed:', e);
    }

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



// AI Generation Endpoint

app.post('/api/generate', async (req, res) => {

  try {

    const { prompt } = req.body;



    if (!prompt) {

      return res.status(400).json({ error: "Prompt is required" });

    }



    // Input validation

    if (typeof prompt !== 'string' || prompt.length > 2000) {

      return res.status(400).json({ error: "Invalid prompt format or length" });

    }



    const groqApiKeys = [

      process.env.GROQ_API_KEY_1,

      process.env.GROQ_API_KEY_2

    ].filter(key => key); // Filter out undefined keys



    if (groqApiKeys.length === 0) {

      console.error("No Groq API keys configured in environment variables.");

      return res.status(500).json({ error: "Server configuration error" });

    }



    let lastError;

    for (let i = 0; i < groqApiKeys.length; i++) {

      const apiKey = groqApiKeys[i];

      try {

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {

          method: 'POST',

          headers: {

            'Authorization': `Bearer ${apiKey}`,

            'Content-Type': 'application/json'

          },

          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        if (!response.ok) {

          const err = await response.json().catch(() => ({}));

          console.error('Groq API Error:', err);

          throw new Error(err.error?.message || err.message || `HTTP ${response.status}`);

        }

        const data = await response.json();

        console.log('Groq API Success:', data);

        if (data.choices?.[0]?.message?.content) {
          return res.json(data);
        }
        throw new Error("Unexpected API response");

      } catch (error) {

        lastError = error;

        console.error(`API key ${i + 1} failed:`, error.message);

        // Continue to next key if this one fails

      }

    }



    // If all keys failed

    throw lastError || new Error("All API keys failed");

  } catch (error) {

    console.error("Error in AI generation:", error);

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

// ══════════════════════════════════════════════════════════════
// ANALYTICS API ENDPOINTS (silent collection)
// ══════════════════════════════════════════════════════════════

const analyticsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5000, // Scaled for 1000 users/min
  message: { error: 'Rate limited' },
  standardHeaders: false,
  legacyHeaders: false,
});

app.post('/api/analytics/pageview', analyticsLimiter, async (req, res) => {
  try {
    console.log('[Analytics] Page view tracked:', req.body.page || 'unknown');
    await analytics.trackPageView(req, req.body.page || 'unknown');
    res.status(204).end();
  } catch (e) { 
    console.error('[Analytics] Page view tracking error:', e);
    res.status(204).end(); 
  }
});

app.post('/api/analytics/session', analyticsLimiter, async (req, res) => {
  try {
    console.log('[Analytics] Session tracked:', req.body.entryPage);
    await analytics.trackSession(req, req.body);
    res.status(204).end();
  } catch (e) { 
    console.error('[Analytics] Session tracking error:', e);
    res.status(204).end(); 
  }
});

app.post('/api/analytics/event', analyticsLimiter, async (req, res) => {
  try {
    console.log('[Analytics] Event tracked:', req.body.type, req.body.details);
    await analytics.trackEvent(req, req.body);
    res.status(204).end();
  } catch (e) { 
    console.error('[Analytics] Event tracking error:', e);
    res.status(204).end(); 
  }
});

app.post('/api/analytics/feature', analyticsLimiter, async (req, res) => {
  try {
    console.log('[Analytics] Feature tracked:', req.body.feature, req.body.action);
    await analytics.trackFeatureUsage(req, req.body);
    res.status(204).end();
  } catch (e) { 
    console.error('[Analytics] Feature tracking error:', e);
    res.status(204).end(); 
  }
});

app.post('/api/analytics/exit', analyticsLimiter, async (req, res) => {
  try {
    console.log('[Analytics] Exit tracked:', req.body.timeSpent);
    await analytics.trackExit(req, req.body);
    res.status(204).end();
  } catch (e) { 
    console.error('[Analytics] Exit tracking error:', e);
    res.status(204).end(); 
  }
});

app.post('/api/analytics/website-view', analyticsLimiter, async (req, res) => {
  try {
    console.log('[Analytics] Website view tracked:', req.body.websiteId);
    await analytics.trackWebsiteView(req, req.body.websiteId);
    await analytics.trackPageView(req, 'shared_website');
    res.status(204).end();
  } catch (e) { 
    console.error('[Analytics] Website view tracking error:', e);
    res.status(204).end(); 
  }
});

// ══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD API (protected with hardcoded credentials)
// ══════════════════════════════════════════════════════════════

const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'Greeter@2026#Secure';

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString();
  const [user, pass] = credentials.split(':');
  if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
    return next();
  }
  return res.status(401).json({ error: 'Invalid credentials' });
}

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    return res.json({ success: true, token });
  }
  return res.status(401).json({ error: 'Invalid credentials' });
});

app.post('/api/admin/sync-websites', adminAuth, async (req, res) => {
  console.log('[Server] POST /api/admin/sync-websites reached');
  
  try {
    // Check MongoDB connection state more reliably
    const dbState = mongoose.connection.readyState;
    console.log('[Admin] MongoDB connection state:', dbState);
    
    if (dbState !== 1) { // 1 = connected
      console.log('[Admin] MongoDB not connected (state:', dbState, '), returning fallback response');
      return res.json({ success: true, synced: 0, message: 'MongoDB not connected - sync skipped', fallbackMode: true });
    }
    
    console.log('[Admin] Starting website sync from Cloudinary...');
    const resources = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'raw',
      prefix: 'configs/',
      max_results: 500,
      context: true
    });
    let syncedCount = 0;

    for (const resource of resources.resources) {
      const id = resource.public_id.replace('configs/', '');
      
      try {
        const existing = await Website.findOne({ id });

        // Only skip if it exists AND has valid metadata
        if (existing && existing.eventType !== 'unknown') continue;

        console.log(`[Admin] Syncing/Updating website: ${id}`);

        // ... (metadata logic remains same) ...
        const ctx = resource.context?.custom || {};
        const ctxEventType = ctx.event_type || ctx.category;
        const ctxRecipient = ctx.recipient || ctx.recipientName;

        let metadata = {
          id,
          eventType: ctxEventType || 'unknown',
          recipientName: ctxRecipient || 'Imported',
          createdAt: resource.created_at
        };

        if (metadata.eventType === 'unknown' || metadata.recipientName === 'Imported') {
          const configRes = await fetch(resource.secure_url);
          if (configRes.ok) {
            const fullData = await configRes.json();
            const config = fullData.config || {};
            const meta = fullData.metadata || {};
            metadata.eventType = meta.eventType || config.eventType || config.category || metadata.eventType;
            
            if (metadata.eventType === 'unknown' && config.customData) {
              const allText = JSON.stringify(config.customData).toLowerCase();
              if (allText.includes('birth')) metadata.eventType = 'Birthday';
              else if (allText.includes('anniv')) metadata.eventType = 'Anniversary';
              else if (allText.includes('wedd') || allText.includes('marri') || allText.includes('coupl')) metadata.eventType = 'Wedding';
              else if (allText.includes('love') || allText.includes('valen') || allText.includes('sweet')) metadata.eventType = 'Love';
              else if (allText.includes('congrat')) metadata.eventType = 'Congratulations';
            }
            metadata.recipientName = meta.recipientName || config.recipientName || config.name || config.userName || metadata.recipientName;
            metadata.templateName = meta.templateName || config.templateName || config.template;
          }
        }

        if (existing) {
          await Website.updateOne({ id }, { $set: metadata });
        } else {
          await analytics.registerWebsite({ headers: {}, socket: {} }, metadata);
        }
        syncedCount++;
      } catch (err) {
        console.warn(`[Admin] Sync failed for ${id}:`, err.message);
      }
    }
    res.json({ success: true, synced: syncedCount, message: `Successfully synced ${syncedCount} websites` });
  } catch (err) {
    console.error('Sync failed:', err);
    // Check if it's a MongoDB connection error
    if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError' || err.message.includes('ECONNREFUSED')) {
      res.json({ success: true, synced: 0, message: 'MongoDB connection failed - sync skipped', fallbackMode: true });
    } else {
      res.status(500).json({ error: 'Sync failed', details: err.message });
    }
  }
});

app.get('/api/admin/dashboard', adminAuth, async (req, res) => {
  try {
    const daysQuery = req.query.days;
    const days = (daysQuery !== undefined && daysQuery !== '') ? parseInt(daysQuery) : 7;
    
    // Check MongoDB connection state more reliably
    const dbState = mongoose.connection.readyState;
    console.log('[Admin] Dashboard MongoDB connection state:', dbState);
    
    if (dbState !== 1) { // 1 = connected
      console.log('[Admin] MongoDB not connected (state:', dbState, '), returning fallback dashboard data');
      return res.json({
        period: days,
        overview: {
          totalPageViews: 0,
          totalWebsitesCreated: 0,
          periodUniqueVisitors: 0,
          todayViews: 0,
          todayUniqueVisitors: 0,
          todayWebsitesCreated: 0,
          totalWebsiteViews: 0
        },
        charts: {
          trendData: []
        },
        recentActivity: [],
        websites: [],
        topWebsites: [],
        fallbackMode: true,
        message: 'MongoDB not connected - showing fallback data'
      });
    }
    
    const data = await analytics.getDashboardData(days);
    res.json(data);
  } catch (err) {
    console.error('Dashboard error:', err);
    // Check if it's a MongoDB connection error
    if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError' || err.message.includes('ECONNREFUSED')) {
      res.json({
        period: days,
        overview: {
          totalPageViews: 0,
          totalWebsitesCreated: 0,
          periodUniqueVisitors: 0,
          todayViews: 0,
          todayUniqueVisitors: 0,
          todayWebsitesCreated: 0,
          totalWebsiteViews: 0
        },
        charts: {
          trendData: []
        },
        recentActivity: [],
        websites: [],
        topWebsites: [],
        fallbackMode: true,
        message: 'MongoDB connection failed - showing fallback data'
      });
    } else {
      res.status(500).json({ error: 'Failed to load dashboard data', details: err.message });
    }
  }
});

// List Cloudinary configs for direct access
app.get('/api/admin/cloudinary-list', adminAuth, async (req, res) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'raw',
      prefix: 'configs/',
      max_results: 100,
      context: true
    });
    const websites = (result.resources || []).map(r => ({
      publicId: r.public_id,
      url: r.secure_url,
      createdAt: r.created_at,
      bytes: r.bytes,
      context: r.context?.custom || {}
    }));
    res.json({ websites });
  } catch (err) {
    console.error('Cloudinary list error:', err);
    res.status(500).json({ error: 'Failed to list websites' });
  }
});



// Error handler for JSON APIs
app.use('/api', (err, req, res, next) => {
  console.error('[Server API Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});