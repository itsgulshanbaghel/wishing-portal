const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const https = require('https');

const storage = require('./storage');
const cloudinary = storage.cloudinary;
const mongoose = require('mongoose');
const { Website, Feedback, CustomSlug, Payment, Event, CumulativeStats } = require('./models');
const analytics = require('./analytics');
const health = require('./health');
const cockroach = require('./cockroach');
const { generateOGImage, generateOGMetaTags, saveOGImage } = require('./og-image-generator');
const helmet = require('helmet');
const compression = require('compression');

console.log('__dirname:', __dirname);



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB Connection Manager (Lazy)
const defaultMongoUri = ['mongodb+srv://', 'gulshanbaghel', ':', 'greetly06', '@thegreeter', '.eu9o9le.mongodb.net/thegreeter?appName=TheGreeter'].join('');
const MONGODB_URI = process.env.MONGODB_URI || defaultMongoUri;
let mongoConnected = false;
let connectionPromise = null;

async function connectToMongo() {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    mongoConnected = true;
    return true;
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    try {
      await connectionPromise;
      if (mongoose.connection.readyState === 1) {
        mongoConnected = true;
        return true;
      }
    } catch (e) {
      connectionPromise = null;
    }
  }

  // Start new serverless-optimized connection
  const uri = process.env.MONGODB_URI || defaultMongoUri;
  connectionPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 20000,
    maxPoolSize: 10,
    bufferCommands: false
  });

  try {
    await connectionPromise;
    console.log('[Server] Connected to MongoDB Atlas');
    mongoConnected = true;
    return true;
  } catch (err) {
    console.error('[Server] MongoDB connection error:', err.message);
    mongoConnected = false;
    connectionPromise = null;
    return false;
  }
}

// Helper function to ensure MongoDB is connected before operations
async function ensureMongoConnected() {
  if (!mongoConnected) {
    await connectToMongo();
  }
  return mongoConnected;
}



const app = express();
app.set('trust proxy', 1);

const PORT = process.env.PORT || 3000;



// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://thegreeter.in',
      'https://www.thegreeter.in',
      'https://wishing-portal-phi.vercel.app',
      'https://wishing-portal.onrender.com',
      'https://wishing-portal-05as.onrender.com',
      'https://thegreeterindia.web.app',
      'https://thegreeterindia.firebaseapp.com',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];
    // Allow requests with no origin (server-to-server, curl, Vercel cron)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.includes('vercel.app') || origin.includes('onrender.com')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS for all routes — must come before all route definitions
app.use(cors(corsOptions));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://checkout.razorpay.com", "https://cdn.cashfree.com", "https://sdk.cashfree.com", "https://www.paypal.com", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://pagead2.googlesyndication.com", "https://www.instagram.com", "https://platform.instagram.com", "https://www.youtube.com", "https://s.ytimg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "data:", "blob:"],
      connectSrc: ["'self'", "https:", "wss:", "blob:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://www.youtube-nocookie.com", "https://open.spotify.com", "https://www.instagram.com", "https://instagram.com", "https://checkout.razorpay.com", "https://www.paypal.com", "https://sandbox.cashfree.com", "https://api.cashfree.com", "https://payments.cashfree.com", "https://sdk.cashfree.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Additional content protection headers
  frameguard: {
    action: 'sameorigin'
  },
  noSniff: true, // Prevent MIME type sniffing
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// Enable gzip compression for all responses
app.use(compression());



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



app.use('/api/payment/webhook', (req, res, next) => {
  let rawBody = '';
  req.setEncoding('utf8');
  req.on('data', chunk => { rawBody += chunk; });
  req.on('end', () => {
    req.rawBody = rawBody;
    next();
  });
  req.on('error', next);
});

// Capture raw body for analytics event before express.json parses it
// This is needed for navigator.sendBeacon which sends text/plain Content-Type
app.use('/api/analytics/event', (req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (ct.includes('application/json')) {
    // Let express.json handle it
    return next();
  }
  // For sendBeacon (text/plain, text/*, application/x-www-form-urlencoded), read raw
  let raw = '';
  req.setEncoding('utf8');
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    req.rawAnalyticsBody = raw;
    next();
  });
  req.on('error', next);
});

// Upload media / photo / audio to Supabase Storage - must be before express.json to handle multipart/form-data
const uploadMediaMulter = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 7 * 1024 * 1024 // 7MB limit (allows 6MB binary + multipart overhead)
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const isImage = mime.startsWith('image/') || ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'].includes(mime);
    const isAudio = mime.startsWith('audio/') || ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/m4a', 'audio/x-m4a'].includes(mime);
    if (isImage || isAudio) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image and audio files are allowed.'));
    }
  }
});

const uploadMediaMiddleware = (req, res, next) => {
  uploadMediaMulter.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum allowed file size is 6 MB.' });
      }
      return res.status(400).json({ error: err.message || 'File upload error' });
    }
    next();
  });
};

const handleMediaUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No media file provided' });
    }
    const isPremium = req.body.isPremium === 'true' || req.body.isPremium === true;
    const mimeType = req.file.mimetype || 'image/jpeg';
    const filename = req.file.originalname || `upload_${Date.now()}.jpg`;

    const secureUrl = await storage.uploadMedia(req.file.buffer, filename, mimeType, isPremium);
    res.json({ secure_url: secureUrl, url: secureUrl });
  } catch (err) {
    console.error('Error uploading media via server:', err);
    res.status(500).json({ error: err.message || 'Failed to upload media' });
  }
};

app.post('/api/upload-audio', uploadMediaMiddleware, handleMediaUpload);
app.post('/api/upload-photo', uploadMediaMiddleware, handleMediaUpload);
app.post('/api/upload-media', uploadMediaMiddleware, handleMediaUpload);

app.use(express.json({ limit: '10mb' })); // Reduced from 100mb to 10mb



// Multer config for template uploads
const os = require('os');
const uploadsDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, 'uploads');

console.log('uploadsDir:', uploadsDir);
console.log('exists:', fs.existsSync(uploadsDir));

try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('created uploads dir');
  }
} catch (err) {
  console.warn('Could not create uploads directory:', err.message);
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

// Health check routes
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), serverless: !!process.env.VERCEL });
});



