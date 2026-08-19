const express = require('express');

const cors = require('cors');

const dotenv = require('dotenv');

const path = require('path');

const fs = require('fs');

const multer = require('multer');

const https = require('https');

const storage = require('./storage');
const cloudinary = storage.cloudinary;
const mongoose = require('mongoose');
const { Website, Feedback, CustomSlug, Payment, Event } = require('./models');
const analytics = require('./analytics');
const health = require('./health');
const { generateOGImage, generateOGMetaTags, saveOGImage } = require('./og-image-generator');
const helmet = require('helmet');
const compression = require('compression');



console.log('__dirname:', __dirname);



dotenv.config();



cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MongoDB Connection Manager (Lazy)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://gulshanbaghel:greetly06@thegreeter.eu9o9le.mongodb.net/?appName=TheGreeter';
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
    await connectionPromise;
    return mongoConnected;
  }

  // Start new connection
  connectionPromise = mongoose.connect(MONGODB_URI);

  try {
    await connectionPromise;
    console.log('[Server] Connected to MongoDB Atlas');
    mongoConnected = true;
    return true;
  } catch (err) {
    console.error('[Server] MongoDB connection error:', err);
    console.log('[Server] Running in fallback mode - analytics will be limited');
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
  origin: [
    'https://thegreeter.in',
    'https://wishing-portal-phi.vercel.app',
    'https://wishing-portal.onrender.com',
    'https://wishing-portal-05as.onrender.com',
    'https://thegreeterindia.web.app',
    'https://thegreeterindia.firebaseapp.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

// Allow same-origin requests for Vercel/Render hosting
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || origin.includes('vercel.app') || origin.includes('onrender.com')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  next();
});
app.use(cors(corsOptions));

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://checkout.razorpay.com", "https://cdn.cashfree.com", "https://www.paypal.com", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://pagead2.googlesyndication.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "data:", "blob:"],
      connectSrc: ["'self'", "https://wishing-portal-phi.vercel.app", "https://wishing-portal-05as.onrender.com", "https://wishing-portal.onrender.com", "https://api.cashfree.com", "https://api-m.paypal.com", "https://api-m.sandbox.paypal.com", "https://api.cloudinary.com"],
      frameSrc: ["'self'", "https://checkout.razorpay.com", "https://www.paypal.com", "https://sandbox.cashfree.com"],
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
    action: 'deny' // Prevent site from being embedded in iframes
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

// Upload audio to Cloudinary - must be before express.json to handle multipart/form-data
const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});

app.post('/api/upload-audio', uploadAudio.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    const isPremium = req.body.isPremium === 'true' || req.body.isPremium === true;
    const mimeType = req.file.mimetype || 'audio/mpeg';
    const filename = req.file.originalname || `audio_${Date.now()}.mp3`;

    const secureUrl = await storage.uploadMedia(req.file.buffer, filename, mimeType, isPremium);
    res.json({ secure_url: secureUrl });
  } catch (err) {
    console.error('Error uploading audio via server:', err);
    res.status(500).json({ error: err.message || 'Failed to upload audio' });
  }
});

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



