const express = require('express');

const cors = require('cors');

const dotenv = require('dotenv');

const path = require('path');

const fs = require('fs');

const multer = require('multer');

const https = require('https');

const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const { Website, Feedback, CustomSlug, Payment } = require('./models');
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

const PORT = process.env.PORT || 3000;



// CORS configuration
const corsOptions = {
  origin: [
    'https://thegreeter.in',
    'https://wishing-portal.onrender.com',
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

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://checkout.razorpay.com", "https://cdn.cashfree.com", "https://www.paypal.com", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://pagead2.googlesyndication.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.cashfree.com", "https://api-m.paypal.com", "https://api-m.sandbox.paypal.com"],
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

app.use(express.json({ limit: '10mb' })); // Reduced from 100mb to 10mb



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
  'api','assets','generated','blog','admin','create','index','share','privacy',
  'terms','contactus','whygreeter','templates','uploads','ping','testme',
  'favicon.ico','sitemap.xml','robots.txt','crossdomain.xml'
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
  US: { currency: 'USD', amount: 1.99, symbol: '$', paypalCurrency: 'USD', paypalAmount: 1.99, countryName: 'United States' },
  CA: { currency: 'CAD', amount: 2.49, symbol: 'CA$', paypalCurrency: 'CAD', paypalAmount: 2.49, countryName: 'Canada' },
  GB: { currency: 'GBP', amount: 1.79, symbol: '£', paypalCurrency: 'GBP', paypalAmount: 1.79, countryName: 'United Kingdom' },
  AU: { currency: 'AUD', amount: 2.99, symbol: 'A$', paypalCurrency: 'AUD', paypalAmount: 2.99, countryName: 'Australia' },
  NZ: { currency: 'NZD', amount: 2.99, symbol: 'NZ$', paypalCurrency: 'NZD', paypalAmount: 2.99, countryName: 'New Zealand' },
  SG: { currency: 'SGD', amount: 2.49, symbol: 'S$', paypalCurrency: 'SGD', paypalAmount: 2.49, countryName: 'Singapore' },
  JP: { currency: 'JPY', amount: 250, symbol: '¥', paypalCurrency: 'JPY', paypalAmount: 250, countryName: 'Japan' },
  KR: { currency: 'KRW', amount: 2500, symbol: '₩', paypalCurrency: 'USD', paypalAmount: 1.80, countryName: 'South Korea' },
  HK: { currency: 'HKD', amount: 15, symbol: 'HK$', paypalCurrency: 'HKD', paypalAmount: 15, countryName: 'Hong Kong' },
  TW: { currency: 'TWD', amount: 59, symbol: 'NT$', paypalCurrency: 'TWD', paypalAmount: 59, countryName: 'Taiwan' },
  AE: { currency: 'AED', amount: 6.99, symbol: 'AED ', paypalCurrency: 'USD', paypalAmount: 1.90, countryName: 'UAE' },
  SA: { currency: 'SAR', amount: 6.99, symbol: 'SAR ', paypalCurrency: 'USD', paypalAmount: 1.86, countryName: 'Saudi Arabia' },
  QA: { currency: 'QAR', amount: 6.99, symbol: 'QAR ', paypalCurrency: 'USD', paypalAmount: 1.92, countryName: 'Qatar' },
  KW: { currency: 'KWD', amount: 0.60, symbol: 'KWD ', paypalCurrency: 'USD', paypalAmount: 1.95, countryName: 'Kuwait' },
  OM: { currency: 'OMR', amount: 0.60, symbol: 'OMR ', paypalCurrency: 'USD', paypalAmount: 1.56, countryName: 'Oman' },
  BH: { currency: 'BHD', amount: 0.60, symbol: 'BHD ', paypalCurrency: 'USD', paypalAmount: 1.59, countryName: 'Bahrain' },
  IL: { currency: 'ILS', amount: 7.90, symbol: '₪', paypalCurrency: 'ILS', paypalAmount: 7.90, countryName: 'Israel' },
  IN: { currency: 'INR', amount: 29, symbol: '₹', paypalCurrency: 'INR', paypalAmount: 29, countryName: 'India' },
  PK: { currency: 'PKR', amount: 199, symbol: 'PKR ', paypalCurrency: 'USD', paypalAmount: 1.00, countryName: 'Pakistan' },
  BD: { currency: 'BDT', amount: 99, symbol: '৳', paypalCurrency: 'USD', paypalAmount: 1.00, countryName: 'Bangladesh' },
  NP: { currency: 'NPR', amount: 99, symbol: 'NPR ', paypalCurrency: 'USD', paypalAmount: 1.00, countryName: 'Nepal' },
  LK: { currency: 'LKR', amount: 299, symbol: 'LKR ', paypalCurrency: 'USD', paypalAmount: 1.00, countryName: 'Sri Lanka' },
  MY: { currency: 'MYR', amount: 4.90, symbol: 'RM', paypalCurrency: 'MYR', paypalAmount: 4.90, countryName: 'Malaysia' },
  TH: { currency: 'THB', amount: 39, symbol: '฿', paypalCurrency: 'THB', paypalAmount: 39, countryName: 'Thailand' },
  ID: { currency: 'IDR', amount: 15000, symbol: 'Rp', paypalCurrency: 'USD', paypalAmount: 1.00, countryName: 'Indonesia' },
  PH: { currency: 'PHP', amount: 59, symbol: '₱', paypalCurrency: 'PHP', paypalAmount: 59, countryName: 'Philippines' },
  VN: { currency: 'VND', amount: 25000, symbol: '₫', paypalCurrency: 'USD', paypalAmount: 1.00, countryName: 'Vietnam' },
  BR: { currency: 'BRL', amount: 6.90, symbol: 'R$', paypalCurrency: 'BRL', paypalAmount: 6.90, countryName: 'Brazil' },
  MX: { currency: 'MXN', amount: 25, symbol: 'MX$', paypalCurrency: 'MXN', paypalAmount: 25, countryName: 'Mexico' },
  AR: { currency: 'ARS', amount: 1999, symbol: 'ARS ', paypalCurrency: 'USD', paypalAmount: 1.99, countryName: 'Argentina' },
  CL: { currency: 'CLP', amount: 1200, symbol: 'CLP ', paypalCurrency: 'USD', paypalAmount: 1.49, countryName: 'Chile' },
  CO: { currency: 'COP', amount: 5900, symbol: 'COP ', paypalCurrency: 'USD', paypalAmount: 1.49, countryName: 'Colombia' },
  ZA: { currency: 'ZAR', amount: 25, symbol: 'R', paypalCurrency: 'USD', paypalAmount: 1.49, countryName: 'South Africa' },
  NG: { currency: 'NGN', amount: 1200, symbol: '₦', paypalCurrency: 'USD', paypalAmount: 1.00, countryName: 'Nigeria' },
  EG: { currency: 'EGP', amount: 39, symbol: 'EGP ', paypalCurrency: 'USD', paypalAmount: 1.00, countryName: 'Egypt' }
};

const EUROZONE = ['AT','BE','CY','EE','FI','FR','DE','GR','IE','IT','LV','LT','LU','MT','NL','PT','SK','SI','ES','HR'];

function getGeoPrice(req) {
  try {
    const geoip = require('geoip-lite');
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket && req.socket.remoteAddress) || req.ip || '127.0.0.1';
    const cleanIP = ip.replace('::ffff:', '').replace('::1', '127.0.0.1');
    const geo = geoip.lookup(cleanIP);
    const code = (geo ? geo.country : 'IN').toUpperCase();

    if (code === 'IN') {
      return { currency: 'INR', amount: 29, symbol: '₹', gateway: 'cashfree', countryName: 'India', country: code };
    }
    
    if (EUROZONE.includes(code)) {
      return { currency: 'EUR', amount: 1.99, symbol: '€', gateway: 'paypal', paypalCurrency: 'EUR', paypalAmount: 1.99, countryName: 'Eurozone', country: code };
    }

    if (PRICING_MAP[code]) {
      const p = PRICING_MAP[code];
      return { 
        currency: p.currency, 
        amount: p.amount, 
        symbol: p.symbol, 
        gateway: 'paypal', 
        paypalCurrency: p.paypalCurrency, 
        paypalAmount: p.paypalAmount, 
        countryName: p.countryName, 
        country: code 
      };
    }

    // Default other countries
    return { currency: 'USD', amount: 1.49, symbol: '$', gateway: 'paypal', paypalCurrency: 'USD', paypalAmount: 1.49, countryName: 'International', country: code };
  } catch (err) {
    console.error('[getGeoPrice] error:', err);
    return { currency: 'INR', amount: 29, symbol: '₹', gateway: 'cashfree', countryName: 'India', country: 'IN' };
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

// GET /api/payment/detect-price – returns server-computed price for the caller's location
app.get('/api/payment/detect-price', (req, res) => {
  const pricing = getGeoPrice(req);
  res.json({ success: true, ...pricing });
});

// POST /api/payment/create-order
// Body: { websiteId, slug, amount, currency, customerDetails?, qrCenterType, qrCenterText?, qrCenterPhotoUrl? }
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { websiteId, slug, customerDetails, qrCenterType, qrCenterText, qrCenterPhotoUrl, qrCenterPhotoBase64 } = req.body;

    // Input validation
    if (!websiteId || typeof websiteId !== 'string' || websiteId.length > 100) {
      return res.status(400).json({ error: 'Invalid websiteId' });
    }
    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'slug is required' });
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

    // Price determined server-side from geo-IP — never trusted from client
    const { currency, amount, gateway, paypalCurrency, paypalAmount } = getGeoPrice(req);

    const sanitizedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

    if (sanitizedSlug.length < 3 || sanitizedSlug.length > 30) {
      return res.status(400).json({ error: 'Slug must be 3-30 characters' });
    }

    const mongoReady = await ensureMongoConnected();
    if (!mongoReady) {
      return res.status(503).json({ error: 'Server temporarily unavailable. Please try again later.' });
    }

    // Check if slug already taken by a PAID payment
    const existingPaid = await Payment.findOne({ slug: sanitizedSlug, status: 'PAID' }).lean();
    if (existingPaid) {
      return res.status(409).json({ error: 'This personalized URL is already taken. Try another.' });
    }

    // Upload QR center photo to Cloudinary if provided as base64
    let finalPhotoUrl = qrCenterPhotoUrl || '';
    if (qrCenterPhotoBase64) {
      try {
        const uploadResult = await cloudinary.uploader.upload(qrCenterPhotoBase64, {
          folder: 'qr-centers',
          resource_type: 'image'
        });
        finalPhotoUrl = uploadResult.secure_url;
      } catch (uploadErr) {
        console.error('Error uploading QR center photo to Cloudinary:', uploadErr);
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

    // Create payment record
    const payment = await Payment.create({
      orderId,
      websiteId,
      slug: sanitizedSlug,
      amount: orderAmount,
      currency,
      status: 'PENDING',
      gateway,
      customerDetails: customer,
      qrCenterType: qrCenterType || 'none',
      qrCenterText: qrCenterText || '',
      qrCenterPhotoUrl: finalPhotoUrl || '',
      metadata: { source: req.headers['user-agent'] || 'web' }
    });

    // ── ROUTE DYNAMICALLY: PAYPAL FOR INTERNATIONAL, CASHFREE FOR INDIA ──
    if (gateway === 'paypal') {
      try {
        const returnUrl = `${req.headers.origin || process.env.SITE_URL || 'https://thegreeter.in'}/generated/custom-url.html?action=payment-success&orderId=${orderId}`;
        const cancelUrl = `${req.headers.origin || process.env.SITE_URL || 'https://thegreeter.in'}/generated/custom-url.html`;
        
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
        return_url: `${req.headers.origin || process.env.SITE_URL || 'https://thegreeter.in'}/generated/custom-url.html?action=payment-success&orderId={order_id}`,
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
        slug: sanitizedSlug
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
      slug: sanitizedSlug
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
              slug: payment.slug,
              amount: payment.amount,
              currency: payment.currency,
              paymentLink: payment.paymentLink,
              qrCenterType: payment.qrCenterType,
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

app.post('/api/analytics/event', analyticsLimiter, async (req, res) => {
  try {
    await ensureMongoConnected();
    await analytics.trackEvent(req, req.body);
    res.status(204).end();
  } catch (e) { res.status(204).end(); }
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

// Delete Cloudinary config and all related assets
app.delete('/api/admin/cloudinary-delete', adminAuth, async (req, res) => {
  try {
    const { publicId } = req.body;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    // Validate that the publicId is in the configs folder
    if (!publicId.startsWith('configs/')) {
      return res.status(400).json({ error: 'Invalid public ID format' });
    }

    const websiteId = publicId.replace('configs/', '');
    console.log('[Server] Starting comprehensive deletion for website:', websiteId);

    const deletionResults = {
      cloudinary: { config: false, images: [] },
      mongodb: { website: false, events: 0, feedback: 0, customSlug: false, payments: 0 }
    };

    // 1. Delete main config from Cloudinary
    try {
      const result = await cloudinary.api.delete_resources([publicId], {
        resource_type: 'raw',
        type: 'upload'
      });
      console.log('[Server] Cloudinary config delete result:', result);
      deletionResults.cloudinary.config = true;
    } catch (cloudErr) {
      console.error('[Server] Cloudinary config deletion failed:', cloudErr);
    }

    // 2. Delete related Cloudinary images (QR center photos, etc.)
    try {
      // Search for images that might be related to this website
      // We'll search by context if available, or by folder patterns
      const imageSearch = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        prefix: 'qr-centers/',
        max_results: 500,
        context: true
      });

      // Filter images that might be related to this website
      // This is a best-effort approach since we don't have direct linking
      const relatedImages = imageSearch.resources.filter(img => {
        // Check if context contains the website ID
        if (img.context && img.context.custom) {
          return Object.values(img.context.custom).some(val => 
            val && val.toString().includes(websiteId)
          );
        }
        // Check if public_id contains the website ID
        return img.public_id.includes(websiteId);
      });

      if (relatedImages.length > 0) {
        const imageIds = relatedImages.map(img => img.public_id);
        const imageDeleteResult = await cloudinary.api.delete_resources(imageIds, {
          resource_type: 'image',
          type: 'upload'
        });
        console.log('[Server] Deleted related images:', imageIds);
        deletionResults.cloudinary.images = imageIds;
      }
    } catch (imageErr) {
      console.warn('[Server] Image deletion failed (non-critical):', imageErr);
    }

    // 3. Delete all MongoDB records related to this website
    try {
      await ensureMongoConnected();

      // Delete website record
      const websiteDelete = await Website.deleteOne({ id: websiteId });
      deletionResults.mongodb.website = websiteDelete.deletedCount > 0;

      // Delete all tracking events
      const eventsDelete = await Event.deleteMany({ websiteId });
      deletionResults.mongodb.events = eventsDelete.deletedCount;

      // Delete all feedback
      const feedbackDelete = await Feedback.deleteMany({ websiteId });
      deletionResults.mongodb.feedback = feedbackDelete.deletedCount;

      // Delete custom slug if exists
      const slugDelete = await CustomSlug.deleteOne({ websiteId });
      deletionResults.mongodb.customSlug = slugDelete.deletedCount > 0;

      // Delete payment records (keep for audit, or delete based on preference)
      // For now, we'll keep payment records for audit purposes but mark them
      const paymentUpdate = await Payment.updateMany(
        { websiteId },
        { $set: { status: 'WEBSITE_DELETED', 'metadata.deletedAt': new Date(), 'metadata.deletionReason': 'Website deleted by admin' } }
      );
      deletionResults.mongodb.payments = paymentUpdate.modifiedCount;

      console.log('[Server] MongoDB deletion results:', deletionResults.mongodb);
    } catch (mongoErr) {
      console.error('[Server] MongoDB deletion failed:', mongoErr);
    }

    console.log('[Server] Comprehensive deletion completed:', deletionResults);
    res.json({ 
      success: true, 
      message: 'Website and all related data deleted successfully',
      details: deletionResults
    });
  } catch (err) {
    console.error('Comprehensive delete error:', err);
    res.status(500).json({ error: 'Failed to delete website and related data' });
  }
});

// Bulk delete websites with age filtering and premium protection
app.delete('/api/admin/cloudinary-bulk-delete', adminAuth, async (req, res) => {
  try {
    const { publicIds, ageFilter, protectPremium } = req.body;
    
    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return res.status(400).json({ error: 'Public IDs array is required' });
    }

    console.log('[Server] Starting bulk deletion for', publicIds.length, 'websites');
    console.log('[Server] Age filter:', ageFilter, 'Protect premium:', protectPremium);

    const results = {
      totalRequested: publicIds.length,
      skipped: [],
      deleted: [],
      errors: []
    };

    // Get premium websites if protection is enabled
    let premiumWebsiteIds = new Set();
    if (protectPremium) {
      try {
        await ensureMongoConnected();
        const paidPayments = await Payment.find({ 
          status: 'PAID',
          websiteId: { $in: publicIds.map(id => id.replace('configs/', '')) }
        }).select('websiteId');
        premiumWebsiteIds = new Set(paidPayments.map(p => p.websiteId));
        console.log('[Server] Found', premiumWebsiteIds.size, 'premium websites to protect');
      } catch (mongoErr) {
        console.warn('[Server] Failed to fetch premium websites:', mongoErr);
      }
    }

    // Process each website
    for (const publicId of publicIds) {
      try {
        const websiteId = publicId.replace('configs/', '');

        // Check age filter
        if (ageFilter && ageFilter !== 'all') {
          try {
            const website = await Website.findOne({ id: websiteId });
            let createdAt = website?.createdAt;

            // Fallback: find the createdAt from the publicId in the Cloudinary list
            // (it was passed in publicIds so it exists in Cloudinary)
            if (!createdAt) {
              // Try to get it from Cloudinary resource directly
              try {
                const cloudRes = await cloudinary.api.resource(publicId, { resource_type: 'raw' });
                createdAt = cloudRes.created_at;
              } catch (cloudResErr) {
                console.warn('[Server] Could not fetch resource details for age check:', websiteId);
              }
            }

            if (!createdAt) {
              // No date available at all — allow deletion
              console.warn('[Server] No createdAt found for', websiteId, '- skipping age filter');
            } else {
              const ageInDays = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
              const minAge = parseInt(ageFilter);
              
              if (ageInDays < minAge) {
                results.skipped.push({ publicId, reason: `Website is only ${ageInDays.toFixed(1)} days old (minimum: ${minAge} days)` });
                continue;
              }
            }
          } catch (ageErr) {
            console.warn('[Server] Age check failed for', websiteId, ':', ageErr);
          }
        }

        // Check premium protection
        if (protectPremium && premiumWebsiteIds.has(websiteId)) {
          results.skipped.push({ publicId, reason: 'Premium website (protected)' });
          continue;
        }

        // Perform comprehensive deletion
        const deletionResults = await deleteWebsiteComprehensive(publicId, websiteId);
        results.deleted.push({ publicId, details: deletionResults });

      } catch (err) {
        console.error('[Server] Failed to delete', publicId, ':', err);
        results.errors.push({ publicId, error: err.message });
      }
    }

    console.log('[Server] Bulk deletion completed:', results);
    res.json({ 
      success: true, 
      message: `Deleted ${results.deleted.length} websites, skipped ${results.skipped.length}, errors ${results.errors.length}`,
      results
    });
  } catch (err) {
    console.error('Bulk delete error:', err);
    res.status(500).json({ error: 'Failed to perform bulk deletion' });
  }
});

// Helper function for comprehensive website deletion
async function deleteWebsiteComprehensive(publicId, websiteId) {
  const deletionResults = {
    cloudinary: { config: false, images: [] },
    mongodb: { website: false, events: 0, feedback: 0, customSlug: false, payments: 0 }
  };

  // Delete main config from Cloudinary
  try {
    await cloudinary.api.delete_resources([publicId], {
      resource_type: 'raw',
      type: 'upload'
    });
    deletionResults.cloudinary.config = true;
  } catch (cloudErr) {
    console.error('[Server] Cloudinary config deletion failed:', cloudErr);
  }

  // Delete related Cloudinary images
  try {
    const imageSearch = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      prefix: 'qr-centers/',
      max_results: 500,
      context: true
    });

    const relatedImages = imageSearch.resources.filter(img => {
      if (img.context && img.context.custom) {
        return Object.values(img.context.custom).some(val => 
          val && val.toString().includes(websiteId)
        );
      }
      return img.public_id.includes(websiteId);
    });

    if (relatedImages.length > 0) {
      const imageIds = relatedImages.map(img => img.public_id);
      await cloudinary.api.delete_resources(imageIds, {
        resource_type: 'image',
        type: 'upload'
      });
      deletionResults.cloudinary.images = imageIds;
    }
  } catch (imageErr) {
    console.warn('[Server] Image deletion failed (non-critical):', imageErr);
  }

  // Delete MongoDB records
  try {
    await ensureMongoConnected();

    const websiteDelete = await Website.deleteOne({ id: websiteId });
    deletionResults.mongodb.website = websiteDelete.deletedCount > 0;

    const eventsDelete = await Event.deleteMany({ websiteId });
    deletionResults.mongodb.events = eventsDelete.deletedCount;

    const feedbackDelete = await Feedback.deleteMany({ websiteId });
    deletionResults.mongodb.feedback = feedbackDelete.deletedCount;

    const slugDelete = await CustomSlug.deleteOne({ websiteId });
    deletionResults.mongodb.customSlug = slugDelete.deletedCount > 0;

    const paymentUpdate = await Payment.updateMany(
      { websiteId },
      { $set: { status: 'WEBSITE_DELETED', 'metadata.deletedAt': new Date(), 'metadata.deletionReason': 'Bulk deleted by admin' } }
    );
    deletionResults.mongodb.payments = paymentUpdate.modifiedCount;

  } catch (mongoErr) {
    console.error('[Server] MongoDB deletion failed:', mongoErr);
  }

  return deletionResults;
}

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
    const clicks = await Event.find({ type: 'personalise_url_click' })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    
    console.log('[Admin] Found clicks:', clicks.length);

    // Enrich with website data
    const enrichedClicks = await Promise.all(clicks.map(async (click) => {
      const website = await Website.findOne({ id: click.websiteId }).lean();
      return {
        ...click,
        websiteRecipientName: website?.recipientName || 'Unknown',
        websiteEventType: website?.eventType || 'Unknown',
        websiteTemplateName: website?.templateName || 'Unknown'
      };
    }));

    res.json({ clicks: enrichedClicks });
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

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});