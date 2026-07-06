# OG Preview System - Setup & Testing Guide

## Prerequisites

✅ **Already Installed**
- Node.js and npm
- Express.js
- Cloudinary account and credentials
- MongoDB (optional, for analytics)

✅ **New Dependencies Added**
- `sharp` - Image processing (installed)
- `canvas` - Canvas rendering (installed)

## Environment Variables

Make sure your `.env` file includes:

```env
# Cloudinary Configuration (Required)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Optional
BASE_URL=https://thegreeter.in
NODE_ENV=production
PORT=3000

# Existing variables (keep these)
MONGODB_URI=...
GROQ_API_KEY_1=...
GROQ_API_KEY_2=...
```

## Verify Installation

### Check Dependencies

```bash
cd d:\wishing-portal
npm list sharp canvas
```

Expected output:
```
wishing-portal@1.0.0
├── canvas@2.x.x
└── sharp@0.x.x
```

### Start Server

```bash
npm start
```

Look for messages:
```
[Server] Connected to MongoDB Atlas
[Server] Server running on port 3000
```

## Testing

### Test 1: OG Image Generation

**Method 1: Browser Console**

Open DevTools on any page and run:

```javascript
fetch('/api/og-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    websiteId: 'test-' + Date.now(),
    recipientName: 'Ananya',
    eventType: 'Birthday',
    creatorName: 'John',
    mood: 'happy',
    message: 'Wishing you all the happiness and success in the world!'
  })
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    console.log('✓ OG Image Generated!');
    console.log('Image URL:', data.imageUrl);
    // Open image in new tab to verify
    window.open(data.imageUrl);
  } else {
    console.error('✗ Error:', data.error);
  }
})
.catch(err => console.error('✗ Request failed:', err))
```

**Method 2: cURL**

```bash
curl -X POST http://localhost:3000/api/og-image \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "test-123",
    "recipientName": "Ananya",
    "eventType": "Birthday",
    "creatorName": "John",
    "mood": "happy",
    "message": "Happy Birthday Ananya!"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/your-cloud/image/upload/og-images/test-123.png",
  "localPath": "/uploads/og-images/test-123-og-1234567890.png",
  "websiteId": "test-123"
}
```

### Test 2: Meta Tag Generation

**Browser Console:**

```javascript
fetch('/api/og-meta', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipientName: 'Ananya',
    eventType: 'Birthday',
    creatorName: 'John',
    message: 'Wishing you all the happiness!',
    websiteUrl: 'https://thegreeter.in/happy-birthday-ananya'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✓ Meta Tags Generated!');
  console.table(data.meta);
})
.catch(err => console.error('✗ Error:', err))
```

**Expected Response:**
```json
{
  "success": true,
  "meta": {
    "title": "Happy Birthday Ananya 💝",
    "description": "🎂 Happy Birthday Ananya! A special wish from John. \"Wishing you all the happiness...\"",
    "type": "website",
    "url": "https://thegreeter.in/happy-birthday-ananya",
    "siteName": "TheGreeter"
  }
}
```

### Test 3: Share Page Integration

1. **Create a test website**
   - Go to: https://localhost:3000/create.html
   - Fill in form (or use existing data)
   - Submit to go to customize page
   - Note the `view=` ID in URL

2. **Check meta tags on share page**
   - Go to: https://localhost:3000/generated/share.html?view=abc123
   - Open DevTools → Elements
   - Search for: `og:title`, `og:image`, `og:description`
   - Verify tags are populated

3. **Inspect network requests**
   - Open DevTools → Network tab
   - Filter by: `api`
   - Look for `/api/og-meta/{id}` request
   - Verify response contains meta tags

### Test 4: Social Media Preview

Test how your links look when shared:

**WhatsApp:**
- Send link in chat
- Preview should show the OG image and title

**Facebook:**
- Use: https://developers.facebook.com/tools/debug
- Enter your share URL
- Should show: Image, title, description

**Twitter:**
- Use: https://cards-dev.twitter.com/validator
- Enter your share URL
- Should show: Twitter card preview

**Telegram:**
- Send link to self or test bot
- Should show image and summary

## Common Issues & Solutions

### Issue: "Canvas binding failed"

**Cause:** Canvas native bindings not built

**Solution:**
```bash
npm rebuild canvas
```

**Alternative:** If issues persist, canvas is optional - OG image generation will gracefully degrade

### Issue: Cloudinary upload fails

**Cause:** Invalid credentials

**Solution:**
1. Verify `.env` variables:
   ```bash
   echo %CLOUDINARY_CLOUD_NAME%  # Windows
   echo $CLOUDINARY_CLOUD_NAME   # Mac/Linux
   ```

2. Test Cloudinary connection:
   ```javascript
   fetch('/api/config', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       html: '<h1>Test</h1>',
       config: { eventType: 'Birthday' }
     })
   })
   .then(r => r.json())
   .then(d => console.log(d))
   ```

3. Check Cloudinary dashboard:
   - Login at: https://cloudinary.com/console
   - Check Settings → API Keys
   - Verify Cloud Name

### Issue: "og:image" not showing on social media

**Cause 1:** Image URL not accessible

**Solution:**
```javascript
// Verify image is public
const imageUrl = 'https://res.cloudinary.com/your-cloud/image/upload/og-images/test.png';
fetch(imageUrl).then(r => {
  if (r.ok) console.log('✓ Image is public');
  else console.log('✗ Image not accessible');
});
```

**Cause 2:** Cached old metadata

**Solution:**
- Use: https://developers.facebook.com/tools/debug (clear cache)
- Or wait 24 hours for cache refresh

**Cause 3:** Image generation failed silently

**Solution:**
1. Check server logs for errors
2. Verify Canvas is working:
   ```javascript
   const { createCanvas } = require('canvas');
   const canvas = createCanvas(1200, 630);
   console.log('Canvas OK');
   ```