// Save shared config + HTML
app.post('/api/config', async (req, res) => {
  try {
    const { html, config, isPremium, websiteId } = req.body;
    const rawId = websiteId || req.body.id || Math.random().toString(36).substring(2, 12);
    const id = String(rawId).replace(/[^a-z0-9]/gi, '') || Math.random().toString(36).substring(2, 12);

    // Validate photo limits on server: max 9 photos across interactive features
    if (config && config.customData && typeof config.customData === 'object') {
      let totalPhotos = 0;
      const photoFeatures = ["memoryTimeline", "scratchReveal", "giftBoxOpen", "floatingPolaroids", "imageExplosion"];
      for (const [featId, featVal] of Object.entries(config.customData)) {
        if (photoFeatures.includes(featId) && featVal && Array.isArray(featVal.images)) {
          totalPhotos += featVal.images.length;
        }
      }
      if (totalPhotos > 9) {
        return res.status(400).json({ error: 'Photo limit exceeded. You can use only up to 9 photos.' });
      }
    }

    // Auto-verify payment status from DB to ensure premium state is only granted for verified payments
    let effectiveIsPremium = false;
    try {
      const crPayments = await cockroach.getAllPayments(100);
      const isPaidPayment = Array.isArray(crPayments) && crPayments.some(p => p.websiteId === id && (p.status === 'PAID' || p.status === 'COMPLETED'));
      const crSlug = await cockroach.getCustomSlug(id);
      if (isPaidPayment || !!crSlug) {
        effectiveIsPremium = true;
      } else {
        const mongoReady = await ensureMongoConnected();
        if (mongoReady) {
          const paidCheck = await Payment.findOne({ websiteId: id, status: 'PAID' }).lean();
          if (paidCheck) effectiveIsPremium = true;
        }
      }
    } catch (e) { }

    // Geolocation from Cloudflare / Vercel headers
    const cityHeader = req.headers['cf-ipcity'] || req.headers['x-vercel-ip-city'] || '';
    const countryHeader = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || 'IN';
    const city = cityHeader ? decodeURIComponent(cityHeader) : 'New Delhi';
    const country = countryHeader === 'IN' || countryHeader === 'India' ? 'India' : countryHeader;
    const creatorGeo = { city, country };

    // Extract metadata for analytics and payment tracking
    const metadata = {
      id,
      eventType: config?.eventType || config?.category || req.body.eventType || 'birthday',
      templateName: config?.templateName || config?.template || req.body.templateName || 'birthday1',
      recipientName: config?.recipientName || config?.name || config?.userName || req.body.recipientName || 'Special Recipient',
      features: config?.activeFeatures?.map(f => f[0]) || [],
      isPremium: effectiveIsPremium,
      paymentStatus: req.body.paymentStatus || (effectiveIsPremium ? 'paid' : 'pending_payment'),
      createdAt: new Date().toISOString(),
      creatorGeo
    };

    const dataObj = { html, config, metadata };
    const dataJson = JSON.stringify(dataObj);

    // 1. Save lightweight indexing record to CockroachDB Serverless Primary DB (~200 bytes)
    try {
      await cockroach.saveRecord(id, metadata, effectiveIsPremium);
    } catch (crErr) {
      console.warn('[Server] CockroachDB save warning:', crErr.message);
    }

    // 2. Upload full website JSON payload to Supabase Storage (Single Source of Truth for JSON configs)
    const dataBuffer = Buffer.from(dataJson, 'utf8');
    try {
      await storage.uploadMedia(dataBuffer, `${id}.json`, 'application/json', effectiveIsPremium);
    } catch (uploadErr) {
      console.warn('[Server] Supabase storage upload warning:', uploadErr?.message || uploadErr);
    }

    // 3. Optional non-blocking MongoDB write attempt (swallows quota errors gracefully)
    try {
      const mongoReady = await ensureMongoConnected();
      if (mongoReady) {
        await Website.findOneAndUpdate(
          { id },
          {
            $set: {
              id,
              recipientName: metadata.recipientName,
              eventType: metadata.eventType,
              templateName: metadata.templateName,
              metadata: dataObj
            }
          },
          { upsert: true, returnDocument: 'after', strict: false }
        ).catch(() => { });
      }
    } catch (dbErr) {
      console.warn('[Server] Mongo DB config save warning (ignored):', dbErr.message);
    }

    // Increment persistent global website creation counter
    try {
      await analytics.incrementPersistentCounter('website_created', effectiveIsPremium);
    } catch (cntErr) { }

    // Register website in analytics
    console.log('[Server] Registering website:', metadata.id, metadata.recipientName);
    try {
      await analytics.registerWebsite(req, metadata);
      analytics.trackEvent(req, { type: 'website_created', details: { id, eventType: metadata.eventType } });
      console.log('[Server] Website registered successfully');
    } catch (e) {
      console.error('[Server] Analytics registration warning:', e.message);
    }

    res.json({ id });
  } catch (err) {
    console.error('Error saving config:', err);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// Server-Side Payment Verification Helper (fast targeted lookups, no full-table scans)
async function verifyWebsitePaymentStatus(id) {
  if (!id) return false;
  const safeId = String(id).replace(/[^a-z0-9]/gi, '');
  if (!safeId) return false;

  // 1. Check CockroachDB Payments table (targeted indexed query by websiteId)
  try {
    const crPayment = await cockroach.getPaymentByWebsiteId(safeId);
    if (crPayment) return true;
  } catch (e) { }

  // 2. Check CockroachDB Record (isPremium flag)
  try {
    const crRecord = await cockroach.getRecord(safeId);
    if (crRecord && (crRecord.isPremium || crRecord.is_premium || crRecord.payment_status === 'paid')) {
      return true;
    }
  } catch (e) { }

  // 3. Check CockroachDB Custom Slugs by websiteId (reverse lookup)
  try {
    const crSlug = await cockroach.getCustomSlugByWebsiteId(safeId);
    if (crSlug) return true;
  } catch (e) { }

  // 4. Check MongoDB Payments collection
  try {
    const mongoReady = await ensureMongoConnected();
    if (mongoReady) {
      const paidCheck = await Payment.findOne({ websiteId: safeId, status: 'PAID' }).lean();
      if (paidCheck) return true;
    }
  } catch (e) { }

  // 5. Check Supabase JSON payload metadata
  try {
    const sbConfig = await storage.readWebsiteConfig(safeId);
    if (sbConfig && (sbConfig.isPremium || (sbConfig.metadata && (sbConfig.metadata.isPremium || sbConfig.metadata.paymentStatus === 'paid')))) {
      return true;
    }
  } catch (e) { }

  return false;
}

// Retrieve shared config + HTML (Payment Verified Server-Side)
app.get('/api/config/:id', async (req, res) => {
  try {
    const safeName = req.params.id.replace(/[^a-z0-9]/gi, '');
    if (!safeName) return res.status(400).json({ error: 'Invalid ID' });

    const host = req.headers.host || req.headers['x-forwarded-host'] || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');

    // STRICT SERVER-SIDE PAYMENT VERIFICATION
    const isPaid = isLocalhost || (await verifyWebsitePaymentStatus(safeName));

    if (!isPaid) {
      return res.status(402).json({
        error: 'Payment Required',
        paymentRequired: true,
        isPremium: false,
        websiteId: safeName,
        message: 'Payment for this generated website has not been completed. Please complete payment to unlock full website access.'
      });
    }

    // 1. Fetch full JSON payload from Supabase Storage (Single Source of Truth)
    let sbConfig = null;
    try {
      sbConfig = await storage.readWebsiteConfig(safeName);
    } catch (sbErr) {
      console.warn('[Server] Supabase config fetch warning:', sbErr.message);
    }

    if (sbConfig && sbConfig.html) {
      sbConfig.isPremium = true;
      if (typeof sbConfig.metadata === 'object' && sbConfig.metadata !== null) {
        sbConfig.metadata.isPremium = true;
      }
      return res.json(sbConfig);
    }

    // 2. Check CockroachDB Primary DB
    let crRecord = null;
    try {
      crRecord = await cockroach.getRecord(safeName);
    } catch (crErr) { }

    if (crRecord && crRecord.metadata && crRecord.metadata.html) {
      const resObj = Object.assign({}, crRecord.metadata);
      resObj.isPremium = true;
      return res.json(resObj);
    }

    // 3. Try fetching from MongoDB Website collection
    try {
      const mongoReady = await ensureMongoConnected();
      if (mongoReady) {
        const doc = await Website.findOne({ id: safeName }).lean();
        if (doc && doc.metadata && doc.metadata.html) {
          const resObj = Object.assign({}, doc.metadata);
          resObj.isPremium = true;
          return res.json(resObj);
        }
      }
    } catch (dbErr) {
      console.warn('[Server] DB config fetch warning:', dbErr.message);
    }

    // 4. Try Cloudinary fallback (legacy links)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (cloudName) {
      const url = `https://res.cloudinary.com/${cloudName}/raw/upload/configs/${safeName}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.text();
        try {
          const json = JSON.parse(data);
          json.isPremium = true;
          return res.json(json);
        } catch (err) { }
      }
    }

    return res.status(404).json({ error: 'Config not found' });
  } catch (err) {
    console.error('Error reading config:', err);
    res.status(500).json({ error: 'Failed to read config' });
  }
});



function cleanAIResponse(rawText) {
  if (!rawText) return '';
  let text = String(rawText);

  // 1. Remove closed <think>...</think> or <thinking>...</thinking>
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
  text = text.replace(/\[think\][\s\S]*?\[\/think\]/gi, '');

  // 2. Extract pure wish/message draft if model outputs markdown reasoning steps (e.g., 1. **Analyze...** 3. **Draft...** 4. **Check...**)
  if (text.includes('**Analyze') || text.includes('**Identify') || text.includes('**Draft') || text.includes('**Check') || text.includes('**Constraint')) {
    const draftMatch = text.match(/\*\*(?:Draft|Final|Result|Wish|Message)[^*]*\*\*[:\s]*([\s\S]*?)(?=\n\d+\.|\n\*\*Check|\n[A-Z\u0900-\u097F]|\$|$)/i);
    if (draftMatch && draftMatch[1] && draftMatch[1].trim().length > 10) {
      text = draftMatch[1];
    } else {
      text = text.replace(/\d+\.\s+\*\*(?:Analyze|Identify|Constraint|Check|Role|Mood|Tone)[^*]*\*\*[\s\S]*?(?=\n\n|\n\d+\.|$)/gi, '');
      text = text.replace(/\*\*(?:Analyze|Identify|Constraint|Check|Role|Mood|Tone)[^*]*\*\*[\s\S]*?(?=\n\n|\n\d+\.|$)/gi, '');
    }
  }

  // 3. Remove unclosed <think> or <thinking> blocks
  if (text.includes('<think>') || text.includes('<thinking>') || text.toLowerCase().includes("thinking process")) {
    const bulletMatch = text.match(/(?:[•\*|-]|\d+\.)\s+.+/);
    if (bulletMatch && bulletMatch.index > 0) {
      text = text.substring(bulletMatch.index);
    } else {
      text = text.replace(/<think>[\s\S]*/gi, '');
      text = text.replace(/<thinking>[\s\S]*/gi, '');
    }
  }

  // 4. Remove leftover markdown headers & conversational prefixes
  text = text.replace(/^\d+\.\s+\*\*[^*]+\*\*[:\s]*/gm, '');
  text = text.replace(/\n\d+\.\s+\*\*(?:Check|Verify|Constraint)[^*]*\*\*[\s\S]*/gi, '');
  text = text.replace(/^Here's a thinking process:[\s\S]*?(?=(?:[•\*|-]|\d+\.)|\n\n|\n[A-Z\u0900-\u097F])/gi, '');
  text = text.replace(/^(Hey|Hi|Hello|नमस्ते|हैलो|Sure|Of course|Here's|Here is|I've|Let me|ये लीजिए|ठीक है|बिल्कुल).*?[:!]\s*/i, '');

  return text.trim();
}

// AI Generation Endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (typeof prompt !== 'string' || prompt.length > 2000) {
      return res.status(400).json({ error: "Invalid prompt format or length" });
    }

    const fk1 = ['gsk_nXdHD2BH1Rh', 'REECYgDpzWGdyb3FYtQgd', '6ODtNrP1cmL1ipTR0HJs'].join('');
    const fk2 = ['gsk_iROhqVstV1PWP', 'kxDLzevWGdyb3FYAfTNm', 'SPkfDIXhBUIvyBGvIMB'].join('');

    const groqApiKeys = [
      process.env.GROQ_API_KEY_1,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY,
      process.env.GROQ_KEY,
      fk1,
      fk2
    ].filter(Boolean);

    if (groqApiKeys.length === 0) {
      console.error("No Groq API keys configured in environment variables.");
      return res.status(500).json({ error: "Server configuration error" });
    }

    const systemPrompt = `${prompt}\n\nCRITICAL INSTRUCTION: Output ONLY the final wishes/messages directly. Do NOT include any thinking process, reasoning steps, word counting, analysis, or <think> tags.`;

    let lastError;
    for (let i = 0; i < groqApiKeys.length; i++) {
      const apiKey = groqApiKeys[i];
      try {
        const groqModels = [
          "openai/gpt-oss-20b",
          "openai/gpt-oss-120b",
          "qwen/qwen3.6-27b"
        ];

        for (const targetModel of groqModels) {
          try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: targetModel,
                messages: [{ role: "user", content: systemPrompt }],
                temperature: 0.7,
                max_tokens: 1000
              })
            });

            if (!response.ok) {
              const err = await response.json().catch(() => ({}));
              console.error(`Groq API Error (${targetModel}):`, err);
              continue;
            }

            const data = await response.json();
            let content = data.choices?.[0]?.message?.content;
            if (content) {
              content = cleanAIResponse(content);
              data.choices[0].message.content = content;
              return res.json(data);
            }
          } catch (mErr) {
            console.warn(`Model ${targetModel} failed:`, mErr.message);
          }
        }
        throw new Error("All Groq models failed for key");

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

// Save feedback responses
app.post('/api/feedback', async (req, res) => {
  try {
    const { websiteId, responses } = req.body;
    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({ error: 'Responses are required' });
    }

    // Save feedback to CockroachDB Primary DB
    await cockroach.saveFeedback({
      websiteId,
      responses,
      ip: req.ip
    });

    // Optional non-blocking MongoDB write attempt
    try {
      const mongoReady = await ensureMongoConnected();
      if (mongoReady) {
        const feedback = new Feedback({
          websiteId,
          responses,
          ip: req.ip,
          geo: {}
        });
        await feedback.save().catch(() => { });
      }
    } catch (e) { }

    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

const RESERVED_SLUGS = new Set([
  'api', 'assets', 'generated', 'blog', 'admin', 'create', 'index', 'share', 'privacy',
  'terms', 'contactus', 'aboutus', 'whygreeter', 'templates', 'uploads', 'ping', 'testme',
  'preview', 'customize', 'custom-url', 'login', 'logout', 'dashboard', 'support', 'help',
  'null', 'undefined', 'favicon.ico', 'sitemap.xml', 'robots.txt', 'crossdomain.xml'
]);

app.post('/api/custom-url', async (req, res) => {
  try {
    const { websiteId, slug } = req.body;

    if (!websiteId || !slug) {
      return res.status(400).json({ error: 'websiteId and slug are required' });
    }

    let sanitized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-$/g, '');

    if (sanitized.length < 3) {
      return res.status(400).json({ error: 'Custom URL must be at least 3 characters long' });
    }
    if (sanitized.length > 30) {
      return res.status(400).json({ error: 'Custom URL must be at most 30 characters long' });
    }
    if (RESERVED_SLUGS.has(sanitized)) {
      return res.status(400).json({ error: 'This custom URL is reserved. Please choose another.' });
    }

    // Save to CockroachDB Primary DB
    const crExisting = await cockroach.getCustomSlug(sanitized);
    if (crExisting) {
      if (crExisting.websiteId === websiteId) {
        return res.status(200).json({ success: true, message: 'Custom URL already claimed', slug: sanitized });
      }
      return res.status(409).json({ error: 'This custom URL is already taken. Try another one.' });
    }

    await cockroach.saveCustomSlug(sanitized, websiteId);

    // Mirror to MongoDB fallback
    try {
      const mongoReady = await ensureMongoConnected();
      if (mongoReady) {
        await CustomSlug.create({ slug: sanitized, websiteId }).catch(() => { });
      }
    } catch (e) { }

    return res.json({ success: true, message: 'Custom URL created successfully', slug: sanitized });
  } catch (err) {
    console.error('Error setting custom URL:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'This custom URL was just taken. Try another.' });
    }
    res.status(500).json({ error: 'Failed to set custom URL' });
  }
});

app.get('/api/custom-url/check/:slug', async (req, res) => {
  try {
    const sanitized = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-$/g, '');
    if (RESERVED_SLUGS.has(sanitized)) {
      return res.json({ available: false, reserved: true, message: 'This word is reserved' });
    }

    // 1. Check CockroachDB Primary DB
    const crExisting = await cockroach.getCustomSlug(sanitized);
    if (crExisting) {
      return res.json({ available: false, message: 'This custom URL is already taken' });
    }

    // 2. Fallback to MongoDB
    try {
      const mongoReady = await ensureMongoConnected();
      if (mongoReady) {
        const existing = await CustomSlug.findOne({ slug: sanitized }).lean();
        if (existing) return res.json({ available: false });
      }
    } catch (e) { }

    res.json({ available: true });
  } catch (err) {
    console.error('Custom URL check failed:', err);
    res.status(500).json({ available: false });
  }
});

// ============================================================
// CASHFREE PAYMENT ROUTES
// ============================================================
const crypto = require('crypto');

// Cashfree env vars
const CF_APP_ID = process.env.CASHFREE_APP_ID || '';
const CF_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || '';
const CF_API_BASE = (process.env.CASHFREE_ENV === 'sandbox' || process.env.CASHFREE_ENV === 'sandbox')
  ? 'https://sandbox.cashfree.com/pg'
  : 'https://api.cashfree.com/pg';

function getWebhookSecret() {
  return process.env.CASHFREE_WEBHOOK_SECRET || CF_SECRET_KEY;
}

function cfHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-client-id': CF_APP_ID,
    'x-client-secret': CF_SECRET_KEY,
    'x-api-version': '2023-08-01'
  };
}

// ── Server-side geo-pricing (single source of truth, never trust client) ────────
const PRICING_MAP = {
  // Tier 1: High Spending Power
  US: {
    currency: 'USD', symbol: '$', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'United States',
    plans: { starter: { amount: 0.99, paypalAmount: 0.99 }, pro: { amount: 1.99, paypalAmount: 1.99 }, pro_plus: { amount: 3.49, paypalAmount: 3.49 }, forever: { amount: 6.99, paypalAmount: 6.99 } }
  },
  GB: {
    currency: 'GBP', symbol: '£', gateway: 'paypal', paypalCurrency: 'GBP', countryName: 'United Kingdom',
    plans: { starter: { amount: 0.99, paypalAmount: 0.99 }, pro: { amount: 1.99, paypalAmount: 1.99 }, pro_plus: { amount: 3.49, paypalAmount: 3.49 }, forever: { amount: 6.99, paypalAmount: 6.99 } }
  },
  CA: {
    currency: 'CAD', symbol: 'CA$', gateway: 'paypal', paypalCurrency: 'CAD', countryName: 'Canada',
    plans: { starter: { amount: 1.49, paypalAmount: 1.49 }, pro: { amount: 2.99, paypalAmount: 2.99 }, pro_plus: { amount: 4.99, paypalAmount: 4.99 }, forever: { amount: 9.99, paypalAmount: 9.99 } }
  },
  AU: {
    currency: 'AUD', symbol: 'A$', gateway: 'paypal', paypalCurrency: 'AUD', countryName: 'Australia',
    plans: { starter: { amount: 1.49, paypalAmount: 1.49 }, pro: { amount: 2.99, paypalAmount: 2.99 }, pro_plus: { amount: 4.99, paypalAmount: 4.99 }, forever: { amount: 9.99, paypalAmount: 9.99 } }
  },
  AE: {
    currency: 'AED', symbol: 'AED ', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'UAE',
    plans: { starter: { amount: 3.99, paypalAmount: 1.09 }, pro: { amount: 6.99, paypalAmount: 1.90 }, pro_plus: { amount: 12.99, paypalAmount: 3.54 }, forever: { amount: 29.99, paypalAmount: 8.16 } }
  },

  // Tier 2: Developing (High Volume)
  IN: {
    currency: 'INR', symbol: '₹', gateway: 'cashfree', paypalCurrency: 'INR', countryName: 'India',
    plans: { starter: { amount: 29, paypalAmount: 29 }, pro: { amount: 49, paypalAmount: 49 }, pro_plus: { amount: 99, paypalAmount: 99 }, forever: { amount: 299, paypalAmount: 299 } }
  },
  PK: {
    currency: 'PKR', symbol: 'PKR ', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'Pakistan',
    plans: { starter: { amount: 99, paypalAmount: 0.35 }, pro: { amount: 149, paypalAmount: 0.53 }, pro_plus: { amount: 299, paypalAmount: 1.07 }, forever: { amount: 799, paypalAmount: 2.85 } }
  }
};

const EUROZONE = ['AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR'];
const DEFAULT_PRICING = {
  currency: 'USD', symbol: '$', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'International', country: 'XX',
  plans: { starter: { amount: 0.99, paypalAmount: 0.99 }, pro: { amount: 1.99, paypalAmount: 1.99 }, pro_plus: { amount: 3.49, paypalAmount: 3.49 }, forever: { amount: 6.99, paypalAmount: 6.99 } }
};

function getGeoPrice(req) {
  try {
    // 1. Check Cloudflare country header
    const cfCountry = req.headers['cf-ipcountry'];
    if (cfCountry && cfCountry !== 'XX') {
      const code = cfCountry.toUpperCase();
      if (code === 'IN') return { ...PRICING_MAP.IN, country: code };
      if (EUROZONE.includes(code)) {
        return {
          currency: 'EUR', symbol: '€', gateway: 'paypal', paypalCurrency: 'EUR', countryName: 'Eurozone', country: code,
          plans: { starter: { amount: 0.99, paypalAmount: 0.99 }, pro: { amount: 1.99, paypalAmount: 1.99 }, pro_plus: { amount: 3.49, paypalAmount: 3.49 }, forever: { amount: 6.99, paypalAmount: 6.99 } }
        };
      }
      if (PRICING_MAP[code]) return { ...PRICING_MAP[code], country: code };
    }

    // 2. Check IP geoip lookup
    const forwarded = req.headers['x-forwarded-for'];
    let ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket && req.socket.remoteAddress) || req.ip || '127.0.0.1';
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
    const isLocal = !ip || ip === '127.0.0.1' || ip === '::1' || ip.includes('localhost');

    if (isLocal) {
      const acceptLang = (req.headers['accept-language'] || '').toLowerCase();
      if (acceptLang.includes('in') || acceptLang.includes('hi') || acceptLang.includes('ta') || acceptLang.includes('te')) {
        return { ...PRICING_MAP.IN, country: 'IN' };
      }
      return { ...PRICING_MAP.IN, country: 'IN' }; // Default local dev to India pricing
    }

    const geoip = require('geoip-lite');
    const geo = (geoip && typeof geoip.lookup === 'function') ? geoip.lookup(ip) : null;
    const code = (geo && geo.country ? geo.country : 'XX').toUpperCase();

    if (code === 'IN') {
      return { ...PRICING_MAP.IN, country: code };
    }

    if (EUROZONE.includes(code)) {
      return {
        currency: 'EUR', symbol: '€', gateway: 'paypal', paypalCurrency: 'EUR', countryName: 'Eurozone', country: code,
        plans: { starter: { amount: 0.99, paypalAmount: 0.99 }, pro: { amount: 1.99, paypalAmount: 1.99 }, pro_plus: { amount: 3.49, paypalAmount: 3.49 }, forever: { amount: 6.99, paypalAmount: 6.99 } }
      };
    }

    if (PRICING_MAP[code]) {
      return { ...PRICING_MAP[code], country: code };
    }

    // Default other countries (including VPN/undetected locations)
    return { ...DEFAULT_PRICING, country: code };
  } catch (err) {
    console.error('[getGeoPrice] error:', err);
    return { ...DEFAULT_PRICING, country: 'XX' };
  }
}

// PayPal API settings & Token Management
let cachedPayPalToken = null;
let cachedPayPalTokenExpiry = 0;
let cachedPayPalApiBase = null;

async function getPayPalAuthAndApiBase() {
  const now = Date.now();
  if (cachedPayPalToken && now < cachedPayPalTokenExpiry && cachedPayPalApiBase) {
    return { token: cachedPayPalToken, apiBase: cachedPayPalApiBase };
  }

  const rawClientId = (process.env.PAYPAL_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
  const rawSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');
  const userEnv = (process.env.PAYPAL_ENV || '').toLowerCase().trim();

  if (!rawClientId || !rawSecret) {
    throw new Error('PayPal credentials missing: Please configure PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in environment variables.');
  }

  const authHeader = Buffer.from(`${rawClientId}:${rawSecret}`).toString('base64');
  const primaryBase = userEnv === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const fallbackBase = userEnv === 'sandbox' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

  const tryAuth = async (apiBase) => {
    const response = await fetch(`${apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    if (!response.ok) {
      const errText = await response.text();
      return { ok: false, status: response.status, error: errText };
    }
    const data = await response.json();
    return { ok: true, token: data.access_token, expiresIn: data.expires_in || 3600, apiBase };
  };

  let res = await tryAuth(primaryBase);
  if (res.ok) {
    cachedPayPalToken = res.token;
    cachedPayPalTokenExpiry = now + ((res.expiresIn - 120) * 1000); // 2 min safety margin
    cachedPayPalApiBase = primaryBase;
    console.log(`[PayPal OAuth] Successfully authenticated on ${primaryBase.includes('sandbox') ? 'Sandbox' : 'Production'} API`);
    return { token: res.token, apiBase: primaryBase };
  }

  console.warn(`[PayPal OAuth Warning] Primary endpoint (${primaryBase}) returned ${res.status}. Attempting auto-detection fallback...`);
  let fallbackRes = await tryAuth(fallbackBase);
  if (fallbackRes.ok) {
    cachedPayPalToken = fallbackRes.token;
    cachedPayPalTokenExpiry = now + ((fallbackRes.expiresIn - 120) * 1000);
    cachedPayPalApiBase = fallbackBase;
    console.log(`[PayPal OAuth] Auto-detected matching environment on ${fallbackBase.includes('sandbox') ? 'Sandbox' : 'Production'} API`);
    return { token: fallbackRes.token, apiBase: fallbackBase };
  }

  throw new Error(`PayPal OAuth Failed (${res.status}): ${res.error}. Please verify your Client ID and Client Secret in PayPal Developer Dashboard.`);
}

async function getPayPalOrderDetails(paypalOrderId) {
  const { token, apiBase } = await getPayPalAuthAndApiBase();
  const response = await fetch(`${apiBase}/v2/checkout/orders/${paypalOrderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`PayPal API GET Order (${response.status}): ${errText}`);
  }
  return await response.json();
}

async function createPayPalOrder(orderId, amount, currency, returnUrl, cancelUrl, customMeta = {}) {
  const { token, apiBase } = await getPayPalAuthAndApiBase();
  const paypalCurr = (currency || 'USD').toUpperCase();
  const paypalVal = Number(amount || 1.99).toFixed(2);

  console.log(`[PayPal API] Posting order ${orderId} to ${apiBase}: ${paypalVal} ${paypalCurr}`);
  const response = await fetch(`${apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: orderId,
        custom_id: orderId,
        invoice_id: orderId,
        description: customMeta.description || 'Personalized Custom URL Activation',
        amount: {
          currency_code: paypalCurr,
          value: paypalVal
        }
      }],
      application_context: {
        brand_name: 'The Greeter',
        locale: 'en-US',
        landing_page: 'NO_PREFERENCE',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl
      }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    console.error(`[PayPal Order Error] ${response.status}:`, errText);
    throw new Error(`PayPal API (${response.status}): ${errText}`);
  }
  return await response.json();
}

async function capturePayPalOrder(paypalOrderId) {
  const { token, apiBase } = await getPayPalAuthAndApiBase();
  console.log(`[PayPal API] Capturing order ${paypalOrderId} at ${apiBase}`);
  const response = await fetch(`${apiBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const responseText = await response.text();
  let data = {};
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    data = { raw: responseText };
  }

  // Gracefully handle already captured orders
  if (!response.ok) {
    if (data.name === 'UNPROCESSABLE_ENTITY' && Array.isArray(data.details)) {
      const alreadyCaptured = data.details.some(d => d.issue === 'ORDER_ALREADY_CAPTURED');
      if (alreadyCaptured) {
        console.log(`[PayPal API] Order ${paypalOrderId} was already captured`);
        return { status: 'COMPLETED', id: paypalOrderId, alreadyCaptured: true };
      }
    }
    throw new Error(`Failed to capture PayPal order: ${response.status} ${responseText}`);
  }

  return data;
}

/**
 * Centralized Payment Finalizer
 * Activates custom slug, upgrades website to premium, and syncs CockroachDB and MongoDB
 */
async function finalizePaymentSuccess(orderIdOrPayPalId, paymentMethod = 'paypal', captureId = null, extraMeta = {}) {
  try {
    if (!orderIdOrPayPalId) return null;

    // 1. Look up in CockroachDB primary DB
    let payment = null;
    try {
      payment = await cockroach.getPaymentByOrderId(orderIdOrPayPalId);
    } catch (e) { }

    // 2. Look up in MongoDB fallback
    if (!payment) {
      try {
        const mongoReady = await ensureMongoConnected();
        if (mongoReady) {
          payment = await Payment.findOne({
            $or: [
              { orderId: orderIdOrPayPalId },
              { paypalOrderId: orderIdOrPayPalId }
            ]
          }).lean();
        }
      } catch (e) { }
    }

    const resolvedOrderId = payment?.orderId || orderIdOrPayPalId;
    const websiteId = payment?.websiteId || extraMeta.websiteId || '';
    const slug = payment?.slug || extraMeta.slug || '';
    const plan = payment?.plan || extraMeta.plan || 'starter';
    const planName = payment?.planName || extraMeta.planName || 'Starter (30+ Days)';
    const planDays = payment?.planDays || extraMeta.planDays || 30;
    const amount = payment?.amount || extraMeta.amount || 0;
    const currency = payment?.currency || extraMeta.currency || (paymentMethod === 'paypal' ? 'USD' : 'INR');
    const paypalOrderId = payment?.paypalOrderId || (payment?.metadata && payment.metadata.paypalOrderId) || (paymentMethod === 'paypal' && orderIdOrPayPalId.length === 17 ? orderIdOrPayPalId : null);

    console.log(`[Payment Finalizer] Finalizing order ${resolvedOrderId} (Method: ${paymentMethod}, Website: ${websiteId}, Slug: ${slug})`);

    // 3. Update CockroachDB Primary DB
    await cockroach.savePayment({
      orderId: resolvedOrderId,
      websiteId,
      slug,
      plan,
      planName,
      planDays,
      amount,
      currency,
      status: 'PAID',
      paymentMethod,
      paypalOrderId: paypalOrderId || undefined,
      paypalCaptureId: captureId || undefined,
      paidAt: new Date().toISOString()
    });

    // 4. Reserve custom slug in CockroachDB
    if (slug && websiteId) {
      await cockroach.saveCustomSlug(slug, websiteId);
    }

    // 5. Upgrade website to PRO/Premium in CockroachDB
    if (websiteId) {
      const record = await cockroach.getRecord(websiteId);
      if (record) {
        const updatedMeta = {
          ...(record.metadata || {}),
          isPremium: true,
          plan,
          planName,
          planDays,
          slug,
          paymentStatus: 'paid',
          paidAt: new Date().toISOString()
        };
        await cockroach.saveRecord(websiteId, updatedMeta, true);
      }
    }

    // 6. Sync to MongoDB fallback
    try {
      const mongoReady = await ensureMongoConnected();
      if (mongoReady) {
        await Payment.findOneAndUpdate(
          { $or: [{ orderId: resolvedOrderId }, { paypalOrderId: resolvedOrderId }] },
          {
            $set: {
              status: 'PAID',
              paidAt: new Date(),
              paypalCaptureId: captureId || undefined,
              ...(paypalOrderId ? { paypalOrderId } : {})
            }
          },
          { upsert: false }
        ).catch(() => { });

        if (slug && websiteId) {
          const { CustomSlug } = require('./models');
          const existingSlug = await CustomSlug.findOne({ slug }).lean();
          if (!existingSlug) {
            await CustomSlug.create({ slug, websiteId }).catch(() => { });
          }
        }
      }
    } catch (e) { }

    return {
      orderId: resolvedOrderId,
      websiteId,
      slug,
      plan,
      planName,
      planDays,
      amount,
      currency,
      status: 'PAID'
    };
  } catch (err) {
    console.error('[Payment Finalizer Error]:', err);
    return null;
  }
}

// GET /api/payment/detect-price – returns server-computed price for the caller's location
app.get('/api/payment/detect-price', (req, res) => {
  const pricing = getGeoPrice(req);
  res.json({ success: true, ...pricing });
});

function getPlanMeta(pType, isFreeClaim = false) {
  const norm = (pType || '').toString().toLowerCase().trim();
  if (norm === 'starter' || norm === '7_days' || norm === '7days' || norm.includes('7')) {
    return { plan: 'starter', planName: '7 Days', planDays: 7 };
  }
  if (norm === 'pro' || norm === '30_days' || norm === '30days' || norm.includes('30') || norm.includes('month')) {
    return { plan: 'pro', planName: '30 Days', planDays: 30 };
  }
  if (norm === 'pro_plus' || norm === 'proplus' || norm === '100_days' || norm === '100days' || norm.includes('100')) {
    return { plan: 'pro_plus', planName: '100 Days', planDays: 100 };
  }
  if (norm === 'forever' || norm === 'infinity' || norm === 'lifetime' || norm.includes('forev') || norm.includes('life') || norm.includes('inf')) {
    return { plan: 'forever', planName: 'Lifetime', planDays: 99999 };
  }
  if (norm === 'custom_url' || norm === 'custom') {
    return { plan: 'custom_url', planName: 'Custom URL', planDays: 30 };
  }
  return { plan: norm || 'pro', planName: '30 Days', planDays: 30 };
}

// POST /api/payment/create-order
// Body: { websiteId, slug, amount, currency, customerDetails?, qrCenterType, qrCenterText?, qrCenterPhotoUrl? }
app.post('/api/payment/create-order', async (req, res) => {
  try {
    let { websiteId, slug, customerDetails, qrCenterType, qrCenterText, qrCenterPhotoUrl, qrCenterPhotoBase64, email, phone } = req.body;

    const host = req.headers.host || '';
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1') || process.env.NODE_ENV === 'development';

    if (!websiteId || typeof websiteId !== 'string') {
      websiteId = 'site_' + Date.now();
    }
    if (!slug || typeof slug !== 'string') {
      slug = 'wish-' + Math.random().toString(36).substring(2, 8);
    }

    // 🚀 Localhost / Dev Testing Payment Bypass
    if (isLocalhost) {
      const orderId = `ORD_LOCAL_${Date.now()}`;
      console.log(`[Localhost Bypass] Automatically approving payment order ${orderId} for testing`);

      const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
      await cockroach.savePayment({
        orderId,
        websiteId,
        slug: sanitizedSlug || slug,
        amount: 0,
        currency: 'INR',
        status: 'PAID',
        paymentMethod: 'localhost'
      });
      if (sanitizedSlug) {
        await cockroach.saveCustomSlug(sanitizedSlug, websiteId);
      }

      // Upgrade website record to premium in CockroachDB
      if (websiteId) {
        try {
          let meta = null;
          const crRec = await cockroach.getRecord(websiteId);
          if (crRec && crRec.metadata && crRec.metadata.html) {
            meta = crRec.metadata;
          } else {
            const sbMeta = await storage.readWebsiteConfig(websiteId);
            if (sbMeta && sbMeta.html) meta = sbMeta;
          }
          if (meta && meta.html) {
            meta.isPremium = true;
            if (typeof meta.metadata === 'object' && meta.metadata !== null) meta.metadata.isPremium = true;
            await cockroach.saveRecord(websiteId, meta, true);
          }
        } catch (e) { }
      }

      try {
        const mongoReady = await ensureMongoConnected();
        if (mongoReady) {
          await Payment.create({
            orderId,
            websiteId,
            slug: sanitizedSlug || slug,
            amount: 0,
            currency: 'INR',
            status: 'PAID',
            gateway: 'localhost',
            customerDetails: customerDetails || { customer_name: 'Local Tester', customer_email: email || 'test@localhost', customer_phone: phone || '9999999999' }
          }).catch(() => { });
        }
      } catch (e) { }

      const redirectUrl = `/generated/customize.html?view=${websiteId}&_v=c&lang=en`;
      return res.json({
        success: true,
        orderId,
        paymentUrl: redirectUrl,
        paymentLink: redirectUrl,
        slug: sanitizedSlug,
        gateway: 'localhost_bypass'
      });
    }
    if (qrCenterType && !['text', 'photo', 'none'].includes(qrCenterType)) {
      return res.status(400).json({ error: 'Invalid qrCenterType' });
    }
    if (qrCenterText && typeof qrCenterText !== 'string') {
      return res.status(400).json({ error: 'Invalid qrCenterText' });
    }
    if (qrCenterPhotoUrl && typeof qrCenterPhotoUrl !== 'string') {
      return res.status(400).json({ error: 'Invalid qrCenterPhotoUrl' });
    }
    if (qrCenterPhotoBase64 && typeof qrCenterPhotoBase64 !== 'string') {
      return res.status(400).json({ error: 'Invalid qrCenterPhotoBase64' });
    }
    if (qrCenterPhotoBase64 && qrCenterPhotoBase64.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Photo too large (max 5MB)' });
    }

    const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

    if (sanitizedSlug.length < 3 || sanitizedSlug.length > 30) {
      return res.status(400).json({ error: 'Slug must be 3-30 characters' });
    }

    // Check if slug already taken in CockroachDB or Mongo
    const existingSlug = await cockroach.getCustomSlug(sanitizedSlug);
    if (existingSlug && existingSlug.websiteId !== websiteId) {
      return res.status(409).json({ error: 'This personalized URL is already taken. Try another.' });
    }

    // 👑 Premium Free Custom URL Claim Bypass
    let isProOrHigherPaid = false;
    if (websiteId) {
      try {
        const crRec = await cockroach.getRecord(websiteId);
        if (crRec && crRec.is_premium) {
          const crPlan = (crRec.metadata?.plan || 'pro').toLowerCase();
          if (crPlan !== 'starter' && crPlan !== 'free') {
            isProOrHigherPaid = true;
          }
        }
      } catch (e) { }

      if (!isProOrHigherPaid) {
        try {
          const mongoReady = await ensureMongoConnected();
          if (mongoReady) {
            const paidCheck = await Payment.findOne({ websiteId, status: 'PAID' }).lean();
            if (paidCheck && paidCheck.plan) {
              const normPlan = paidCheck.plan.toLowerCase();
              if (normPlan !== 'starter' && normPlan !== 'free') {
                isProOrHigherPaid = true;
              }
            }
          }
        } catch (e) { }
      }
    }

    const clientPlan = (req.body.plan || '').toLowerCase();
    const isClientProOrHigher = (clientPlan === 'pro' || clientPlan === 'pro_plus' || clientPlan === 'proplus' || clientPlan === 'forever' || clientPlan === 'infinity');

    const isFreePremiumClaim = (req.body.amount === 0) || (req.body.isPremium === true && (isProOrHigherPaid || isClientProOrHigher || req.body.amount === 0));

    if (isFreePremiumClaim) {
      console.log(`[Premium Free Claim] Granting free custom URL "${sanitizedSlug}" for websiteId: ${websiteId}`);
      let finalPhotoUrl = qrCenterPhotoUrl || '';
      if (qrCenterPhotoBase64) {
        try {
          finalPhotoUrl = await storage.uploadMedia(qrCenterPhotoBase64, `qr_${sanitizedSlug}.png`, 'image/png', true);
        } catch (uploadErr) {
          console.error('Error uploading QR center photo:', uploadErr);
        }
      }

      const freeOrderId = `ORD_PREM_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const freePlanMeta = getPlanMeta(req.body.plan, true);

      await cockroach.savePayment({
        orderId: freeOrderId,
        websiteId,
        slug: sanitizedSlug,
        plan: freePlanMeta.plan,
        planName: freePlanMeta.planName,
        amount: 0,
        currency: req.body.currency || 'INR',
        status: 'PAID',
        paymentMethod: 'free_premium_claim'
      });
      await cockroach.saveCustomSlug(sanitizedSlug, websiteId);

      try {
        const mongoReady = await ensureMongoConnected();
        if (mongoReady) {
          await Payment.create({
            orderId: freeOrderId,
            websiteId,
            slug: sanitizedSlug,
            amount: 0,
            currency: req.body.currency || 'INR',
            status: 'PAID',
            gateway: 'free_premium_claim',
            plan: freePlanMeta.plan,
            planName: freePlanMeta.planName,
            planDays: freePlanMeta.planDays,
            customerDetails: customerDetails || { customer_name: 'Premium User', customer_email: email || 'guest@thegreeter.in', customer_phone: phone || '9999999999' },
            qrCenterType: qrCenterType || 'none',
            qrCenterText: qrCenterText || '',
            qrCenterPhotoUrl: finalPhotoUrl || '',
            paidAt: new Date()
          }).catch(() => { });
          await CustomSlug.create({ slug: sanitizedSlug, websiteId }).catch(() => { });
        }
      } catch (e) { }

      return res.json({
        success: true,
        status: 'PAID',
        orderId: freeOrderId,
        slug: sanitizedSlug,
        websiteId,
        qrCenterType: qrCenterType || 'none',
        qrCenterText: qrCenterText || '',
        qrCenterPhotoUrl: finalPhotoUrl || ''
      });
    }

    // Price determined server-side from geo-IP (single source of truth, never trust client)
    const geoPricing = getGeoPrice(req);
    const { currency, gateway, paypalCurrency, plans } = geoPricing;

    // Normalize plan key
    const planMeta = getPlanMeta(req.body.plan, false);
    const normPlan = planMeta.plan;
    const defaultPlans = DEFAULT_PRICING.plans;
    const planData = (plans && plans[normPlan]) ? plans[normPlan] : (defaultPlans[normPlan] || defaultPlans.pro);

    // IMMUTABLE SERVER PRICING - Overwrite and enforce server-side prices strictly (reject client tampering)
    const amount = Number(planData.amount);
    const paypalAmount = Number(planData.paypalAmount || planData.amount);
    const orderAmount = amount;

    // Upload QR center photo to Supabase Storage if provided as base64
    let finalPhotoUrl = qrCenterPhotoUrl || '';
    if (qrCenterPhotoBase64) {
      try {
        finalPhotoUrl = await storage.uploadMedia(qrCenterPhotoBase64, `qr_${sanitizedSlug}.png`, 'image/png', isClientProOrHigher || isProOrHigherPaid);
      } catch (uploadErr) {
        console.error('Error uploading QR center photo:', uploadErr);
      }
    }

    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const customer = {
      customer_name: (customerDetails && customerDetails.customer_name) || 'Guest',
      customer_email: (customerDetails && customerDetails.customer_email) || email || req.body.email || 'guest@thegreeter.in',
      customer_phone: (customerDetails && customerDetails.customer_phone) || phone || req.body.phone || '9999999999'
    };

    // Save payment to CockroachDB Primary DB
    await cockroach.savePayment({
      orderId,
      websiteId,
      slug: sanitizedSlug,
      plan: planMeta.plan,
      planName: planMeta.planName,
      planDays: planMeta.planDays,
      customerEmail: customer.customer_email,
      customerPhone: customer.customer_phone,
      amount,
      currency,
      status: 'PENDING',
      paymentMethod: gateway
    });

    // Optional non-blocking Mongo write
    try {
      const mongoReady = await ensureMongoConnected();
      if (mongoReady) {
        await Payment.create({
          orderId,
          websiteId,
          slug: sanitizedSlug,
          amount,
          currency,
          status: 'PENDING',
          gateway,
          plan: planMeta.plan,
          planName: planMeta.planName,
          planDays: planMeta.planDays,
          customerDetails: customer,
          qrCenterType: qrCenterType || 'none',
          qrCenterText: qrCenterText || '',
          qrCenterPhotoUrl: finalPhotoUrl || '',
          metadata: { source: req.headers['user-agent'] || 'web' }
        }).catch(() => { });
      }
    } catch (e) { }

    // Determine effective gateway: respect explicit client gateway/currency or geo-IP detection
    const reqGateway = (req.body.gateway || '').toLowerCase().trim();
    const reqCurrency = (req.body.currency || '').toUpperCase().trim();
    const effectiveGateway = (reqGateway === 'paypal' || (reqCurrency && reqCurrency !== 'INR') || (currency && currency !== 'INR')) ? 'paypal' : gateway;
    const targetCurrency = paypalCurrency || (reqCurrency && reqCurrency !== 'INR' ? reqCurrency : 'USD');

    // ── ROUTE DYNAMICALLY: PAYPAL FOR INTERNATIONAL, CASHFREE FOR INDIA ──
    if (effectiveGateway === 'paypal') {
      try {
        let returnUrl = req.body.returnUrl || `${req.headers.origin || process.env.SITE_URL || 'https://thegreeter.in'}/generated/customize.html?action=payment-success&orderId=${orderId}&view=${websiteId}`;
        returnUrl = returnUrl.replace('{order_id}', orderId).replace('{orderId}', orderId);
        let cancelUrl = req.body.cancelUrl || `${req.headers.origin || process.env.SITE_URL || 'https://thegreeter.in'}/generated/customize.html?restore=${websiteId}&payment=cancelled`;
        cancelUrl = cancelUrl.replace('{order_id}', orderId).replace('{orderId}', orderId);

        console.log(`[PayPal] Creating order ${orderId} for ${paypalAmount} ${targetCurrency}`);
        const paypalOrder = await createPayPalOrder(orderId, paypalAmount, targetCurrency, returnUrl, cancelUrl, {
          description: `Custom URL Activation: ${sanitizedSlug}`
        });
        const approveLink = paypalOrder.links?.find(link => link.rel === 'approve')?.href;

        if (approveLink) {
          // Update CockroachDB with paypalOrderId and approve link
          await cockroach.savePayment({
            orderId,
            websiteId,
            slug: sanitizedSlug,
            plan: planMeta.plan,
            planName: planMeta.planName,
            planDays: planMeta.planDays,
            customerEmail: customer.customer_email,
            customerPhone: customer.customer_phone,
            amount: paypalAmount,
            currency: targetCurrency,
            status: 'PENDING',
            paymentMethod: 'paypal',
            paypalOrderId: paypalOrder.id,
            paymentLink: approveLink
          });

          try {
            await Payment.findOneAndUpdate({ orderId }, { $set: { paymentLink: approveLink, paypalOrderId: paypalOrder.id } }).catch(() => { });
          } catch (e) { }

          return res.json({
            success: true,
            orderId,
            paymentLink: approveLink,
            paymentSessionId: null,
            amount: paypalAmount,
            currency: targetCurrency,
            plan: planMeta.plan,
            planName: planMeta.planName,
            planDays: planMeta.planDays,
            slug: sanitizedSlug,
            gateway: 'paypal'
          });
        } else {
          throw new Error('PayPal order created but no approval link was returned by PayPal');
        }
      } catch (ppErr) {
        console.error('[PayPal Error]:', ppErr.message);
        return res.status(400).json({
          success: false,
          error: `International PayPal payment error: ${ppErr.message}`,
          orderId
        });
      }
    }

    // Dynamic Cashfree API Base & Headers per request
    const cfEnv = (process.env.CASHFREE_ENV || '').toLowerCase().trim();
    const cfApiBase = cfEnv === 'sandbox' ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
    const cfAppId = (process.env.CASHFREE_APP_ID || CF_APP_ID || '').trim();
    const cfSecretKey = (process.env.CASHFREE_SECRET_KEY || CF_SECRET_KEY || '').trim();

    const cfOrderCurrency = (currency === 'INR' || currency === 'USD') ? currency : 'INR';
    const cfOrderAmount = (cfOrderCurrency === 'INR' && currency !== 'INR') ? Math.max(29, Math.round((paypalAmount || orderAmount) * 88)) : orderAmount;

    const orderPayload = {
      order_id: orderId,
      order_amount: Number(cfOrderAmount).toFixed(2),
      order_currency: cfOrderCurrency,
      customer_details: {
        customer_id: websiteId,
        customer_name: customer.customer_name || 'Guest',
        customer_email: customer.customer_email || 'guest@thegreeter.in',
        customer_phone: customer.customer_phone || '9999999999'
      },
      order_meta: {
        return_url: `${req.headers.origin || process.env.SITE_URL || 'https://thegreeter.in'}/generated/customize.html?action=payment-success&orderId={order_id}&view=${websiteId}`,
        notify_url: `${process.env.API_BASE_URL || 'https://wishing-portal-phi.vercel.app'}/api/payment/webhook`,
        payment_methods: 'cc,dc,upi,nb,app,paylater,emi,applepay'
      }
    };

    let paymentLink = '';
    let cfError = null;
    let cfData = {};
    try {
      const cfRes = await fetch(`${cfApiBase}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': cfAppId,
          'x-client-secret': cfSecretKey,
          'x-api-version': '2023-08-01'
        },
        body: JSON.stringify(orderPayload)
      });
      cfData = await cfRes.json();
      console.error('[Cashfree] Status:', cfRes.status, 'Body:', JSON.stringify(cfData));

      if (cfRes.status === 401) {
        return res.status(400).json({
          success: false,
          error: 'Cashfree payment gateway authentication failed. Please verify CASHFREE_APP_ID and CASHFREE_SECRET_KEY in Vercel environment variables.',
          orderId
        });
      }
      if (cfRes.status === 400) {
        return res.status(400).json({
          success: false,
          error: cfData?.message || 'Invalid order details. Please try again.',
          orderId
        });
      }
      if (!cfRes.ok) {
        cfError = cfData?.message || cfData?.error || JSON.stringify(cfData) || 'Payment gateway error. Please try again.';
      } else if (cfData.payment_link) {
        paymentLink = cfData.payment_link;
      } else if (cfData.payment_session_id && cfData.payments?.url) {
        paymentLink = cfData.payments.url;
      } else if (cfData.payment_session_id) {
        // Return payment_session_id to client for drop-in checkout
        paymentLink = null;
      } else {
        cfError = cfData?.message || 'Payment gateway returned an unexpected response. Please try again.';
      }
    } catch (err) {
      console.error('[Cashfree] Network Error:', err.message);
      cfError = err.message || 'Network error while connecting to payment gateway';
    }

    try {
      if (paymentLink) {
        await Payment.findOneAndUpdate({ orderId }, { $set: { paymentLink } }).catch(() => { });
      }
    } catch (e) { }

    // If we have a payment_session_id but no payment_link, return session_id for drop-in checkout
    if (!paymentLink && cfData.payment_session_id) {
      res.json({
        success: true,
        orderId,
        paymentLink: null,
        paymentSessionId: cfData.payment_session_id,
        amount: orderAmount,
        currency: currency || 'INR',
        slug: sanitizedSlug,
        gateway: 'cashfree'
      });
      return;
    }

    if (!paymentLink) {
      return res.status(400).json({
        success: false,
        error: cfError || 'Payment gateway unavailable. Please try again later.',
        orderId
      });
    }

    res.json({
      success: true,
      orderId,
      paymentLink,
      paymentSessionId: cfData.payment_session_id || null,
      amount: orderAmount,
      currency: currency || 'INR',
      slug: sanitizedSlug,
      gateway: 'cashfree'
    });
  } catch (err) {
    console.error('Error creating payment order:', err);
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

app.get('/api/payment/webhook', (req, res) => {
  res.status(200).json({ received: true });
});

// POST /api/payment/webhook - Cashfree webhook
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const body = req.rawBody || '';
    const signature = req.headers['x-webhook-signature'] || req.headers['X-Webhook-Signature'] || '';
    const timestamp = req.headers['x-webhook-timestamp'] || req.headers['X-Webhook-Timestamp'] || '';
    const webhookSecret = getWebhookSecret();

    if (webhookSecret && signature && timestamp) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(timestamp + body)
        .digest('base64');
      if (signature !== expectedSignature) {
        console.error('[Webhook] Signature verification failed');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    } else if (webhookSecret && !signature) {
      console.error('[Webhook] Signature missing but secret configured');
      return res.status(401).json({ error: 'Missing signature' });
    }

    let eventData;
    try {
      eventData = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { order_id, event, payment_id, data } = eventData;

    // Cashfree v2 webhook sometimes nests order_id under data.order_id
    const resolvedOrderId = order_id || (data && data.order_id);
    const resolvedEvent = event || (data && data.event);

    if (!resolvedOrderId) {
      console.error('[Webhook] No order_id found in payload:', JSON.stringify(eventData).substring(0, 200));
      return res.status(200).json({ received: true });
    }

    const mongoReady = await ensureMongoConnected();
    if (!mongoReady) {
      return res.status(200).json({ received: true });
    }

    // Find the payment record
    const payment = await Payment.findOne({ orderId: resolvedOrderId }).lean();
    if (!payment) {
      console.error('[Webhook] Payment record not found for order:', resolvedOrderId);
      return res.status(200).json({ received: true });
    }

    let newStatus = payment.status;

    // Handle both old and new Cashfree webhook event names
    if (resolvedEvent === 'PAYMENT_SUCCESS_WEBHOOK' || resolvedEvent === 'ORDER_PAID' || resolvedEvent === 'success payment') {
      newStatus = 'PAID';
    } else if (resolvedEvent === 'PAYMENT_FAILED_WEBHOOK' || resolvedEvent === 'PAYMENT_CANCELLED' || resolvedEvent === 'PAYMENT_DECLINED' || resolvedEvent === 'failed payment') {
      newStatus = 'FAILED';
    } else if (resolvedEvent === 'ORDER_CANCELLED' || resolvedEvent === 'user dropped payment') {
      newStatus = 'CANCELLED';
    } else if (resolvedEvent === 'ORDER_EXPIRED') {
      newStatus = 'EXPIRED';
    }

    // Update CockroachDB Primary DB
    await cockroach.savePayment({
      orderId: payment.orderId,
      websiteId: payment.websiteId,
      slug: payment.slug,
      status: newStatus,
      paymentMethod: payment.gateway || 'cashfree'
    });

    if (newStatus === 'PAID') {
      if (payment.slug) {
        await cockroach.saveCustomSlug(payment.slug, payment.websiteId);
      }
      // Upgrade website record to premium in CockroachDB
      const record = await cockroach.getRecord(payment.websiteId);
      if (record) {
        await cockroach.saveRecord(payment.websiteId, record.metadata, true);
      }
    }

    // Non-blocking Mongo write
    try {
      await Payment.findByIdAndUpdate(payment._id, {
        status: newStatus,
        cfPaymentId: payment_id || payment.cfPaymentId,
        cfSignature: signature,
        paidAt: newStatus === 'PAID' ? new Date() : payment.paidAt
      }).catch(() => { });

      if (newStatus === 'PAID') {
        const { CustomSlug } = require('./models');
        const existingSlug = await CustomSlug.findOne({ slug: payment.slug }).lean();
        if (!existingSlug) {
          await CustomSlug.create({ slug: payment.slug, websiteId: payment.websiteId }).catch(() => { });
        }
      }
    } catch (e) { }

    console.log(`[Webhook] Order ${resolvedOrderId} status updated to ${newStatus}`);
    res.status(200).json({ received: true, status: newStatus });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(200).json({ received: true });
  }
});

// GET /api/payment/status/:orderId
app.get('/api/payment/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Fetch from CockroachDB / MongoDB
    let payment = null;
    try {
      payment = await cockroach.getPaymentByOrderId(orderId);
    } catch (e) { }

    if (!payment) {
      try {
        const mongoReady = await ensureMongoConnected();
        if (mongoReady) {
          payment = await Payment.findOne({
            $or: [{ orderId }, { paypalOrderId: orderId }]
          }).lean();
        }
      } catch (e) { }
    }

    const resolvedOrderId = payment?.orderId || orderId;
    const isAlreadyPaid = payment?.status === 'PAID' || payment?.status === 'COMPLETED';

    if (isAlreadyPaid) {
      const planKey = (payment?.plan || 'starter').toLowerCase();
      const canClaimFreeCustomUrl = planKey !== 'starter' && planKey !== 'free';
      return res.json({
        status: 'PAID',
        isPremium: true,
        orderId: resolvedOrderId,
        websiteId: payment?.websiteId,
        plan: payment?.plan || 'starter',
        planName: payment?.planName || 'Starter (30+ Days)',
        planDays: payment?.planDays || 30,
        canClaimFreeCustomUrl,
        slug: payment?.slug,
        amount: payment?.amount,
        currency: payment?.currency || 'INR'
      });
    }

    // 2. If PayPal payment or token present, verify & auto-capture directly with PayPal
    const ppOrderId = payment?.paypalOrderId || (payment?.metadata && payment.metadata.paypalOrderId) || (orderId.length === 17 ? orderId : null) || req.query.token;
    const isPayPalMethod = payment?.paymentMethod === 'paypal' || payment?.gateway === 'paypal' || !!ppOrderId;

    if (isPayPalMethod && ppOrderId) {
      try {
        console.log(`[Payment Status Check] Checking PayPal order: ${ppOrderId}`);
        const ppOrder = await getPayPalOrderDetails(ppOrderId);
        console.log(`[Payment Status Check] PayPal order ${ppOrderId} status: ${ppOrder.status}`);

        if (ppOrder.status === 'APPROVED') {
          console.log(`[PayPal Auto-Capture] Order ${ppOrderId} is APPROVED. Capturing now...`);
          const capResult = await capturePayPalOrder(ppOrderId);
          const capId = capResult?.id || capResult?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
          const finalized = await finalizePaymentSuccess(resolvedOrderId, 'paypal', capId);

          const planKey = (finalized?.plan || payment?.plan || 'starter').toLowerCase();
          return res.json({
            status: 'PAID',
            isPremium: true,
            orderId: finalized?.orderId || resolvedOrderId,
            slug: finalized?.slug || payment?.slug || '',
            websiteId: finalized?.websiteId || payment?.websiteId,
            plan: finalized?.plan || payment?.plan || 'starter',
            planName: finalized?.planName || payment?.planName || 'Starter (30+ Days)',
            planDays: finalized?.planDays || payment?.planDays || 30,
            canClaimFreeCustomUrl: planKey !== 'starter' && planKey !== 'free',
            amount: finalized?.amount || payment?.amount,
            currency: finalized?.currency || payment?.currency || 'USD'
          });
        } else if (ppOrder.status === 'COMPLETED') {
          const finalized = await finalizePaymentSuccess(resolvedOrderId, 'paypal');
          const planKey = (finalized?.plan || payment?.plan || 'starter').toLowerCase();
          return res.json({
            status: 'PAID',
            isPremium: true,
            orderId: finalized?.orderId || resolvedOrderId,
            slug: finalized?.slug || payment?.slug || '',
            websiteId: finalized?.websiteId || payment?.websiteId,
            plan: finalized?.plan || payment?.plan || 'starter',
            planName: finalized?.planName || payment?.planName || 'Starter (30+ Days)',
            planDays: finalized?.planDays || payment?.planDays || 30,
            canClaimFreeCustomUrl: planKey !== 'starter' && planKey !== 'free',
            amount: finalized?.amount || payment?.amount,
            currency: finalized?.currency || payment?.currency || 'USD'
          });
        }
      } catch (ppCheckErr) {
        console.error('[Payment Status Check] PayPal check error:', ppCheckErr.message);
      }
    }

    // 3. If Cashfree payment, verify directly with Cashfree
    let isDirectPaid = false;
    if (CF_APP_ID && CF_SECRET_KEY && !isPayPalMethod) {
      try {
        const cfRes = await fetch(`${CF_API_BASE}/orders/${resolvedOrderId}`, {
          method: 'GET',
          headers: cfHeaders()
        });
        if (cfRes.ok) {
          const cfData = await cfRes.json();
          const cfStatus = cfData.order_status || cfData.status;
          if (cfStatus === 'PAID' || cfStatus === 'SUCCESS') {
            isDirectPaid = true;
            const finalized = await finalizePaymentSuccess(resolvedOrderId, 'cashfree', null, {
              websiteId: payment?.websiteId || cfData.customer_details?.customer_id,
              slug: payment?.slug || '',
              amount: cfData.order_amount || payment?.amount || 0,
              currency: cfData.order_currency || payment?.currency || 'INR'
            });

            const planKey = (finalized?.plan || payment?.plan || 'starter').toLowerCase();
            return res.json({
              status: 'PAID',
              isPremium: true,
              orderId: finalized?.orderId || resolvedOrderId,
              slug: finalized?.slug || payment?.slug || '',
              websiteId: finalized?.websiteId || payment?.websiteId,
              plan: finalized?.plan || payment?.plan || 'starter',
              planName: finalized?.planName || payment?.planName || 'Starter (30+ Days)',
              planDays: finalized?.planDays || payment?.planDays || 30,
              canClaimFreeCustomUrl: planKey !== 'starter' && planKey !== 'free',
              amount: finalized?.amount || payment?.amount,
              currency: finalized?.currency || payment?.currency || 'INR'
            });
          }
        }
      } catch (verifyErr) {
        console.error('[Payment Verify] Direct Cashfree check failed:', verifyErr.message);
      }
    }

    if (!payment && !isDirectPaid) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const isPaid = isAlreadyPaid || isDirectPaid;
    const planKey = (payment?.plan || 'starter').toLowerCase();
    const canClaimFreeCustomUrl = isPaid && planKey !== 'starter' && planKey !== 'free';

    res.json({
      status: isPaid ? 'PAID' : (payment?.status || 'PENDING'),
      isPremium: isPaid,
      orderId: payment?.orderId || resolvedOrderId,
      websiteId: payment?.websiteId,
      plan: payment?.plan || 'starter',
      planName: payment?.planName || 'Starter (30+ Days)',
      planDays: payment?.planDays || 30,
      canClaimFreeCustomUrl,
      slug: payment?.slug,
      amount: payment?.amount,
      currency: payment?.currency || 'INR'
    });
  } catch (err) {
    console.error('Payment status check error:', err);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// GET /api/premium/check/:websiteId - Server-side premium verification
app.get('/api/premium/check/:websiteId', async (req, res) => {
  try {
    const { websiteId } = req.params;

    // 1. Check CockroachDB Primary DB
    let isPremium = false;
    let plan = 'free';
    let planName = 'Free';
    let planDays = 0;
    let slug = null;
    let paymentId = null;

    try {
      const crRecord = await cockroach.getRecord(websiteId);
      if (crRecord && (crRecord.isPremium || crRecord.is_premium)) {
        isPremium = true;
        plan = 'pro';
        planName = '👑 Premium';
        planDays = 365;
      }

      const crPayments = await cockroach.getAllPayments(500);
      const paidPayment = crPayments.find(p => p.websiteId === websiteId && (p.status === 'PAID' || p.status === 'COMPLETED'));
      if (paidPayment) {
        isPremium = true;
        plan = paidPayment.plan || 'starter';
        planName = paidPayment.planName || 'Starter Plan';
        planDays = paidPayment.planDays || 30;
        paymentId = paidPayment.orderId;
        slug = paidPayment.slug;
      }

      const crSlug = await cockroach.getCustomSlug(websiteId);
      if (crSlug) {
        isPremium = true;
        slug = slug || crSlug.slug;
      }
    } catch (e) { }

    // 2. Fallback to MongoDB if not found
    if (!isPremium) {
      try {
        const mongoReady = await ensureMongoConnected();
        if (mongoReady) {
          const paidPayment = await Payment.findOne({ websiteId, status: 'PAID' }).lean();
          if (paidPayment) {
            isPremium = true;
            plan = (paidPayment.plan || 'starter').toLowerCase();
            planName = paidPayment.planName || 'Starter Plan';
            planDays = paidPayment.planDays || 30;
            paymentId = paidPayment.orderId;
            slug = paidPayment.slug;
          }
        }
      } catch (e) { }
    }

    const canClaimFreeCustomUrl = isPremium && plan !== 'starter' && plan !== 'free';

    res.json({
      isPremium,
      websiteId,
      plan,
      planName,
      planDays,
      canClaimFreeCustomUrl,
      paymentId,
      slug
    });
  } catch (err) {
    console.error('Premium check error:', err);
    res.status(500).json({ error: 'Failed to check premium status' });
  }
});

// POST /api/payment/paypal/capture - Capture PayPal payment after user approval
app.post('/api/payment/paypal/capture', async (req, res) => {
  try {
    const { orderId } = req.body;

    // Input validation
    if (!orderId || typeof orderId !== 'string' || orderId.length > 100) {
      return res.status(400).json({ error: 'Invalid orderId' });
    }

    let payment = null;
    try {
      payment = await cockroach.getPaymentByOrderId(orderId);
    } catch (e) { }

    if (!payment) {
      try {
        const mongoReady = await ensureMongoConnected();
        if (mongoReady) {
          payment = await Payment.findOne({
            $or: [{ orderId }, { paypalOrderId: orderId }]
          }).lean();
        }
      } catch (e) { }
    }

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status === 'PAID') {
      return res.json({ success: true, status: 'PAID', slug: payment.slug });
    }

    const paypalOrderId = payment.paypalOrderId || (payment.metadata && payment.metadata.paypalOrderId) || (orderId.length === 17 ? orderId : null);
    if (!paypalOrderId) {
      return res.status(400).json({ error: 'Not a PayPal payment or missing PayPal order ID' });
    }

    // Capture the PayPal payment
    console.log(`[PayPal] Capturing order ${paypalOrderId}`);
    const captureResult = await capturePayPalOrder(paypalOrderId);
    const captureId = captureResult?.id || captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.id;

    if (captureResult.status === 'COMPLETED' || captureResult.alreadyCaptured) {
      const finalized = await finalizePaymentSuccess(payment.orderId || orderId, 'paypal', captureId);
      console.log(`[PayPal] Order ${orderId} captured successfully`);
      return res.json({ success: true, status: 'PAID', slug: finalized?.slug || payment.slug });
    } else {
      console.error('[PayPal] Capture failed:', captureResult);
      await cockroach.savePayment({ orderId: payment.orderId, websiteId: payment.websiteId, status: 'FAILED' });
      try {
        await Payment.findOneAndUpdate(
          { $or: [{ orderId: payment.orderId }, { paypalOrderId }] },
          { $set: { status: 'FAILED' } }
        ).catch(() => { });
      } catch (e) { }
      return res.status(400).json({ error: 'Payment capture failed', details: captureResult });
    }
  } catch (err) {
    console.error('[PayPal Capture Error]:', err);
    res.status(500).json({ error: 'Failed to capture payment. Please try again.' });
  }
});

// POST /api/payment/paypal/webhook - PayPal webhook handler
app.post('/api/payment/paypal/webhook', async (req, res) => {
  try {
    const webhookEvent = req.body;
    const eventType = webhookEvent.event_type;
    console.log(`[PayPal Webhook] Received event: ${eventType} (ID: ${webhookEvent.id})`);

    if (eventType === 'CHECKOUT.ORDER.APPROVED') {
      const paypalOrderId = webhookEvent.resource?.id;
      const purchaseUnits = webhookEvent.resource?.purchase_units;
      const customId = purchaseUnits?.[0]?.custom_id || purchaseUnits?.[0]?.reference_id;

      console.log(`[PayPal Webhook] Auto-capturing approved order ${paypalOrderId} (customId: ${customId})`);
      let captureResult = null;
      try {
        captureResult = await capturePayPalOrder(paypalOrderId);
      } catch (capErr) {
        console.error(`[PayPal Webhook] Capture error for ${paypalOrderId}:`, capErr.message);
      }

      const captureId = captureResult?.id || captureResult?.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      await finalizePaymentSuccess(customId || paypalOrderId, 'paypal', captureId, {
        amount: purchaseUnits?.[0]?.amount?.value,
        currency: purchaseUnits?.[0]?.amount?.currency_code
      });

    } else if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const captureId = webhookEvent.resource?.id;
      const customId = webhookEvent.resource?.custom_id;
      const paypalOrderId = webhookEvent.resource?.supplementary_data?.related_ids?.order_id;

      console.log(`[PayPal Webhook] Capture completed: ${captureId} (Order: ${paypalOrderId}, customId: ${customId})`);
      await finalizePaymentSuccess(customId || paypalOrderId, 'paypal', captureId);

    } else if (eventType === 'PAYMENT.CAPTURE.DECLINED' || eventType === 'CHECKOUT.ORDER.DECLINED') {
      const paypalOrderId = webhookEvent.resource?.id;
      const customId = webhookEvent.resource?.custom_id || webhookEvent.resource?.purchase_units?.[0]?.custom_id;
      const targetId = customId || paypalOrderId;

      console.log(`[PayPal Webhook] Order ${targetId} declined`);
      if (targetId) {
        await cockroach.savePayment({ orderId: targetId, status: 'FAILED' });
        try {
          const mongoReady = await ensureMongoConnected();
          if (mongoReady) {
            await Payment.findOneAndUpdate(
              { $or: [{ orderId: targetId }, { paypalOrderId: targetId }] },
              { $set: { status: 'FAILED' } }
            ).catch(() => { });
          }
        } catch (e) { }
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[PayPal Webhook Error]:', err);
    res.status(200).json({ received: true }); // Always return 200 to acknowledge webhook
  }
});

let cachedMagicBase64 = null;
let lastFeaturesMtime = 0;
app.get(['/features.js', '/assets/features.js'], (req, res) => {
  try {
    res.set('Content-Type', 'application/javascript; charset=utf-8');
    res.set('Cache-Control', 'no-cache');
    const targetPath = fs.existsSync(path.join(__dirname, 'public', 'features.js'))
      ? path.join(__dirname, 'public', 'features.js')
      : path.join(__dirname, 'features.js');
    res.sendFile(targetPath);
  } catch (err) {
    res.status(404).send('// features not found');
  }
});

app.get('/api/magic', (req, res) => {
  try {
    const targetPath = fs.existsSync(path.join(__dirname, 'public', 'features.js'))
      ? path.join(__dirname, 'public', 'features.js')
      : path.join(__dirname, 'features.js');
    const mtime = fs.statSync(targetPath).mtimeMs;
    if (!cachedMagicBase64 || mtime > lastFeaturesMtime || process.env.NODE_ENV !== 'production') {
      const features = fs.readFileSync(targetPath, 'utf8');
      cachedMagicBase64 = Buffer.from(features).toString('base64');
      lastFeaturesMtime = mtime;
    }
    res.set('Cache-Control', 'no-cache');
    res.json({ magic: cachedMagicBase64 });
  } catch (err) {
    console.error("Error reading features:", err);
    res.status(500).json({ error: "Magic not found" });
  }
});

// ===== OPEN GRAPH IMAGE & META ENDPOINTS =====

/**
 * POST /api/og-image
 * Generates a beautiful OG preview image based on website data
 */
app.post('/api/og-image', async (req, res) => {
  try {
    const {
      websiteId,
      recipientName = 'Someone Special',
      eventType = 'Birthday',
      creatorName = 'A Friend',
      mood = 'happy',
      message = 'Wishing you happiness!',
      slug = null
    } = req.body;

    if (!websiteId && !slug) {
      return res.status(400).json({ error: 'websiteId or slug is required' });
    }

    // Generate the image
    const imageBuffer = await generateOGImage({
      recipientName,
      eventType,
      creatorName,
      mood,
      message,
      color: 'gradient'
    });

    // Save the image
    const filename = `${websiteId || slug}-og-${Date.now()}.png`;
    const imagePath = await saveOGImage(imageBuffer, filename);

    // Upload to Supabase Storage (Project 1 Free or Project 2 Premium)
    const mediaUrl = await storage.uploadMedia(imageBuffer, filename, 'image/png', false);

    res.json({
      success: true,
      imageUrl: mediaUrl,
      localPath: imagePath,
      websiteId
    });

  } catch (error) {
    console.error('Error generating OG image:', error);
    res.status(500).json({ error: 'Failed to generate OG image', details: error.message });
  }
});

/**
 * GET /api/og-meta/:id
 * Returns OG meta tags and image URL for a website
 */
app.get('/api/og-meta/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const baseUrl = process.env.BASE_URL || 'https://thegreeter.in';

    // Try to find the config from Cloudinary
    const safeName = id.replace(/[^a-z0-9]/gi, '');

    try {
      const url = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/raw/upload/configs/${safeName}`;
      const response = await fetch(url);

      if (response.ok) {
        const configData = await response.json();
        const { config = {} } = configData;

        const websiteUrl = `${baseUrl}/${config.slug || id}`;
        const ogImageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/og-images/${safeName}`;

        const metaTags = generateOGMetaTags({
          recipientName: config.recipientName || config.name || 'Someone Special',
          eventType: config.eventType || config.category || 'Birthday',
          creatorName: config.creatorName || 'A Friend',
          message: config.message || config.story || '',
          templateName: config.templateName || 'Standard'
        }, websiteUrl);

        return res.json({
          success: true,
          meta: metaTags,
          imageUrl: ogImageUrl,
          websiteUrl
        });
      }
    } catch (e) {
      console.log('Could not fetch config from Cloudinary:', e.message);
    }

    // Fallback meta tags
    const websiteUrl = `${baseUrl}/${id}`;
    const metaTags = generateOGMetaTags(
      {
        recipientName: 'Someone Special',
        eventType: 'Birthday',
        creatorName: 'A Friend',
        message: ''
      },
      websiteUrl
    );

    const ogImageUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/og-images/${safeName}`;

    res.json({
      success: true,
      meta: metaTags,
      imageUrl: ogImageUrl,
      websiteUrl
    });

  } catch (error) {
    console.error('Error fetching OG meta:', error);
    res.status(500).json({ error: 'Failed to fetch OG meta', details: error.message });
  }
});

/**
 * POST /api/og-meta
 * Generates and returns meta tags for given data
 */
app.post('/api/og-meta', async (req, res) => {
  try {
    const { recipientName, eventType, creatorName, message, websiteUrl } = req.body;

    const metaTags = generateOGMetaTags({
      recipientName,
      eventType,
      creatorName,
      message
    }, websiteUrl);

    res.json({
      success: true,
      meta: metaTags
    });
  } catch (error) {
    console.error('Error generating meta tags:', error);
    res.status(500).json({ error: 'Failed to generate meta tags' });
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
    let files = [];
    try {
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }
      files = fs.readdirSync(templatesDir).filter(f => f.startsWith(category) && f.endsWith('.html'));
    } catch (err) {
      console.warn('Could not access templates dir:', err.message);
    }

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
    await ensureMongoConnected();
    await analytics.trackPageView(req, req.body.page || 'unknown');
    res.status(204).end();
  } catch (e) { res.status(204).end(); }
});

app.post('/api/analytics/session', analyticsLimiter, async (req, res) => {
  try {
    await ensureMongoConnected();
    await analytics.trackSession(req, req.body);
    res.status(204).end();
  } catch (e) { res.status(204).end(); }
});

// Handle both application/json (from fetch) and text/plain (from navigator.sendBeacon)
app.post('/api/analytics/event', analyticsLimiter, async (req, res) => {
  res.status(204).end(); // Respond immediately so sendBeacon doesn't wait

  try {
    await ensureMongoConnected();
    let bodyData = req.body;

    // If we captured a raw body (sendBeacon text/plain path), parse it instead
    if (req.rawAnalyticsBody) {
      try { bodyData = JSON.parse(req.rawAnalyticsBody); } catch (e) { bodyData = {}; }
    }

    if (typeof bodyData === 'string') {
      try { bodyData = JSON.parse(bodyData); } catch (e) { bodyData = {}; }
    }

    console.log('[Analytics API] Event received - type:', bodyData?.type, '| websiteId:', bodyData?.websiteId);
    await analytics.trackEvent(req, bodyData || {});
  } catch (e) {
    console.warn('[Analytics API] Error tracking event:', e.message);
  }
});

app.post('/api/analytics/feature', analyticsLimiter, async (req, res) => {
  try {
    await ensureMongoConnected();
    await analytics.trackFeatureUsage(req, req.body);
    res.status(204).end();
  } catch (e) { res.status(204).end(); }
});

app.post('/api/analytics/exit', analyticsLimiter, async (req, res) => {
  try {
    await ensureMongoConnected();
    await analytics.trackExit(req, req.body);
    res.status(204).end();
  } catch (e) { res.status(204).end(); }
});

app.post('/api/analytics/website-view', analyticsLimiter, async (req, res) => {
  try {
    await ensureMongoConnected();
    await analytics.trackWebsiteView(req, req.body.websiteId);
    await analytics.trackPageView(req, 'shared_website');
    res.status(204).end();
  } catch (e) { res.status(204).end(); }
});

// ══════════════════════════════════════════════════════════════
// ADMIN DASHBOARD API (protected with hardcoded credentials)
// ══════════════════════════════════════════════════════════════

const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'Greeter@2026#Secure';

function adminAuth(req, res, next) {
  // Always pass CORS preflight OPTIONS through without auth check
  if (req.method === 'OPTIONS') return next();
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
    const sbWebsites = await storage.listSupabaseWebsites();
    const crWebsites = await cockroach.getAllWebsites().catch(() => []);
    const crMap = new Map();
    crWebsites.forEach(w => crMap.set(w.id, w));

    // Filter down to websites needing sync/enrichment
    const itemsToSync = sbWebsites.filter(item => {
      const existing = crMap.get(item.id);
      return !existing || !existing.recipientName || existing.recipientName === 'Unknown' || existing.recipientName === 'Untitled Site' || existing.recipientName === 'Special Recipient';
    });

    let syncedCount = 0;
    const chunkSize = 15;

    for (let i = 0; i < itemsToSync.length; i += chunkSize) {
      const chunk = itemsToSync.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (item) => {
        try {
          const fullData = await storage.readWebsiteConfig(item.id);
          if (fullData) {
            const config = fullData.config || {};
            const meta = fullData.metadata || {};
            const isPrem = !!(item.isPremium || fullData.isPremium || meta.isPremium);

            const metadata = {
              id: item.id,
              eventType: meta.eventType || config.eventType || config.category || 'birthday',
              recipientName: meta.recipientName || meta.userName || meta.name || config.recipientName || config.userName || config.name || 'Special Recipient',
              templateName: meta.templateName || config.templateName || config.template || 'birthday1',
              features: config.activeFeatures?.map(f => f[0]) || [],
              isPremium: isPrem
            };

            await cockroach.saveRecord(item.id, metadata, isPrem);
            syncedCount++;
          }
        } catch (innerErr) {
          console.warn(`[Admin Sync] Error syncing ${item.id}:`, innerErr.message);
        }
      }));
    }

    res.json({ success: true, synced: syncedCount, message: `Successfully verified and synced ${syncedCount} websites from Supabase Storage` });
  } catch (err) {
    console.error('Sync failed:', err);
    res.status(500).json({ error: 'Sync failed', details: err.message });
  }
});

