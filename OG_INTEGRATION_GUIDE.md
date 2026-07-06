# OG Preview System - Integration Guide

## Quick Start

### 1. Include the OG Generator Script

Add this to your HTML `<head>` or before the closing `</body>` tag:

```html
<!-- Include OG Preview Generator -->
<script src="/assets/og-preview-generator.js"></script>
```

### 2. Add Container for Preview Display

```html
<!-- Where you want the preview to appear -->
<div id="ogPreviewContainer" style="margin: 20px 0;"></div>
```

### 3. Implement in Your Page

#### Option A: Simple Implementation (One-time generation)

```javascript
// After form submission, in your event handler:
document.getElementById('submitBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  
  // Get form data
  const userData = {
    websiteId: 'generated-id-' + Date.now(),
    recipientName: document.getElementById('name').value,
    eventType: document.getElementById('event').value,
    creatorName: 'You',
    mood: document.getElementById('mood').value,
    message: document.getElementById('story').value
  };

  try {
    const generator = new OGPreviewGenerator({
      onProgress: (status) => {
        console.log('Status:', status.status, status.progress + '%');
      },
      onSuccess: (result) => {
        console.log('OG Preview generated!', result.imageUrl);
        // Continue with your normal flow
        proceedToShare();
      },
      onError: (error) => {
        console.error('OG generation failed:', error.error);
        // Still proceed even if OG generation fails
        proceedToShare();
      }
    });

    await generator.generate(userData);
  } catch (error) {
    console.error('Error:', error);
    proceedToShare(); // Fallback
  }
});

function proceedToShare() {
  // Save data to localStorage and redirect
  localStorage.setItem('userData', JSON.stringify(userData));
  window.location.href = 'generated/share.html';
}
```

#### Option B: Real-time Preview (Updates as user types)

```javascript
// Initialize generator
const generator = new OGPreviewGenerator({
  autoGenerate: true,
  onSuccess: (result) => {
    // Display preview whenever it's generated
    generator.displayPreview('ogPreviewContainer', result.imageUrl);
  },
  onError: (error) => {
    generator.showError('ogPreviewContainer', error.error);
  }
});

// Watch for changes
const form = document.getElementById('customizeForm');
let updateTimeout;

['name', 'event', 'mood', 'story'].forEach(fieldId => {
  const field = document.getElementById(fieldId);
  if (field) {
    field.addEventListener('input', () => {
      generator.showLoading('ogPreviewContainer', 'Updating preview...');
      
      // Debounce to avoid too many requests
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        const userData = {
          websiteId: 'temp-preview',
          recipientName: document.getElementById('name').value || 'Someone',
          eventType: document.getElementById('event').value || 'Birthday',
          creatorName: 'You',
          mood: document.getElementById('mood').value || 'happy',
          message: document.getElementById('story').value || 'Check this out!'
        };

        generator.generate(userData);
      }, 1000); // Wait 1 second after user stops typing
    });
  }
});
```

#### Option C: Manual Trigger with Button

```html
<!-- Button to manually generate/update preview -->
<button id="generatePreviewBtn" class="btn">
  👁️ Preview How It Looks
</button>
```

```javascript
document.getElementById('generatePreviewBtn').addEventListener('click', async () => {
  const btn = document.getElementById('generatePreviewBtn');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    const userData = {
      websiteId: 'preview-' + Date.now(),
      recipientName: document.getElementById('name').value || 'Someone',
      eventType: document.getElementById('event').value || 'Birthday',
      creatorName: document.getElementById('from').value || 'A Friend',
      mood: document.getElementById('mood').value || 'happy',
      message: document.getElementById('story').value || 'Something special!'
    };

    const generator = new OGPreviewGenerator();
    const result = await generator.generate(userData);
    
    // Display the preview
    generator.displayPreview('ogPreviewContainer', result.imageUrl);
    
  } catch (error) {
    alert('Could not generate preview. ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '👁️ Preview How It Looks';
  }
});
```

## Advanced Usage

### Store OG Image URL for Later Use

```javascript
const generator = new OGPreviewGenerator({
  onSuccess: (result) => {
    // Store in localStorage
    const config = JSON.parse(localStorage.getItem('userData')) || {};
    config.ogImageUrl = result.imageUrl;
    config.ogMetaTags = result.metaTags;
    localStorage.setItem('userData', JSON.stringify(config));
    
    // Or send to server
    updateWebsiteConfig({
      websiteId: config.websiteId,
      ogImageUrl: result.imageUrl,
      ogMetaTags: result.metaTags
    });
  }
});
```

### Custom Styling

```html
<style>
  .og-preview-container {
    background: linear-gradient(135deg, #f0f0f0 0%, #ffffff 100%);
    border: 3px solid #7b5df6;
    padding: 24px;
    border-radius: 16px;
  }

  .og-preview-image {
    box-shadow: 0 12px 40px rgba(123, 93, 246, 0.3);
    transition: transform 0.3s ease;
  }

  .og-preview-image:hover {
    transform: scale(1.02);
  }

  .og-preview-label {
    background: linear-gradient(135deg, #7b5df6, #ff7a2f);
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    display: inline-block;
    margin-bottom: 12px;
  }
</style>
```