### Issue: Meta tags not updating on share page

**Cause:** Stale JavaScript cache

**Solution:**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear all cookies/cache in DevTools
- Verify network request to `/api/og-meta/{id}`

### Issue: "websiteId is required" error

**Cause:** Website not registered before generating OG

**Solution:**
- Ensure website is created via `/api/config` first
- Then generate OG image with the returned ID

## Performance Testing

### Measure Generation Time

```javascript
const start = performance.now();
await generateOGPreview({ ... });
const end = performance.now();
console.log(`Generated in ${(end - start).toFixed(2)}ms`);
```

**Expected:** 200-500ms per image

### Load Testing

```bash
# Install Apache Bench (if not available)
# MacOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils

# Test OG image generation (10 requests)
ab -n 10 -c 1 -p payload.json -T application/json http://localhost:3000/api/og-image
```

## Database Schema Updates

If you want to store OG data in MongoDB, update your Website schema:

```javascript
// In models.js, add to websiteSchema:
ogImageUrl: String,
ogMetaTags: mongoose.Schema.Types.Mixed,
ogGeneratedAt: { type: Date, default: null },

// Then in server.js, after generating OG:
await Website.findByIdAndUpdate(websiteId, {
  ogImageUrl: imageResponse.imageUrl,
  ogMetaTags: metaResponse.meta,
  ogGeneratedAt: new Date()
});
```

## Deployment Checklist

Before deploying to production:

- [ ] **Environment Variables Set**
  - [ ] CLOUDINARY_CLOUD_NAME
  - [ ] CLOUDINARY_API_KEY
  - [ ] CLOUDINARY_API_SECRET

- [ ] **Dependencies Installed**
  - [ ] sharp
  - [ ] canvas
  - [ ] All other packages

- [ ] **Files Created**
  - [ ] og-image-generator.js
  - [ ] og-preview-generator.js (client-side)
  - [ ] Documentation files

- [ ] **server.js Updated**
  - [ ] Import added
  - [ ] API endpoints added
  - [ ] No syntax errors

- [ ] **share.html Updated**
  - [ ] Meta tags added
  - [ ] OG injection script added

- [ ] **Testing**
  - [ ] Image generation works
  - [ ] Meta tags are injected
  - [ ] Social media previews show image

- [ ] **Optional but Recommended**
  - [ ] Database schema updated
  - [ ] Analytics tracking added
  - [ ] Error handling tested

## Monitoring

### Enable Detailed Logging

In `server.js`, add:

```javascript
const ogImageGenerator = require('./og-image-generator');

// Add logging wrapper
const originalGenerate = ogImageGenerator.generateOGImage;
ogImageGenerator.generateOGImage = async function(data) {
  console.log('[OG] Generating image for:', data.recipientName);
  const start = Date.now();
  try {
    const result = await originalGenerate.call(this, data);
    console.log('[OG] Generated in', Date.now() - start, 'ms');
    return result;
  } catch (error) {
    console.error('[OG] Generation failed:', error.message);
    throw error;
  }
};
```

### Monitor File Sizes

```bash
# Check upload directory size
du -sh uploads/og-images/

# Check largest files
ls -lhS uploads/og-images/ | head -20
```

### Cloudinary Monitoring

Visit: https://cloudinary.com/console/dashboard
- Check: Storage usage
- Check: API calls
- Check: og-images folder size

## Rollback Instructions

If you need to revert:

```bash
# Remove new files
rm og-image-generator.js
rm public/assets/og-preview-generator.js

# Restore server.js (remove OG endpoints)
# Restore share.html (remove OG meta tags)

# Remove packages (optional)
npm uninstall sharp canvas
```

## Support & Debugging

### Enable Debug Mode

```javascript
// In browser, set:
window.DEBUG_OG = true;

// Then check console for:
// [OG Debug] Image generation...
// [OG Debug] Meta tags fetched...
```

### Check Server Logs

```bash
# If running with logging
tail -f server.log | grep OG

# Or with npm start, watch for:
# [OG] Generating image...
```

### Test Individual Components

```javascript
// Test Canvas
const { createCanvas } = require('canvas');
const canvas = createCanvas(1200, 630);
console.log('✓ Canvas works');

// Test Sharp
const sharp = require('sharp');
sharp('input.png')
  .resize(1200, 630)
  .toBuffer()
  .then(() => console.log('✓ Sharp works'));

// Test Cloudinary
const cloudinary = require('cloudinary').v2;
cloudinary.api.resources({ max_results: 1 })
  .then(() => console.log('✓ Cloudinary works'));
```

## Success Checklist

You've successfully set up the OG Preview System when:

- ✅ OG images generate without errors
- ✅ Meta tags appear on share page
- ✅ Images show when links are shared on social media
- ✅ Title and description are customized per website
- ✅ Cloudinary stores images successfully
- ✅ No console errors in browser DevTools
- ✅ Network requests to `/api/og-*` complete successfully

## Next Steps

1. **Integration**
   - Add preview display to customize.html
   - Add preview updates on form changes
   - Store OG URL in database

2. **Enhancement**
   - Add custom color selection
   - Support multiple image templates
   - Add animation to OG images

3. **Analytics**
   - Track how many shares per OG image
   - Monitor which platforms use the preview
   - A/B test different designs

4. **Optimization**
   - Implement caching strategy
   - Optimize image size/quality
   - Add CDN caching headers

---

For more details, see:
- [OG_PREVIEW_DOCUMENTATION.md](./OG_PREVIEW_DOCUMENTATION.md) - Technical reference
- [OG_INTEGRATION_GUIDE.md](./OG_INTEGRATION_GUIDE.md) - Code examples