// Save shared config + HTML
app.post('/api/config', async (req, res) => {
  try {
    const { html, config, isPremium, websiteId } = req.body;
    if (!html) return res.status(400).json({ error: 'HTML is required' });
    const id = websiteId || req.body.id || Math.random().toString(36).substring(2, 12);

    // Extract metadata for analytics
    const metadata = {
      id,
      eventType: config?.eventType || config?.category || 'unknown',
      templateName: config?.templateName || config?.template || 'unknown',
      recipientName: config?.recipientName || config?.name || config?.userName || 'Unknown',
      features: config?.activeFeatures?.map(f => f[0]) || [],
      isPremium: !!isPremium
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
      await ensureMongoConnected();
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
    ].filter(Boolean);

    if (groqApiKeys.length === 0) {
      console.error("No Groq API keys configured in environment variables.");
      return res.status(500).json({ error: "Server configuration error" });
    }

    let lastError;
    for (let i = 0; i < groqApiKeys.length; i++) {
      const apiKey = groqApiKeys[i];
      try {
        const groqModels = [
          "llama-3.3-70b-versatile",
          "llama-3.1-8b-instant",
          "mixtral-8x7b-32768",
          "gemma2-9b-it"
        ];
        let modelSuccess = false;

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
                messages: [{ role: "user", content: prompt }],
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
            console.log(`Groq API Success (${targetModel}):`, data);

            if (data.choices?.[0]?.message?.content) {
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

    await ensureMongoConnected();

    const feedback = new Feedback({
      websiteId,
      responses,
      ip: req.ip,
      geo: {} // Could be populated if geo service is available
    });

    await feedback.save();
    res.json({ success: true, message: 'Feedback submitted successfully' });
  } catch (err) {
    console.error('Error saving feedback:', err);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

const RESERVED_SLUGS = new Set([
  'api', 'assets', 'generated', 'blog', 'admin', 'create', 'index', 'share', 'privacy',
  'terms', 'contactus', 'whygreeter', 'templates', 'uploads', 'ping', 'testme',
  'favicon.ico', 'sitemap.xml', 'robots.txt', 'crossdomain.xml'
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

    const ensureMongoConnectedResult = await ensureMongoConnected();
    if (!ensureMongoConnectedResult) {
      return res.status(503).json({ error: 'Server temporarily unavailable. Please try again later.' });
    }

    const existing = await CustomSlug.findOne({ slug: sanitized }).lean();
    if (existing) {
      if (existing.websiteId === websiteId) {
        return res.status(200).json({ success: true, message: 'Custom URL already claimed', slug: sanitized });
      }
      return res.status(409).json({ error: 'This custom URL is already taken. Try another one.' });
    }

    await CustomSlug.create({ slug: sanitized, websiteId });
    res.json({ success: true, message: 'Custom URL created successfully', slug: sanitized });
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
    const ensureMongoConnectedResult = await ensureMongoConnected();
    if (!ensureMongoConnectedResult) {
      return res.status(503).json({ available: false });
    }
    const existing = await CustomSlug.findOne({ slug: sanitized }).lean();
    res.json({ available: !existing });
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
    plans: { starter: { amount: 0.99, paypalAmount: 0.99 }, pro: { amount: 1.99, paypalAmount: 1.99 }, pro_plus: { amount: 3.99, paypalAmount: 3.99 }, forever: { amount: 6.99, paypalAmount: 6.99 } }
  },
  GB: {
    currency: 'GBP', symbol: '£', gateway: 'paypal', paypalCurrency: 'GBP', countryName: 'United Kingdom',
    plans: { starter: { amount: 0.99, paypalAmount: 0.99 }, pro: { amount: 1.49, paypalAmount: 1.49 }, pro_plus: { amount: 2.99, paypalAmount: 2.99 }, forever: { amount: 5.99, paypalAmount: 5.99 } }
  },
  CA: {
    currency: 'CAD', symbol: 'CA$', gateway: 'paypal', paypalCurrency: 'CAD', countryName: 'Canada',
    plans: { starter: { amount: 1.49, paypalAmount: 1.49 }, pro: { amount: 2.49, paypalAmount: 2.49 }, pro_plus: { amount: 4.99, paypalAmount: 4.99 }, forever: { amount: 8.99, paypalAmount: 8.99 } }
  },
  AU: {
    currency: 'AUD', symbol: 'A$', gateway: 'paypal', paypalCurrency: 'AUD', countryName: 'Australia',
    plans: { starter: { amount: 1.49, paypalAmount: 1.49 }, pro: { amount: 2.99, paypalAmount: 2.99 }, pro_plus: { amount: 5.99, paypalAmount: 5.99 }, forever: { amount: 9.99, paypalAmount: 9.99 } }
  },
  AE: {
    currency: 'AED', symbol: 'AED ', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'UAE',
    plans: { starter: { amount: 3.99, paypalAmount: 1.09 }, pro: { amount: 6.99, paypalAmount: 1.90 }, pro_plus: { amount: 14.99, paypalAmount: 4.08 }, forever: { amount: 25.99, paypalAmount: 7.07 } }
  },

  // Tier 2: Developing (High Volume)
  IN: {
    currency: 'INR', symbol: '₹', gateway: 'cashfree', paypalCurrency: 'INR', countryName: 'India',
    plans: { starter: { amount: 29, paypalAmount: 29 }, pro: { amount: 49, paypalAmount: 49 }, pro_plus: { amount: 99, paypalAmount: 99 }, forever: { amount: 199, paypalAmount: 199 } }
  },
  PK: {
    currency: 'PKR', symbol: 'PKR ', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'Pakistan',
    plans: { starter: { amount: 99, paypalAmount: 0.35 }, pro: { amount: 149, paypalAmount: 0.53 }, pro_plus: { amount: 299, paypalAmount: 1.07 }, forever: { amount: 599, paypalAmount: 2.15 } }
  }
};

const EUROZONE = ['AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR'];
const DEFAULT_PRICING = {
  currency: 'USD', symbol: '$', gateway: 'paypal', paypalCurrency: 'USD', countryName: 'International', country: 'XX',
  plans: { starter: { amount: 0.99, paypalAmount: 0.99 }, pro: { amount: 1.99, paypalAmount: 1.99 }, pro_plus: { amount: 3.99, paypalAmount: 3.99 }, forever: { amount: 6.99, paypalAmount: 6.99 } }
};

function getGeoPrice(req) {
  try {
    const geoip = require('geoip-lite');
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket && req.socket.remoteAddress) || req.ip || '127.0.0.1';
    const cleanIP = ip.replace('::ffff:', '').replace('::1', '127.0.0.1');
    const geo = geoip.lookup(cleanIP);
    const code = (geo ? geo.country : 'XX').toUpperCase();

    console.log('[getGeoPrice] IP:', cleanIP, 'Country:', code, 'Geo:', geo);

    if (code === 'IN') {
      console.log('[getGeoPrice] Using India pricing (Cashfree)');
      return { ...PRICING_MAP.IN, country: code };
    }

    if (EUROZONE.includes(code)) {
      console.log('[getGeoPrice] Using Eurozone pricing (PayPal)');
      return {
        currency: 'EUR', symbol: '€', gateway: 'paypal', paypalCurrency: 'EUR', countryName: 'Eurozone', country: code,
        plans: { starter: { amount: 0.99, paypalAmount: 0.99 }, pro: { amount: 1.99, paypalAmount: 1.99 }, pro_plus: { amount: 3.99, paypalAmount: 3.99 }, forever: { amount: 6.99, paypalAmount: 6.99 } }
      };
    }

    if (PRICING_MAP[code]) {
      console.log('[getGeoPrice] Using country-specific pricing for:', code);
      return { ...PRICING_MAP[code], country: code };
    }

    // Default other countries (including VPN/undetected locations)
    console.log('[getGeoPrice] Using default international pricing (PayPal)');
    return { ...DEFAULT_PRICING, country: code };
  } catch (err) {
    console.error('[getGeoPrice] error:', err);
    // Default to international pricing on error (not INR)
    console.log('[getGeoPrice] Error - using default international pricing (PayPal)');
    return { ...DEFAULT_PRICING, country: 'XX' };
  }
}

// PayPal API settings
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox'; // sandbox or production
const PAYPAL_API_BASE = PAYPAL_ENV === 'production' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal client ID or secret not configured in env variables');
  }
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:	ext{ }PAYPAL_CLIENT_SECRET`.replace(':text: ', ':') + `${PAYPAL_CLIENT_SECRET}`).toString('base64');
  // Safer construct
  const authHeader = Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_CLIENT_SECRET).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to get PayPal access token: ${response.status} ${errText}`);
  }
  const data = await response.json();
  return data.access_token;
}

async function createPayPalOrder(amount, currency, returnUrl, cancelUrl) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toFixed(2)
        },
        description: 'Personalized Custom URL Activation'
      }],
      application_context: {
        brand_name: 'The Greeter Custom URL',
        locale: 'en-US',
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: returnUrl,
        cancel_url: cancelUrl
      }
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create PayPal order: ${response.status} ${errText}`);
  }
  return await response.json();
}

async function capturePayPalOrder(paypalOrderId) {
  const token = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to capture PayPal order: ${response.status} ${errText}`);
  }
  return await response.json();
}