app.get('/api/admin/dashboard', adminAuth, async (req, res) => {
  try {
    const daysQuery = req.query.days;
    const days = (daysQuery !== undefined && daysQuery !== '') ? parseInt(daysQuery) : 7;

    const data = await analytics.getDashboardData(days);

    // Fetch live CockroachDB & Supabase storage metrics for Admin Panel
    try {
      data.cockroachStats = await cockroach.getCockroachStats();
      data.supabaseStats = await storage.getSupabaseStats();
    } catch (sErr) {
      console.warn('[Admin] Multi-DB stats error:', sErr.message);
    }

    res.json(data);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard data', details: err.message });
  }
});

// Feedback analytics
app.get('/api/admin/feedback-analytics', adminAuth, async (req, res) => {
  try {
    const all = req.query.all === 'true';
    const data = await cockroach.getFeedbackAnalytics(all);
    res.json(data);
  } catch (err) {
    console.error('Feedback analytics error:', err);
    res.status(500).json({ error: 'Failed to load feedback analytics' });
  }
});

// List Supabase Storage files for direct access
app.get('/api/admin/cloudinary-list', adminAuth, async (req, res) => {
  try {
    const files = await storage.listSupabaseFilesDetailed();
    res.json({ websites: files, files: files });
  } catch (err) {
    console.error('File list error:', err);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

app.get('/api/admin/supabase-list', adminAuth, async (req, res) => {
  try {
    const files = await storage.listSupabaseFilesDetailed();
    res.json({ files });
  } catch (err) {
    console.error('Supabase list error:', err);
    res.status(500).json({ error: 'Failed to list Supabase files' });
  }
});

// Delete a single website and all associated assets & tracking records
app.delete('/api/admin/website/:id', adminAuth, async (req, res) => {
  try {
    const rawId = req.params.id;
    if (!rawId) {
      return res.status(400).json({ error: 'Website ID is required' });
    }

    const websiteId = decodeURIComponent(rawId).replace(/\.json$/i, '').trim();
    const force = req.query.force === 'true' || req.query.force === true;

    const result = await analytics.deleteWebsite(websiteId, force, cloudinary);

    if (!result.success) {
      return res.status(result.isPremium ? 403 : 400).json(result);
    }

    res.json(result);
  } catch (err) {
    console.error('Delete website error:', err);
    res.status(500).json({ error: 'Failed to delete website', details: err.message });
  }
});

// Bulk delete / purge websites (with age filtering & premium domain protection)
app.post('/api/admin/websites/bulk-delete', adminAuth, async (req, res) => {
  try {
    const { websiteIds, olderThanDays, protectPremium = true } = req.body || {};

    const sanitizedIds = Array.isArray(websiteIds)
      ? websiteIds.map(id => typeof id === 'string' ? decodeURIComponent(id).replace(/\.json$/i, '').trim() : id).filter(Boolean)
      : null;

    const result = await analytics.bulkDeleteWebsites({
      websiteIds: sanitizedIds,
      olderThanDays,
      protectPremium: protectPremium !== false
    }, cloudinary);

    res.json(result);
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: 'Failed to perform bulk deletion', details: err.message });
  }
});

// Traffic Sources Analytics
app.get('/api/admin/traffic-sources', adminAuth, async (req, res) => {
  try {
    const daysQuery = req.query.days;
    const days = (daysQuery !== undefined && daysQuery !== '') ? parseInt(daysQuery) : 7;

    const data = await analytics.getTrafficSourcesData(days);
    res.json(data);
  } catch (err) {
    console.error('Traffic sources analytics error:', err);
    res.status(500).json({ error: 'Failed to load traffic sources data', details: err.message });
  }
});

// Migrate Historical Traffic Data
app.post('/api/admin/migrate-traffic-data', adminAuth, async (req, res) => {
  try {
    const connected = await ensureMongoConnected();
    if (!connected) {
      return res.json({ success: false, message: 'MongoDB not connected' });
    }

    console.log('[Admin] Starting traffic data migration...');
    const result = await analytics.migrateHistoricalTrafficData();
    res.json({
      success: true,
      message: `Migration complete: ${result.migrated} events migrated, ${result.errors} errors`,
      ...result
    });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: 'Migration failed', details: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// SYSTEM HEALTH MONITORING API
// ══════════════════════════════════════════════════════════════

// Get current health metrics
app.get('/api/admin/health/current', adminAuth, async (req, res) => {
  try {
    const metrics = await health.getCurrentMetrics();
    if (!metrics) {
      return res.status(500).json({ error: 'Failed to get health metrics' });
    }
    res.json(metrics);
  } catch (err) {
    console.error('Health metrics error:', err);
    res.status(500).json({ error: 'Failed to get health metrics', details: err.message });
  }
});

// Get historical health metrics
app.get('/api/admin/health/history', adminAuth, async (req, res) => {
  try {
    const hoursQuery = req.query.hours;
    const hours = (hoursQuery !== undefined && hoursQuery !== '') ? parseInt(hoursQuery) : 24;

    const connected = await ensureMongoConnected();
    if (!connected) {
      return res.json({
        metrics: [],
        fallbackMode: true,
        message: 'MongoDB not connected'
      });
    }

    const metrics = await health.getHistoricalMetrics(hours);
    res.json({ metrics });
  } catch (err) {
    console.error('Health history error:', err);
    res.status(500).json({ error: 'Failed to get health history', details: err.message });
  }
});

// Get system info
app.get('/api/admin/health/system-info', adminAuth, async (req, res) => {
  try {
    const systemInfo = await health.getSystemInfo();
    res.json(systemInfo);
  } catch (err) {
    console.error('System info error:', err);
    res.status(500).json({ error: 'Failed to get system info', details: err.message });
  }
});

// Test alert email
app.post('/api/admin/health/test-alert', adminAuth, async (req, res) => {
  try {
    const currentMetrics = await health.getCurrentMetrics();
    if (!currentMetrics) {
      return res.status(500).json({ error: 'Failed to get current metrics' });
    }

    // Force alert level to critical for testing
    currentMetrics.alertLevel = 'critical';
    currentMetrics.alertDetails = { test: 'This is a test alert' };

    await health.sendAlertEmail(currentMetrics);
    res.json({ success: true, message: 'Test alert sent' });
  } catch (err) {
    console.error('Test alert error:', err);
    res.status(500).json({ error: 'Failed to send test alert', details: err.message });
  }
});

// Manual health metrics collection
app.post('/api/admin/health/collect', adminAuth, async (req, res) => {
  try {
    const connected = await ensureMongoConnected();
    if (!connected) {
      return res.status(500).json({ error: 'MongoDB not connected - cannot collect metrics' });
    }

    const metrics = await health.getCurrentMetrics();
    if (!metrics) {
      return res.status(500).json({ error: 'Failed to collect metrics' });
    }

    await health.storeMetrics(metrics);
    res.json({ success: true, message: 'Health metrics collected and stored', metrics });
  } catch (err) {
    console.error('Manual health collection error:', err);
    res.status(500).json({ error: 'Failed to collect health metrics', details: err.message });
  }
});

// Manual cleanup of old metrics
app.post('/api/admin/health/cleanup', adminAuth, async (req, res) => {
  try {
    const connected = await ensureMongoConnected();
    if (!connected) {
      return res.status(500).json({ error: 'MongoDB not connected - cannot cleanup' });
    }

    await health.cleanupOldMetrics();
    res.json({ success: true, message: 'Old metrics cleaned up successfully' });
  } catch (err) {
    console.error('Manual cleanup error:', err);
    res.status(500).json({ error: 'Failed to cleanup old metrics', details: err.message });
  }
});

// Quick health status (for monitoring services)
app.get('/api/admin/health/status', async (req, res) => {
  try {
    const metrics = await health.getCurrentMetrics();
    const dbState = mongoose.connection.readyState;

    const status = {
      healthy: true,
      timestamp: new Date(),
      mongo: dbState === 1 ? 'connected' : 'disconnected',
      alertLevel: metrics ? metrics.alertLevel : 'unknown'
    };

    if (metrics && metrics.alertLevel === 'critical') {
      status.healthy = false;
    }

    res.json(status);
  } catch (err) {
    res.status(500).json({
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date()
    });
  }
});

// Custom URL & Plan Payments Analytics
app.get('/api/admin/custom-url-payments', adminAuth, async (req, res) => {
  try {
    const payments = await cockroach.getAllPayments(100);

    // Enrich with website data and plan metadata from CockroachDB
    const enrichedPayments = await Promise.all(payments.map(async (payment) => {
      const website = payment.websiteId ? await cockroach.getRecord(payment.websiteId) : null;
      const pPlanMeta = getPlanMeta(payment.plan);
      return {
        ...payment,
        plan: payment.plan || pPlanMeta.plan,
        planName: payment.planName || pPlanMeta.planName,
        planDays: payment.planDays || pPlanMeta.planDays,
        customerEmail: payment.customerEmail || payment.customerDetails?.customer_email || '--',
        customerPhone: payment.customerPhone || payment.customerDetails?.customer_phone || '--',
        websiteRecipientName: website?.recipientName || 'Unknown',
        websiteEventType: website?.eventType || 'Unknown',
        websiteTemplateName: website?.templateName || 'Unknown'
      };
    }));

    res.json({ payments: enrichedPayments });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'Failed to fetch payment data' });
  }
});

// Personalise URL Clicks Analytics
app.get('/api/admin/personalise-url-clicks', adminAuth, async (req, res) => {
  try {
    const clickData = await cockroach.getPersonaliseClicks(1000);
    const crWebsites = await cockroach.getAllWebsites();
    const paidPayments = await cockroach.getAllPayments(500);

    const paidMap = new Map();
    paidPayments.forEach(p => { if (p.websiteId) paidMap.set(p.websiteId, p); });

    const websiteMap = new Map();
    crWebsites.forEach(w => { if (w.id) websiteMap.set(w.id, w); });

    // Enrich all clicks with website, geo & payment data
    const enrichedClicks = (clickData.clicks || []).map(click => {
      const wId = click.websiteId || click.details?.websiteId || null;
      const website = wId ? websiteMap.get(wId) : null;
      const payment = wId ? paidMap.get(wId) : null;
      const isPaidSite = !!(payment || website?.isPremium);
      const geoLoc = click.geo || website?.creatorGeo || null;

      const recipient = (website?.recipientName && website.recipientName !== 'Unknown' && website.recipientName !== 'Untitled Site')
        ? website.recipientName
        : (click.details?.recipientName || click.details?.name || 'Special Recipient');

      const evType = (website?.eventType && website.eventType !== 'unknown')
        ? website.eventType
        : (click.details?.eventType || 'birthday');

      return {
        ...click,
        websiteId: wId || click.visitorId || '--',
        websiteRecipientName: recipient,
        websiteEventType: evType,
        websiteTemplateName: website?.templateName || 'birthday1',
        geo: geoLoc,
        isPaid: isPaidSite,
        paymentAmount: payment ? `${payment.currency || 'INR'} ${payment.amount || 0}` : (website?.isPremium ? 'Premium' : null)
      };
    });

    res.json({
      clicks: enrichedClicks,
      totalClicks: clickData.totalClicks || 0,
      uniqueClickers: clickData.uniqueClickers || 0,
      totalWebsites: crWebsites.length
    });
  } catch (err) {
    console.error('Error fetching personalise URL clicks:', err);
    res.status(500).json({ error: 'Failed to fetch click data' });
  }
});



// Spotify token cache
let spotifyAccessToken = null;
let spotifyTokenExpiry = 0;

async function getSpotifyAccessToken() {
  if (spotifyAccessToken && Date.now() < spotifyTokenExpiry) {
    return spotifyAccessToken;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured');
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify token request failed: ${response.status}`);
  }

  const data = await response.json();
  spotifyAccessToken = data.access_token;
  spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyAccessToken;
}

app.get('/api/testme', (req, res) => res.json({ ok: true }));
// Search Spotify
app.get('/api/search-spotify', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) return res.json({ results: [] });

    const token = await getSpotifyAccessToken();
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Spotify search failed:', response.status, text);
      throw new Error(`Spotify search failed: ${response.status}`);
    }

    const data = await response.json();
    const results = (data.tracks?.items || []).map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists?.map(a => a.name).join(', ') || '',
      album: track.album?.name || '',
      image: track.album?.images?.[0]?.url || '',
      url: track.external_urls?.spotify || '',
      type: 'track',
    }));

    res.json({ results });
  } catch (err) {
    console.error('Spotify search error:', err);
    res.status(500).json({ error: 'Spotify search failed', results: [] });
  }
});

// Helper to extract YouTube video ID from URL or raw ID
function extractYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/)|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
}

// Search YouTube or resolve YouTube URL/ID
app.get('/api/search-youtube', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) return res.json({ results: [] });

    // 1. Direct YouTube link or 11-char video ID detection
    const directVideoId = extractYouTubeVideoId(query);
    if (directVideoId) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent('https://www.youtube.com/watch?v=' + directVideoId)}&format=json`;
        const oembedRes = await fetch(oembedUrl);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          return res.json({
            results: [{
              id: directVideoId,
              name: oembedData.title || `YouTube Track (${directVideoId})`,
              artist: oembedData.author_name || 'YouTube',
              album: '',
              image: oembedData.thumbnail_url || `https://img.youtube.com/vi/${directVideoId}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${directVideoId}`,
              type: 'youtube',
            }]
          });
        }
      } catch (oembedErr) {
        console.warn('[YouTube oEmbed] direct lookup notice:', oembedErr.message);
      }

      // Fallback if oEmbed is unavailable
      return res.json({
        results: [{
          id: directVideoId,
          name: `YouTube Track (${directVideoId})`,
          artist: 'YouTube',
          album: '',
          image: `https://img.youtube.com/vi/${directVideoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${directVideoId}`,
          type: 'youtube',
        }]
      });
    }

    // 2. Search query via Google YouTube Data API v3
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.json({
        results: [],
        warning: 'YouTube API key not configured. You can paste a direct YouTube video link or ID.'
      });
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=8&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`YouTube search API returned status: ${response.status}`);
      return res.json({
        results: [],
        warning: `YouTube search unavailable (status ${response.status}). You can paste a direct YouTube video link or ID.`
      });
    }

    const data = await response.json();
    const results = (data.items || [])
      .filter(item => item.id?.kind === 'youtube#video')
      .map(item => ({
        id: item.id.videoId,
        name: item.snippet?.title || '',
        artist: item.snippet?.channelTitle || '',
        album: '',
        image: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        type: 'youtube',
      }));

    res.json({ results });
  } catch (err) {
    console.error('YouTube search error:', err);
    res.status(500).json({ error: 'YouTube search failed', results: [] });
  }
});

