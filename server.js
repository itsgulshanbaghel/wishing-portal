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



// Serve static files from the 'public' directory

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));



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
    'x-api-version': '2022-09-01'
  };
}

// GET /api/payment/detect-price
// Detects client geo location and returns appropriate price
app.get('/api/payment/detect-price', (req, res) => {
  try {
    const geoip = require('geoip-lite');
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || req.ip || '127.0.0.1';
    const cleanIP = ip.replace('::ffff:', '').replace('::1', '127.0.0.1');
    const geo = geoip.lookup(cleanIP);
    const country = geo ? geo.country : 'IN';

    const code = country.toUpperCase();
    let result = { currency: 'INR', amount: 29, symbol: '₹', countryName: 'India' };

    if (code !== 'IN') {
      const euroZone = ['AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR'];
      if (euroZone.includes(code)) {
        result = { currency: 'EUR', amount: 0.99, symbol: '€', countryName: 'Europe' };
      } else if (code === 'GB') {
        result = { currency: 'GBP', amount: 0.99, symbol: '£', countryName: 'United Kingdom' };
      } else if (code === 'US') {
        result = { currency: 'USD', amount: 0.99, symbol: '$', countryName: 'United States' };
      } else if (code === 'AU' || code === 'NZ') {
        result = { currency: 'AUD', amount: 1.49, symbol: 'A$', countryName: 'Australia & NZ' };
      } else {
        result = { currency: 'USD', amount: 0.99, symbol: '$', countryName: 'Rest of World' };
      }
    }

    res.json({ success: true, ip: cleanIP, country, ...result });
  } catch (err) {
    console.error('Error detecting geo price:', err);
    res.json({ success: true, country: 'IN', currency: 'INR', amount: 29, symbol: '₹', countryName: 'India' });
  }
});

// POST /api/payment/create-order
// Body: { websiteId, slug, amount, currency, customerDetails?, qrCenterType, qrCenterText?, qrCenterPhotoUrl? }
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { websiteId, slug, amount, currency, customerDetails, qrCenterType, qrCenterText, qrCenterPhotoUrl, qrCenterPhotoBase64 } = req.body;

    if (!websiteId || !slug || !amount) {
      return res.status(400).json({ error: 'websiteId, slug and amount are required' });
    }

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
    const customer = customerDetails || { customer_name: 'Guest', customer_email: 'guest@thegreeter.in', customer_phone: '9999999999' };
    const orderAmount = Number(amount);

    // Create payment record
    const payment = await Payment.create({
      orderId,
      websiteId,
      slug: sanitizedSlug,
      amount: orderAmount,
      currency: currency || 'INR',
      status: 'PENDING',
      customerDetails: customer,
      qrCenterType: qrCenterType || 'none',
      qrCenterText: qrCenterText || '',
      qrCenterPhotoUrl: finalPhotoUrl || '',
      metadata: { source: req.headers['user-agent'] || 'web' }
    });

    // Create order on Cashfree
    const orderPayload = {
      order_id: orderId,
      order_amount: orderAmount,
      order_currency: currency || 'INR',
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
    try {
      const cfRes = await fetch(`${CF_API_BASE}/orders`, {
        method: 'POST',
        headers: cfHeaders(),
        body: JSON.stringify(orderPayload)
      });
      const cfData = await cfRes.json();
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

    if (!order_id) {
      return res.status(200).json({ received: true });
    }

    const mongoReady = await ensureMongoConnected();
    if (!mongoReady) {
      return res.status(200).json({ received: true });
    }

    // Find the payment record
    const payment = await Payment.findOne({ orderId: order_id }).lean();
    if (!payment) {
      return res.status(200).json({ received: true });
    }

    let newStatus = payment.status;

    // Handle both old and new Cashfree webhook event names
    if (event === 'PAYMENT_SUCCESS_WEBHOOK' || event === 'ORDER_PAID' || event === 'success payment') {
      newStatus = 'PAID';
    } else if (event === 'PAYMENT_FAILED_WEBHOOK' || event === 'PAYMENT_CANCELLED' || event === 'PAYMENT_DECLINED' || event === 'failed payment') {
      newStatus = 'FAILED';
    } else if (event === 'ORDER_CANCELLED' || event === 'user dropped payment') {
      newStatus = 'CANCELLED';
    } else if (event === 'ORDER_EXPIRED') {
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

    console.log(`[Webhook] Order ${order_id} status updated to ${newStatus}`);
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

app.get('/:path', async (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();

  const slug = req.params.path;

  try {
    const mongoReady = await ensureMongoConnected();
    if (mongoReady) {
      const entry = await CustomSlug.findOne({ slug }).lean();
      if (entry) {
        return res.redirect(`/generated/customize.html?view=${entry.websiteId}`);
      }
    }
  } catch (dbErr) {
    console.error('[CustomURL] lookup failed:', dbErr);
  }

  const filePath = path.join(__dirname, 'public', req.path);
  if (req.path.endsWith('/')) {
    return res.sendFile(path.join(filePath, 'index.html'), err => { if (err) next(); });
  }
  if (!path.extname(req.path)) {
    return res.sendFile(filePath + '.html', err => {
      if (err) res.status(404).send('Not found');
    });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});