const SERVER_PRICING_MAP = {
  'IN': { currency: 'INR', amount: 49, symbol: '₹', gateway: 'cashfree', region: 'India' },
  'US': { currency: 'USD', amount: 1.99, symbol: '$', gateway: 'paypal', region: 'United States' },
  'GB': { currency: 'GBP', amount: 1.49, symbol: '£', gateway: 'paypal', region: 'United Kingdom' },
  'CA': { currency: 'CAD', amount: 2.49, symbol: 'CA$', gateway: 'paypal', region: 'Canada' },
  'AU': { currency: 'AUD', amount: 2.99, symbol: 'A$', gateway: 'paypal', region: 'Australia' },
  'AE': { currency: 'AED', amount: 6.99, symbol: 'AED ', gateway: 'paypal', region: 'UAE' },
  'PK': { currency: 'PKR', amount: 149, symbol: 'PKR ', gateway: 'paypal', region: 'Pakistan' },
  'DEFAULT': { currency: 'USD', amount: 1.99, symbol: '$', gateway: 'paypal', region: 'International' }
};

const SERVER_EUROZONE = ['AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR'];

function getGeoPrice(req) {
  // Check Cloudflare country header
  const cfCountry = req.headers['cf-ipcountry'];
  if (cfCountry && cfCountry !== 'XX') {
    const code = cfCountry.toUpperCase();
    if (code === 'IN') return PRICING_MAP['IN'] || SERVER_PRICING_MAP['IN'];
    if (SERVER_EUROZONE.includes(code)) return { currency: 'EUR', amount: 1.99, symbol: '€', gateway: 'paypal', region: 'Eurozone', plans: DEFAULT_PRICING.plans };
    if (PRICING_MAP[code]) return PRICING_MAP[code];
  }

  // Check client IP
  const xForwardedFor = req.headers['x-forwarded-for'];
  let ip = xForwardedFor ? xForwardedFor.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || '');
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');

  const isLocal = !ip || ip === '127.0.0.1' || ip === '::1' || ip.includes('localhost');
  if (isLocal) {
    const acceptLang = (req.headers['accept-language'] || '').toLowerCase();
    if (acceptLang.includes('in') || acceptLang.includes('hi') || acceptLang.includes('ta') || acceptLang.includes('te')) {
      return SERVER_PRICING_MAP['IN'];
    }
  }

  if (ip && !isLocal) {
    try {
      const geoip = require('geoip-lite');
      const geo = geoip.lookup(ip);
      if (geo && geo.country) {
        const code = geo.country.toUpperCase();
        if (code === 'IN') return SERVER_PRICING_MAP['IN'];
        if (SERVER_EUROZONE.includes(code)) return { currency: 'EUR', amount: 1.99, symbol: '€', gateway: 'paypal', region: 'Eurozone' };
        if (SERVER_PRICING_MAP[code]) return SERVER_PRICING_MAP[code];
      }
    } catch (e) {
      console.warn('geoip lookup warning:', e.message);
    }
  }

  return SERVER_PRICING_MAP['DEFAULT'];
}

// GET /api/payment/detect-price – returns server-computed price for the caller's location
app.get('/api/payment/detect-price', (req, res) => {
  const pricing = getGeoPrice(req);
  res.json({ success: true, ...pricing });
});

