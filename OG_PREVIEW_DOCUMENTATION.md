# Open Graph Preview System - Documentation

## Overview

This system automatically generates beautiful Open Graph (OG) preview images and meta tags for each shared wish page, making them more shareable on social media platforms like WhatsApp, Facebook, Twitter, and Instagram.

## Features

✨ **Automatic OG Image Generation**
- Creates beautiful, customized preview images for each wish
- Includes recipient name, event type, and personalized message
- Generates as PNG (1200x630px) - perfect for social media

🎯 **Dynamic Meta Tags**
- Automatically generates OG meta tags:
  - `og:title` - Customized greeting with event type
  - `og:description` - Summary with recipient name and mood
  - `og:image` - Generated preview image URL
  - `og:url` - Direct link to the wish page
  - `og:type` - Website type
- Twitter Card support for beautiful Twitter previews
- Fallback values for all tags

📱 **Social Media Integration**
- Works seamlessly on WhatsApp, Facebook, Twitter, Instagram, Telegram
- Shows rich previews when links are shared
- Increases click-through rates with visual appeal

## Architecture

### Components

1. **og-image-generator.js** - Core service
   - `generateOGImage(data)` - Generates PNG images using Canvas
   - `generateOGMetaTags(data, url)` - Creates meta tag JSON
   - `saveOGImage(buffer, filename)` - Saves images to filesystem and Cloudinary

2. **Server API Endpoints**

   **POST /api/og-image**
   ```
   Request:
   {
     "websiteId": "abc123",
     "recipientName": "Ananya",
     "eventType": "Birthday",
     "creatorName": "John",
     "mood": "happy",
     "message": "Wishing you all the happiness..."
   }
   
   Response:
   {
     "success": true,
     "imageUrl": "https://res.cloudinary.com/.../og-images/abc123.png",
     "localPath": "/uploads/og-images/abc123-og-12345.png",
     "websiteId": "abc123"
   }
   ```

   **GET /api/og-meta/:id**
   ```
   Fetches stored meta tags and image for a website ID
   
   Response:
   {
     "success": true,
     "meta": {
       "title": "Happy Birthday Ananya 💝",
       "description": "🎂 Happy Birthday Ananya!...",
       "type": "website",
       "url": "https://thegreeter.in/abc123",
       "siteName": "TheGreeter"
     },
     "imageUrl": "https://res.cloudinary.com/.../og-images/abc123.png",
     "websiteUrl": "https://thegreeter.in/abc123"
   }
   ```

   **POST /api/og-meta**
   ```
   Generate meta tags on-the-fly without storing
   
   Request:
   {
     "recipientName": "Ananya",
     "eventType": "Birthday",
     "creatorName": "John",
     "message": "Wishing you...",
     "websiteUrl": "https://thegreeter.in/abc123"
   }
   
   Response:
   {
     "success": true,
     "meta": { ... }
   }
   ```

3. **Front-end Integration** (share.html)
   - Automatic OG meta tag injection on page load
   - Fetches tags from `/api/og-meta/:id` endpoint
   - Updates page title and meta tags dynamically

## Usage Examples

### 1. Generate OG Image Immediately After Creating Website

```javascript
// In customize.html or preview.html, after website creation
async function generateOGPreview() {
  const userData = JSON.parse(localStorage.getItem('userData'));
  const response = await fetch('/api/og-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      websiteId: websiteId,
      recipientName: userData.name,
      eventType: userData.event,
      creatorName: userData.creatingFor || 'A Friend',
      mood: userData.mood,
      message: userData.story
    })
  });
  
  const result = await response.json();
  console.log('OG Image generated:', result.imageUrl);
  return result.imageUrl;
}
```

### 2. Fetch OG Preview When Sharing

```javascript
// In share.html (already implemented)
async function getOGPreview(websiteId) {
  const response = await fetch(`/api/og-meta/${websiteId}`);
  const data = await response.json();
  return data;
}
```

### 3. Update Preview in Real-time

```javascript
// Monitor for changes and regenerate OG image
document.addEventListener('dataChanged', async (e) => {
  await generateOGPreview();
});
```

## Design Elements

### OG Image Template

The generated preview image includes:

1. **Background** - Soft gradient (pink to purple to blue)
2. **Greeting Text** - Large "Happy [EventType]"
3. **Recipient Name** - Bold, centered name in largest font
4. **Emoji** - Heart emoji (💝)
5. **Message Preview** - Main greeting message (auto-wrapped)
6. **CTA Button** - "Tap to open your surprise"
7. **Attribution** - Creator name (bottom right)
8. **Branding** - "thegreeter.in" logo (bottom left)