## Integration Points

### In `customize.html`

Add after the customize form:

```html
<!-- OG Preview Section -->
<div style="margin-top: 40px; border-top: 2px solid var(--card-border); padding-top: 40px;">
  <h3 style="margin-bottom: 20px;">📱 How It Looks When Shared</h3>
  <div id="ogPreviewContainer"></div>
</div>

<script src="/assets/og-preview-generator.js"></script>
<script>
  // Initialize and auto-update on changes
  const generator = new OGPreviewGenerator();
  
  // Generate preview on page load
  window.addEventListener('load', () => {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.name) {
      generator.showLoading('ogPreviewContainer');
      generator.generate({
        websiteId: new URLSearchParams(window.location.search).get('view'),
        recipientName: userData.name,
        eventType: userData.event,
        creatorName: userData.creatingFor || 'A Friend',
        mood: userData.mood,
        message: userData.story
      }).then(result => {
        generator.displayPreview('ogPreviewContainer', result.imageUrl);
      });
    }
  });

  // Update on text input changes
  document.addEventListener('input', (e) => {
    if (['name', 'story', 'wishes', 'mood'].includes(e.target.id)) {
      // Debounce regeneration
      clearTimeout(generator.debounceTimer);
      generator.debounceTimer = setTimeout(() => {
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        if (userData.name) {
          generator.generate({
            websiteId: 'temp-' + Date.now(),
            recipientName: userData.name || 'Someone',
            eventType: userData.event || 'Birthday',
            creatorName: userData.creatingFor || 'A Friend',
            mood: userData.mood || 'happy',
            message: userData.story || 'Check this out!'
          });
        }
      }, 1500);
    }
  });
</script>
```

### In `preview.html`

Similar implementation before showing the preview:

```html
<div class="preview-section">
  <h2>Your Surprise Preview</h2>
  <div id="ogPreviewContainer" style="margin: 20px 0;"></div>
  <!-- Your normal preview content below -->
</div>
```

### In `share.html` (Already Implemented ✓)

The share.html already includes automatic OG meta tag injection via:
```javascript
async function injectOGMetaTags() {
  // Fetches from /api/og-meta/:id and updates page meta tags
}
```

## API Response Handling

### Success Response
```javascript
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/.../og-images/abc123.png",
  "metaTags": {
    "title": "Happy Birthday Ananya 💝",
    "description": "🎂 Happy Birthday Ananya!...",
    "type": "website",
    "url": "https://thegreeter.in/abc123",
    "siteName": "TheGreeter"
  },
  "websiteUrl": "https://thegreeter.in/abc123"
}
```

### Error Response
```javascript
{
  "error": "Failed to generate OG image",
  "details": "Canvas rendering error"
}
```

## Debugging

### Enable Debug Logging

```javascript
const generator = new OGPreviewGenerator({
  onProgress: (status) => {
    console.log('[OG Debug]', status);
  },
  onSuccess: (result) => {
    console.log('[OG Success]', result);
  },
  onError: (error) => {
    console.error('[OG Error]', error);
  }
});
```

### Test Image Generation Directly

```javascript
// In browser console
fetch('/api/og-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    websiteId: 'test-' + Date.now(),
    recipientName: 'John',
    eventType: 'Birthday',
    creatorName: 'Sarah',
    mood: 'happy',
    message: 'Happy Birthday John! Wishing you all the happiness!'
  })
})
.then(r => r.json())
.then(data => console.log('Image URL:', data.imageUrl))
.catch(err => console.error('Error:', err))
```

### Verify Meta Tags

```javascript
// In browser console on share page
const ogTitle = document.querySelector('meta[property="og:title"]');
const ogImage = document.querySelector('meta[property="og:image"]');
console.log('OG Title:', ogTitle?.content);
console.log('OG Image:', ogImage?.content);
```

## Performance Tips

1. **Debounce Updates**
   - Don't regenerate on every keystroke
   - Wait for user to pause (1-2 seconds)

2. **Cache Results**
   - Store generated image URL in localStorage
   - Don't regenerate for same data

3. **Show Loading State**
   - Give user feedback during generation
   - Typically takes 200-500ms

4. **Lazy Load**
   - Only generate when user explicitly asks
   - Or generate in background on save

## Browser Compatibility

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Images not generating

**Check 1: Cloudinary credentials**
```bash
# In server.js
console.log(process.env.CLOUDINARY_CLOUD_NAME);
```

**Check 2: Canvas installation**
```bash
npm list canvas
# Should show canvas@x.x.x
```

**Check 3: Network request**
- Open DevTools → Network tab
- Look for `/api/og-image` POST request
- Check response for errors

### Meta tags not injecting

**Check 1: URL parameters**
```javascript
const params = new URLSearchParams(window.location.search);
console.log('View ID:', params.get('view'));
```

**Check 2: API response**
```bash
curl -X GET "http://localhost:3000/api/og-meta/test-id"
```

**Check 3: Browser cache**
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear all cache: Ctrl+Shift+Delete

## Support

For issues:
1. Check browser console for errors
2. Review server logs
3. Test API endpoints directly
4. Verify image appears in Cloudinary dashboard