// GET /api/premium/check/:websiteId – returns premium status and whether custom URL can be claimed for free
app.get('/api/premium/check/:websiteId', async (req, res) => {
  const { websiteId } = req.params;
  try {
    const mongoReady = await ensureMongoConnected();
    if (!mongoReady) return res.json({ isPremium: false, plan: 'free', canClaimFreeCustomUrl: false });

    const payment = await Payment.findOne({ websiteId, status: 'PAID' }).lean();
    if (!payment) return res.json({ isPremium: false, plan: 'free', canClaimFreeCustomUrl: false });

    const plan = (payment.plan || 'pro').toLowerCase();
    const canClaimFreeCustomUrl = plan !== 'starter' && plan !== 'free';

    res.json({
      isPremium: true,
      plan: payment.plan,
      canClaimFreeCustomUrl
    });
  } catch (e) {
    res.json({ isPremium: false, plan: 'free', canClaimFreeCustomUrl: false });
  }
});

function getPlanMeta(pType, isFreeClaim = false) {
  const norm = (pType || '').toString().toLowerCase().trim();
  if (norm === 'starter' || norm === '100_days' || norm === '100days' || norm.includes('100')) {
    return { plan: 'starter', planName: '100+ Days', planDays: 100 };
  }
  if (norm === 'pro' || norm === '1_year' || norm === '1year' || norm.includes('year')) {
    return { plan: 'pro', planName: '1 Year', planDays: 365 };
  }
  if (norm === 'forever' || norm === 'lifetime' || norm.includes('forev') || norm.includes('life')) {
    return { plan: 'forever', planName: 'Forever', planDays: 99999 };
  }
  if (norm === 'custom_url' || norm === 'custom') {
    return { plan: 'custom_url', planName: 'Custom URL', planDays: 365 };
  }
  return { plan: norm || 'pro', planName: '1 Year', planDays: 365 };
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
          });
        }
      } catch (e) {
        console.error('[Localhost Bypass] DB save warning:', e.message);
      }

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

    const mongoReady = await ensureMongoConnected();
    if (!mongoReady) {
      return res.status(503).json({ error: 'Server temporarily unavailable. Please try again later.' });
    }

    // Check if slug already taken by a PAID payment for a DIFFERENT websiteId
    const existingPaid = await Payment.findOne({ slug: sanitizedSlug, status: 'PAID' }).lean();
    if (existingPaid && existingPaid.websiteId !== websiteId) {
      return res.status(409).json({ error: 'This personalized URL is already taken. Try another.' });
    }

    // 👑 Premium Free Custom URL Claim Bypass
    // If request indicates premium user or $0 amount or user already paid for this websiteId
    let isProOrHigherPaid = false;
    if (websiteId) {
      const paidCheck = await Payment.findOne({ websiteId, status: 'PAID' }).lean();
      if (paidCheck && paidCheck.plan) {
        const normPlan = paidCheck.plan.toLowerCase();
        if (normPlan !== 'starter' && normPlan !== 'free') {
          isProOrHigherPaid = true;
        }
      }
    }

    const clientPlan = (req.body.plan || '').toLowerCase();
    const isClientProOrHigher = (clientPlan === 'pro' || clientPlan === 'pro_plus' || clientPlan === 'proplus' || clientPlan === 'forever' || clientPlan === 'infinity');

    const isFreePremiumClaim = (req.body.isPremium === true && (isProOrHigherPaid || isClientProOrHigher)) || (req.body.amount === 0 && (isProOrHigherPaid || isClientProOrHigher));

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
      });

      const existingSlugRec = await CustomSlug.findOne({ slug: sanitizedSlug }).lean();
      if (!existingSlugRec) {
        await CustomSlug.create({ slug: sanitizedSlug, websiteId });
      }

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

    // Price determined server-side from geo-IP or validated request
    const geoPricing = getGeoPrice(req);
    const { currency, gateway, paypalCurrency, plans } = geoPricing;

    // Normalize plan key
    const rawPlan = (req.body.plan || 'pro').toString().toLowerCase();
    let normPlan = 'pro';
    if (rawPlan === 'starter' || rawPlan.includes('start')) normPlan = 'starter';
    else if (rawPlan === 'pro_plus' || rawPlan === 'proplus' || rawPlan.includes('plus')) normPlan = 'pro_plus';
    else if (rawPlan === 'forever' || rawPlan.includes('forev') || rawPlan.includes('life')) normPlan = 'forever';
    else normPlan = 'pro';

    const defaultPlans = DEFAULT_PRICING.plans;
    const planData = (plans && plans[normPlan]) ? plans[normPlan] : (defaultPlans[normPlan] || defaultPlans.pro);
    
    let amount = (typeof req.body.amount === 'number' && req.body.amount > 0) ? req.body.amount : planData.amount;
    let paypalAmount = planData.paypalAmount || amount;
    if (typeof req.body.amount === 'number' && req.body.amount > 0) {
      paypalAmount = req.body.amount;
    }

    // Upload QR center photo to Cloudinary if provided as base64
    let finalPhotoUrl = qrCenterPhotoUrl || '';
    if (qrCenterPhotoBase64) {
      try {
        finalPhotoUrl = await storage.uploadMedia(qrCenterPhotoBase64, `qr_${sanitizedSlug}.png`, 'image/png', isClientProOrHigher || isProOrHigherPaid);
      } catch (uploadErr) {
        console.error('Error uploading QR center photo:', uploadErr);
      }
    }

    // Check if same user already has a pending/failed order for this slug - cancel old ones
    await Payment.updateMany(
      { websiteId, slug: sanitizedSlug, status: { $in: ['PENDING', 'FAILED'] } },
      { $set: { status: 'CANCELLED' } }
    );

    const orderId = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    // We never ask users for credentials on our site.
    // Cashfree only needs placeholder values to create the order;
    // actual payment details are collected on Cashfree's own checkout screen.
    const customer = customerDetails && customerDetails.customer_phone !== '9999999999'
      ? customerDetails
      : (customerDetails || { customer_name: 'Guest', customer_email: 'guest@thegreeter.in', customer_phone: '9999999999' });
    const orderAmount = amount; // already a number from getGeoPrice()

    const planMeta = getPlanMeta(req.body.plan, false);

    // Create payment record
    const payment = await Payment.create({
      orderId,
      websiteId,
      slug: sanitizedSlug,
      amount: orderAmount,
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
    });

    // ── ROUTE DYNAMICALLY: PAYPAL FOR INTERNATIONAL, CASHFREE FOR INDIA ──
    if (gateway === 'paypal') {
      try {
        const targetPage = req.body.plan ? '/generated/preview.html' : '/generated/custom-url.html';
        const returnUrl = `${req.headers.origin || process.env.SITE_URL || 'https://thegreeter.in'}${targetPage}?action=payment-success&orderId=${orderId}`;
        const cancelUrl = `${req.headers.origin || process.env.SITE_URL || 'https://thegreeter.in'}${targetPage}`;

        console.log(`[PayPal] Creating order ${orderId} for ${paypalAmount} ${paypalCurrency}`);
        const paypalOrder = await createPayPalOrder(paypalAmount, paypalCurrency, returnUrl, cancelUrl);
        const approveLink = paypalOrder.links.find(link => link.rel === 'approve')?.href;

        if (!approveLink) {
          throw new Error('PayPal order created but no approval link returned');
        }

        // Update payment with paypal details and approval link
        await Payment.findByIdAndUpdate(payment._id, {
          paymentLink: approveLink,
          paypalOrderId: paypalOrder.id
        });

        return res.json({
          success: true,
          orderId,
          paymentLink: approveLink,
          paymentSessionId: null,
          amount: paypalAmount,
          currency: paypalCurrency,
          slug: sanitizedSlug,
          gateway: 'paypal'
        });
      } catch (ppErr) {
        console.error('[PayPal Order Create Error]:', ppErr);
        return res.status(502).json({
          success: false,
          error: 'Failed to initiate international payment. Please try again later or contact support.',
          orderId
        });
      }
    }

    // Create order on Cashfree
    const orderPayload = {
      order_id: orderId,
      order_amount: orderAmount.toFixed(2),
      order_currency: currency,
      customer_details: {
        customer_id: websiteId,
        customer_name: customer.customer_name || 'Guest',
        customer_email: customer.customer_email || 'guest@thegreeter.in',
        customer_phone: customer.customer_phone || '9999999999'
      },
      order_meta: {
        return_url: `${req.headers.origin || process.env.SITE_URL || 'https://thegreeter.in'}${req.body.plan ? '/generated/preview.html' : '/generated/custom-url.html'}?action=payment-success&orderId={order_id}`,
        notify_url: `${process.env.API_BASE_URL || 'https://wishing-portal.onrender.com'}/api/payment/webhook`,
        payment_methods: 'cc,dc,upi,nb,app,paylater,emi,applepay'
      }
    };

    let paymentLink = '';
    let cfError = null;
    let cfData = {};
    try {
      const cfRes = await fetch(`${CF_API_BASE}/orders`, {
        method: 'POST',
        headers: cfHeaders(),
        body: JSON.stringify(orderPayload)
      });
      cfData = await cfRes.json();
      console.error('[Cashfree] Status:', cfRes.status, 'Body:', JSON.stringify(cfData));

      if (cfRes.status === 401) {
        return res.status(502).json({
          success: false,
          error: 'Payment gateway authentication failed. Please contact support or try again later.',
          orderId
        });
      }
      if (cfRes.status === 400) {
        return res.status(502).json({
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

    await Payment.findByIdAndUpdate(payment._id, { paymentLink });

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
      return res.status(502).json({
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

    await Payment.findByIdAndUpdate(payment._id, {
      status: newStatus,
      cfPaymentId: payment_id || payment.cfPaymentId,
      cfSignature: signature,
      paidAt: newStatus === 'PAID' ? new Date() : payment.paidAt
    });

    // If payment succeeded, reserve the custom URL
    if (newStatus === 'PAID') {
      const { CustomSlug } = require('./models');
      const existingSlug = await CustomSlug.findOne({ slug: payment.slug }).lean();
      if (!existingSlug) {
        await CustomSlug.create({ slug: payment.slug, websiteId: payment.websiteId });
      }
    }

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
    const mongoReady = await ensureMongoConnected();
    if (!mongoReady) {
      return res.status(503).json({ error: 'Server temporarily unavailable.' });
    }
    const payment = await Payment.findOne({ orderId }).lean();
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // If payment is still PENDING, try to verify with Cashfree directly
    if (payment.status === 'PENDING' && CF_APP_ID && CF_SECRET_KEY) {
      try {
        const cfRes = await fetch(`${CF_API_BASE}/orders/${orderId}`, {
          method: 'GET',
          headers: cfHeaders()
        });
        if (cfRes.ok) {
          const cfData = await cfRes.json();
          const cfStatus = cfData.order_status || cfData.status;
          if (cfStatus === 'PAID' || cfStatus === 'SUCCESS') {
            await Payment.findByIdAndUpdate(payment._id, { status: 'PAID', paidAt: new Date() });
            const { CustomSlug } = require('./models');
            const existingSlug = await CustomSlug.findOne({ slug: payment.slug }).lean();
            if (!existingSlug) {
              await CustomSlug.create({ slug: payment.slug, websiteId: payment.websiteId });
            }
            return res.json({
              status: 'PAID',
              orderId: payment.orderId,
              slug: payment.slug,
              websiteId: payment.websiteId,
              qrCenterText: payment.qrCenterText,
              qrCenterPhotoUrl: payment.qrCenterPhotoUrl
            });
          }
        }
      } catch (verifyErr) {
        console.error('[Payment Verify] Direct Cashfree check failed:', verifyErr.message);
      }
    }

    res.json({
      status: payment.status,
      slug: payment.slug,
      amount: payment.amount,
      currency: payment.currency,
      paymentLink: payment.paymentLink,
      qrCenterType: payment.qrCenterType,
      qrCenterText: payment.qrCenterText,
      qrCenterPhotoUrl: payment.qrCenterPhotoUrl
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
    const mongoReady = await ensureMongoConnected();
    if (!mongoReady) {
      return res.status(503).json({ error: 'Server temporarily unavailable.' });
    }

    // Check if there's a PAID payment for this websiteId
    const paidPayment = await Payment.findOne({
      websiteId,
      status: 'PAID'
    }).lean();

    let isPremium = !!paidPayment;
    let plan = (paidPayment?.plan || 'starter').toLowerCase();

    if (!isPremium) {
      try {
        const site = await Website.findOne({ id: websiteId }).lean();
        if (site && site.isPremium) {
          isPremium = true;
          plan = (site.plan || 'pro').toLowerCase();
        }
      } catch (e) { }
    }

    const canClaimFreeCustomUrl = isPremium && plan !== 'starter' && plan !== 'free';

    res.json({
      isPremium,
      websiteId,
      plan: paidPayment?.plan || (isPremium ? 'pro' : 'free'),
      planName: paidPayment?.planName || (plan === 'starter' ? 'Starter' : 'Pro'),
      canClaimFreeCustomUrl,
      paymentId: paidPayment?.orderId || null,
      slug: paidPayment?.slug || null
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

    const mongoReady = await ensureMongoConnected();
    if (!mongoReady) {
      return res.status(503).json({ error: 'Server temporarily unavailable. Please try again later.' });
    }

    const payment = await Payment.findOne({ orderId }).lean();
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (!payment.paypalOrderId) {
      return res.status(400).json({ error: 'Not a PayPal payment' });
    }

    if (payment.status === 'PAID') {
      return res.json({ success: true, status: 'PAID', slug: payment.slug });
    }

    // Capture the PayPal payment
    console.log(`[PayPal] Capturing order ${payment.paypalOrderId}`);
    const captureResult = await capturePayPalOrder(payment.paypalOrderId);

    if (captureResult.status === 'COMPLETED') {
      // Update payment status
      await Payment.findByIdAndUpdate(payment._id, {
        status: 'PAID',
        paidAt: new Date(),
        paypalCaptureId: captureResult.id
      });

      // Reserve the custom URL
      const { CustomSlug } = require('./models');
      const existingSlug = await CustomSlug.findOne({ slug: payment.slug }).lean();
      if (!existingSlug) {
        await CustomSlug.create({ slug: payment.slug, websiteId: payment.websiteId });
      }

      console.log(`[PayPal] Order ${orderId} captured successfully`);
      return res.json({ success: true, status: 'PAID', slug: payment.slug });
    } else {
      console.error('[PayPal] Capture failed:', captureResult);
      await Payment.findByIdAndUpdate(payment._id, { status: 'FAILED' });
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
    const webhookId = webhookEvent.id;

    // Verify webhook signature (optional but recommended for production)
    // PayPal webhooks can be verified using the webhook ID and certificates

    console.log(`[PayPal Webhook] Received event: ${webhookEvent.event_type}`);

    const mongoReady = await ensureMongoConnected();
    if (!mongoReady) {
      return res.status(503).json({ error: 'Server temporarily unavailable' });
    }

    // Handle different PayPal webhook events
    if (webhookEvent.event_type === 'PAYMENT.CAPTURE.COMPLETED' ||
      webhookEvent.event_type === 'CHECKOUT.ORDER.APPROVED') {

      const purchaseUnits = webhookEvent.resource?.purchase_units;
      if (!purchaseUnits || purchaseUnits.length === 0) {
        console.error('[PayPal Webhook] No purchase units in event');
        return res.status(200).json({ received: true });
      }

      const customId = purchaseUnits[0]?.custom_id;
      const paypalOrderId = webhookEvent.resource?.id;

      // Find payment by PayPal order ID or custom ID
      let payment = await Payment.findOne({ paypalOrderId }).lean();
      if (!payment && customId) {
        payment = await Payment.findOne({ orderId: customId }).lean();
      }

      if (!payment) {
        console.error('[PayPal Webhook] Payment not found for PayPal order:', paypalOrderId);
        return res.status(200).json({ received: true });
      }

      // Update payment status if not already paid
      if (payment.status !== 'PAID') {
        await Payment.findByIdAndUpdate(payment._id, {
          status: 'PAID',
          paidAt: new Date(),
          paypalCaptureId: webhookEvent.id
        });

        // Reserve the custom URL
        const { CustomSlug } = require('./models');
        const existingSlug = await CustomSlug.findOne({ slug: payment.slug }).lean();
        if (!existingSlug) {
          await CustomSlug.create({ slug: payment.slug, websiteId: payment.websiteId });
        }

        console.log(`[PayPal Webhook] Order ${payment.orderId} marked as PAID`);
      }
    } else if (webhookEvent.event_type === 'PAYMENT.CAPTURE.DECLINED' ||
      webhookEvent.event_type === 'CHECKOUT.ORDER.DECLINED') {

      const paypalOrderId = webhookEvent.resource?.id;
      const payment = await Payment.findOne({ paypalOrderId }).lean();

      if (payment && payment.status !== 'FAILED') {
        await Payment.findByIdAndUpdate(payment._id, { status: 'FAILED' });
        console.log(`[PayPal Webhook] Order ${payment.orderId} marked as FAILED`);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[PayPal Webhook Error]:', err);
    res.status(200).json({ received: true }); // Always return 200 to avoid PayPal retries
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

    // Upload to Cloudinary for faster CDN delivery
    const cloudinaryUrl = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: `og-images/${websiteId || slug}`,
          folder: 'og-images',
          resource_type: 'auto',
          overwrite: true,
          context: {
            website_id: websiteId,
            event_type: eventType,
            recipient: recipientName,
            generated_at: new Date().toISOString()
          }
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        }
      );

      uploadStream.end(imageBuffer);
    });

    res.json({
      success: true,
      imageUrl: cloudinaryUrl,
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
    // Use lazy connection instead of checking state
    const connected = await ensureMongoConnected();
    if (!connected) {
      console.log('[Admin] MongoDB not connected, returning fallback response');
      return res.json({ success: true, synced: 0, message: 'MongoDB not connected - sync skipped', fallbackMode: true });
    }

    console.log('[Admin] Starting website sync from Cloudinary...');
    let allResources = [];
    let nextCursor = null;
    do {
      const options = {
        type: 'upload',
        resource_type: 'raw',
        prefix: 'configs/',
        max_results: 500,
        context: true
      };
      if (nextCursor) options.next_cursor = nextCursor;
      const resources = await cloudinary.api.resources(options);
      if (resources.resources && resources.resources.length > 0) {
        allResources.push(...resources.resources);
      }
      nextCursor = resources.next_cursor;
    } while (nextCursor);

    let syncedCount = 0;

    for (const resource of allResources) {
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

    // Use lazy connection instead of checking state
    const connected = await ensureMongoConnected();
    if (!connected) {
      console.log('[Admin] MongoDB not connected, returning fallback dashboard data');
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

// Feedback analytics
app.get('/api/admin/feedback-analytics', adminAuth, async (req, res) => {
  try {
    const connected = await ensureMongoConnected();
    if (!connected) {
      return res.json({
        totalFeedback: 0,
        recentFeedback: [],
        questionStats: {},
        fallbackMode: true,
        message: 'MongoDB not connected'
      });
    }

    const totalFeedback = await Feedback.countDocuments();
    const all = req.query.all === 'true';
    const limit = all ? 0 : 50;
    const recentFeedback = await Feedback.find().sort({ submittedAt: -1 }).limit(limit);

    // Aggregate stats for each question
    const questionStats = {};
    const questions = ['websiteType', 'experience', 'customization', 'feature', 'attractive', 'receiver', 'performance', 'device', 'recommend'];
    for (const q of questions) {
      const stats = await Feedback.aggregate([
        { $group: { _id: `$responses.${q}`, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);
      questionStats[q] = stats.reduce((acc, stat) => { acc[stat._id || 'N/A'] = stat.count; return acc; }, {});
    }

    res.json({
      totalFeedback,
      recentFeedback,
      questionStats,
      fallbackMode: false
    });
  } catch (err) {
    console.error('Feedback analytics error:', err);
    res.status(500).json({ error: 'Failed to load feedback analytics' });
  }
});

// List Cloudinary configs for direct access
app.get('/api/admin/cloudinary-list', adminAuth, async (req, res) => {
  try {
    let allResources = [];
    let nextCursor = null;
    do {
      const options = {
        type: 'upload',
        resource_type: 'raw',
        prefix: 'configs/',
        max_results: 500,
        context: true
      };
      if (nextCursor) options.next_cursor = nextCursor;
      const result = await cloudinary.api.resources(options);
      if (result.resources && result.resources.length > 0) {
        allResources.push(...result.resources);
      }
      nextCursor = result.next_cursor;
    } while (nextCursor);

    const websites = allResources.map(r => ({
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

// Delete a single website and all associated assets & tracking records
app.delete('/api/admin/website/:id', adminAuth, async (req, res) => {
  try {
    const websiteId = req.params.id;
    const force = req.query.force === 'true' || req.body?.force === true;

    if (!websiteId) {
      return res.status(400).json({ error: 'Website ID is required' });
    }

    await ensureMongoConnected();
    const result = await analytics.deleteWebsite(websiteId, force, cloudinary);

    if (!result.success && result.isPremium) {
      return res.status(403).json(result);
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

    await ensureMongoConnected();
    const result = await analytics.bulkDeleteWebsites({
      websiteIds,
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

    const connected = await ensureMongoConnected();
    if (!connected) {
      console.log('[Admin] MongoDB not connected, returning fallback data');
      return res.json({
        period: days,
        kpi: {
          totalSessions: 0,
          organicSearch: 0,
          directTraffic: 0,
          socialMedia: 0,
          referral: 0,
          email: 0,
          paidSearch: 0
        },
        charts: {
          trafficSourceDistribution: {},
          searchEngineDistribution: {},
          topKeywords: {},
          socialPlatforms: {},
          utmCampaigns: [],
          topReferrers: {},
          trafficTrend: []
        },
        recentTraffic: [],
        fallbackMode: true,
        message: 'MongoDB not connected'
      });
    }

    const data = await analytics.getTrafficSourcesData(days);
    res.json(data);
  } catch (err) {
    console.error('Traffic sources analytics error:', err);
    if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError' || err.message.includes('ECONNREFUSED')) {
      res.json({
        period: days,
        kpi: {
          totalSessions: 0,
          organicSearch: 0,
          directTraffic: 0,
          socialMedia: 0,
          referral: 0,
          email: 0,
          paidSearch: 0
        },
        charts: {
          trafficSourceDistribution: {},
          searchEngineDistribution: {},
          topKeywords: {},
          socialPlatforms: {},
          utmCampaigns: [],
          topReferrers: {},
          trafficTrend: []
        },
        recentTraffic: [],
        fallbackMode: true,
        message: 'MongoDB connection failed'
      });
    } else {
      res.status(500).json({ error: 'Failed to load traffic sources data', details: err.message });
    }
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

// Custom URL Payments Analytics
app.get('/api/admin/custom-url-payments', adminAuth, async (req, res) => {
  try {
    const connected = await ensureMongoConnected();
    if (!connected) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const payments = await Payment.find({ status: 'PAID' })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Enrich with website data
    const enrichedPayments = await Promise.all(payments.map(async (payment) => {
      const website = await Website.findOne({ id: payment.websiteId }).lean();
      return {
        ...payment,
        websiteRecipientName: website?.recipientName || 'Unknown',
        websiteEventType: website?.eventType || 'Unknown',
        websiteTemplateName: website?.templateName || 'Unknown'
      };
    }));

    res.json({ payments: enrichedPayments });
  } catch (err) {
    console.error('Error fetching custom URL payments:', err);
    res.status(500).json({ error: 'Failed to fetch payment data' });
  }
});

// Personalise URL Clicks Analytics
app.get('/api/admin/personalise-url-clicks', adminAuth, async (req, res) => {
  try {
    const connected = await ensureMongoConnected();
    if (!connected) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    console.log('[Admin] Fetching personalise URL clicks...');
    const rawClicks = await Event.find({
      $or: [
        { type: 'personalise_url_click' },
        { 'details.action': 'clicked_personalise_url_button' }
      ]
    })
      .sort({ timestamp: -1 })
      .limit(1000)
      .lean();

    // Calculate unique sites clicked
    const uniqueSiteSet = new Set();
    rawClicks.forEach(click => {
      const wId = click.websiteId || click.details?.websiteId;
      if (wId) {
        uniqueSiteSet.add(wId);
      }
    });

    const totalWebsites = await Website.countDocuments();
    const uniqueClickers = uniqueSiteSet.size;

    console.log(`[Admin] Found ${rawClicks.length} raw click events across ${uniqueClickers} unique site clickers (Total sites: ${totalWebsites})`);

    // Enrich all clicks with website & payment data
    const enrichedClicks = await Promise.all(rawClicks.map(async (click) => {
      const wId = click.websiteId || click.details?.websiteId || null;
      const [website, payment] = await Promise.all([
        wId ? Website.findOne({ id: wId }).lean() : null,
        wId ? Payment.findOne({ websiteId: wId, status: 'PAID' }).lean() : null
      ]);

      return {
        ...click,
        websiteId: wId || click.visitorId || '--',
        websiteRecipientName: website?.recipientName || 'Unknown',
        websiteEventType: website?.eventType || 'Unknown',
        websiteTemplateName: website?.templateName || 'Unknown',
        isPaid: !!payment,
        paymentAmount: payment ? `${payment.currency || 'USD'} ${payment.amount || 0}` : null
      };
    }));

    res.json({
      clicks: enrichedClicks,
      totalClicks: rawClicks.length,
      uniqueClickers,
      totalWebsites
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

// Search YouTube
app.get('/api/search-youtube', async (req, res) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) return res.json({ results: [] });

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YouTube API key not configured');
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=8&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`YouTube search failed: ${response.status}`);
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

// Catch-all route for custom URL slugs - must come BEFORE static middleware
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

  try {
    const mongoReady = await ensureMongoConnected();
    if (mongoReady) {
      let entry = await CustomSlug.findOne({ slug }).lean();

      if (!entry) {
        const paidPayment = await Payment.findOne({ slug: slug, status: 'PAID' }).lean();
        if (paidPayment) {
          entry = { slug: paidPayment.slug, websiteId: paidPayment.websiteId };
        }
      }

      if (entry) {
        console.log(`[CustomURL] Redirecting slug "${slug}" to websiteId "${entry.websiteId}"`);
        // _v=c tells the generated page this is a paid custom URL visit (clean layout) —
        // the page will suppress the nudge popup and CTA section for a cleaner experience.
        return res.redirect(`/generated/customize.html?view=${entry.websiteId}&_v=c`);
      } else {
        console.log(`[CustomURL] Slug "${slug}" not found in DB`);
      }
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

    // 2. Clean up expired free website entries in MongoDB (older than 36h)
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