Dimensions: 1200x630px (standard OG image size)

### Color Schemes

Automatically adjusted based on event type:

- **Birthday**: Pink & Yellow (#FF6B9D, #FFE66D)
- **Anniversary**: Deep Red & Pink (#D63384, #FFB6C1)
- **Proposal**: Red & Pink (#C41E3A, #FFB6C1)
- **Festival**: Orange & Gold (#FF8C00, #FFD700)
- **Default**: Purple & Orange (#7B5DF6, #FF7A2F)

## File Storage

### Local Storage
- Location: `/uploads/og-images/`
- Format: `{websiteId}-og-{timestamp}.png`
- Used for: Backup and local serving

### Cloudinary Storage
- Folder: `og-images/`
- Public ID: `{websiteId}`
- URL Format: `https://res.cloudinary.com/{cloud_name}/image/upload/og-images/{websiteId}`
- Advantages:
  - Global CDN delivery
  - Automatic optimization
  - Responsive image serving
  - Overwrite replaces old image (no duplication)

## Database Fields

Each website in MongoDB should ideally store:
```javascript
{
  ogImageUrl: "https://res.cloudinary.com/.../og-images/abc123.png",
  ogGeneratedAt: Date,
  ogMetaTags: {
    title: "Happy Birthday Ananya 💝",
    description: "...",
    url: "https://thegreeter.in/abc123"
  }
}
```

## Environment Variables Required

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
BASE_URL=https://thegreeter.in  # (optional, defaults to this)
```

## Performance Optimization

### Image Generation
- Uses Canvas library for server-side rendering
- No external API calls needed (pure Node.js)
- Generation time: ~200-500ms per image
- Cached in Cloudinary CDN

### Caching Strategy
1. Generate once on website creation
2. Store URL in database
3. Reuse on all shares
4. Regenerate only if: name/message changes or requested explicitly

### API Rate Limiting
- Both endpoints protected by global `/api/` rate limiter (5000 req/15min)
- Consider adding specific rate limit if needed

## Troubleshooting

### OG Image Not Appearing

1. **Check Canvas installation**
   ```bash
   npm list canvas
   ```

2. **Verify Cloudinary credentials**
   ```javascript
   console.log(process.env.CLOUDINARY_CLOUD_NAME);
   ```

3. **Test image generation directly**
   ```bash
   curl -X POST http://localhost:3000/api/og-image \
     -H "Content-Type: application/json" \
     -d '{"websiteId":"test","recipientName":"John","eventType":"Birthday"}'
   ```

4. **Check Cloudinary upload folder**
   - Visit Cloudinary dashboard → Media Library → og-images folder

### Meta Tags Not Updating

1. **Clear browser cache**
   ```bash
   Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   ```

2. **Check network requests**
   - Open DevTools → Network
   - Look for `/api/og-meta/{id}` request
   - Verify response contains meta tags

3. **Verify website ID in URL**
   - share.html?view={websiteId} must be correct

## Testing

### Test OG Image Generation

```javascript
// Run in browser console on share page
fetch('/api/og-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    websiteId: 'test-' + Date.now(),
    recipientName: 'Test User',
    eventType: 'Birthday',
    creatorName: 'Test Creator',
    mood: 'happy',
    message: 'This is a test message!'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Success!', data);
  console.log('Image URL:', data.imageUrl);
})
```

### Test Meta Tag Injection

```javascript
// Run in browser console on share page
fetch('/api/og-meta/test-id')
  .then(r => r.json())
  .then(data => {
    console.log('Meta tags:', data.meta);
    console.log('Image:', data.imageUrl);
  })
```

### Test with Social Media

1. **WhatsApp**: Paste link in chat
2. **Facebook**: Use Sharing Debugger (facebook.com/developers/tools/debug)
3. **Twitter**: Use Card Validator (cards-dev.twitter.com/validator)
4. **LinkedIn**: Use Post Inspector

## Future Enhancements

1. **A/B Testing**
   - Generate multiple image variants
   - Track which performs best

2. **Advanced Customization**
   - User-selected colors
   - Custom fonts
   - Photo uploads

3. **Dynamic Content**
   - Pull names from database
   - Real-time updates
   - Multiple language support

4. **Analytics**
   - Track shares by platform
   - Count OG preview clicks
   - Monitor image delivery performance

5. **Video Support**
   - Generate short preview videos
   - Animated OG images
   - Interactive previews

## Support

For issues or questions:
- Check console for error messages
- Review server logs: `tail -f server.log`
- Test individual components in isolation