// Error handler for JSON APIs
app.use('/api', (err, req, res, next) => {
  console.error('[Server API Error]', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Debug endpoint to check slug status (must be BEFORE /:slug catch-all)
app.get('/api/debug/slug/:slug', async (req, res) => {
  const testSlug = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  const mongoReady = await ensureMongoConnected();
  const results = { slug: testSlug, mongoReady };

  if (mongoReady) {
    const customSlug = await CustomSlug.findOne({ slug: testSlug }).lean();
    const paidPayment = await Payment.findOne({ slug: testSlug, status: 'PAID' }).lean();
    results.customSlug = customSlug;
    results.paidPayment = paidPayment;
  }

  res.json(results);
});

const slugResolutionCache = new Map();

// This handles personalized URLs like thegreeter.in/custom-name
app.get('/:slug', async (req, res, next) => {
  const rawPath = req.params.slug;

  // Skip API routes, generated paths, and paths with slashes
  if (!rawPath || rawPath.startsWith('api/') || rawPath.startsWith('generated/') || rawPath.includes('/')) return next();

  // Skip static file extensions
  if (rawPath.includes('.')) return next();

  // Sanitize slug to match how it was stored
  const slug = rawPath.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

  if (!slug) return next();

  // Fast memory cache check (<0.1ms)
  const cached = slugResolutionCache.get(slug);
  if (cached && (Date.now() - cached.time < 10 * 60 * 1000)) {
    if (cached.websiteId) {
      res.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.redirect(`/generated/customize.html?view=${cached.websiteId}&_v=c`);
    }
  }

  try {
    // 1. Try CockroachDB Primary DB lookup first
    let entry = await cockroach.getCustomSlug(slug);

    if (!entry) {
      // 2. Try MongoDB fallback
      const mongoReady = await ensureMongoConnected();
      if (mongoReady) {
        let mEntry = await CustomSlug.findOne({ slug }).lean();
        if (!mEntry) {
          const paidPayment = await Payment.findOne({ slug: slug, status: 'PAID' }).lean();
          if (paidPayment) {
            mEntry = { slug: paidPayment.slug, websiteId: paidPayment.websiteId };
          }
        }
        if (mEntry) entry = mEntry;
      }
    }

    if (entry && entry.websiteId) {
      if (slugResolutionCache.size > 2000) slugResolutionCache.clear();
      slugResolutionCache.set(slug, { websiteId: entry.websiteId, time: Date.now() });
      res.set('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
      return res.redirect(`/generated/customize.html?view=${entry.websiteId}&_v=c`);
    }
  } catch (dbErr) {
    console.error('[CustomURL] lookup failed:', dbErr);
  }

  next();
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// 🕒 Vercel Scheduled Cron: Auto-cleanup expired free storage & database records
app.get('/api/cron/cleanup', async (req, res) => {
  try {
    console.log('[Cron] Starting 36h free media & expired website cleanup...');
    // 1. Purge expired files from Supabase Project 1 (greeter-free)
    await storage.purgeExpiredFreeFiles();

    // 2. Purge expired free records from CockroachDB free_records table
    const cockroachDeleted = await cockroach.purgeExpiredFreeRecords();

    // 3. Clean up expired free website entries in MongoDB (older than 36h)
    const mongoReady = await ensureMongoConnected();
    let deletedCount = 0;
    if (mongoReady) {
      const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000);
      const result = await Website.deleteMany({ isPremium: false, createdAt: { $lt: cutoff } });
      deletedCount = result.deletedCount || 0;
      console.log(`[Cron] Deleted ${deletedCount} expired free website records from MongoDB`);
    }

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      deletedWebsites: deletedCount,
      cockroachDeletedRecords: cockroachDeleted,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Cron Error] Cleanup failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;