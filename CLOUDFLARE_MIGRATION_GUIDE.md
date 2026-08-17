# Cloudflare Pages Migration Guide

## Overview
This guide covers migrating your wishing-portal from Firebase Hosting to Cloudflare Pages to avoid bandwidth quota limitations.

## Prerequisites

1. **Cloudflare Account**: Create a free account at https://dash.cloudflare.com/sign-up
2. **Wrangler CLI**: Install Cloudflare's command-line tool
   ```bash
   npm install -g wrangler
   ```
3. **Git Repository**: Ensure your project is in a Git repository (GitHub, GitLab, or Bitbucket)

## Migration Steps

### 1. Install Wrangler CLI (if not already installed)
```bash
npm install -g wrangler
```

### 2. Authenticate with Cloudflare
```bash
wrangler login
```
This will open a browser window to authenticate your Cloudflare account.

### 3. Create a Cloudflare Pages Project

#### Option A: Via Git Integration (Recommended)
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to Cloudflare Dashboard → Pages → Create a project
3. Connect your Git repository
4. Configure build settings:
   - **Build command**: Leave empty (static site)
   - **Build output directory**: `public`
   - **Root directory**: `/`
5. Click "Save and Deploy"

#### Option B: Via Direct Upload
```bash
wrangler pages project create wishing-portal
wrangler pages deploy public
```

### 4. Configuration Files Created

The following files have been added to your project:

- **`public/_redirects`**: Handles routing (equivalent to Firebase rewrites)
- **`public/_headers`**: Security headers for your site
- **Updated `package.json`**: New deploy script using wrangler

### 5. Environment Variables (if needed)

If your backend server requires environment variables:
1. Go to Cloudflare Dashboard → Pages → Your project → Settings → Environment variables
2. Add variables from your `.env` file

### 6. Custom Domain (Optional)

1. Go to Cloudflare Dashboard → Pages → Your project → Custom domains
2. Add your custom domain
3. Update DNS records as instructed by Cloudflare

## Deployment Commands

### Deploy to Cloudflare Pages
```bash
npm run deploy
```

### Deploy to Firebase (fallback)
```bash
npm run deploy:firebase
```

## Key Differences: Firebase vs Cloudflare Pages

| Feature | Firebase Hosting | Cloudflare Pages |
|---------|------------------|------------------|
| Bandwidth | Limited (Spark plan: 10GB/month) | Unlimited (free tier) |
| Build Time | Limited | Unlimited builds |
| Custom Domains | Free | Free |
| SSL | Free | Free |
| Edge Network | Global | Global (200+ locations) |
| Functions | Firebase Functions | Cloudflare Functions |

## Firebase Configuration Migration

Your original `firebase.json` configuration:
```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "cleanUrls": true,
    "trailingSlash": false,
    "rewrites": [
      {
        "source": "**",
        "destination": "/generated/customize.html"
      }
    ]
  }
}
```

Has been migrated to Cloudflare Pages via:
- **`public/_redirects`**: Handles the SPA routing rewrite
- **`public/_headers`**: Security headers
- Cloudflare Pages automatically handles clean URLs and trailing slashes

## Backend Server Considerations

Your project has a `server.js` backend. Cloudflare Pages is for static hosting only. Options:

1. **Keep backend separate**: Deploy backend to Render/Railway/Heroku, frontend to Cloudflare Pages
2. **Use Cloudflare Workers**: Migrate backend logic to Cloudflare Workers (requires code changes)
3. **Cloudflare Pages Functions**: Use Cloudflare's serverless functions (similar to Firebase Functions)

## Testing Before DNS Switch

1. Cloudflare provides a `.pages.dev` subdomain for testing
2. Test all functionality on the preview URL
3. Check routing, forms, and API calls
4. Update API endpoints if backend URL changes

## DNS Switch (When Ready)

1. Update your domain's DNS records to point to Cloudflare
2. Wait for DNS propagation (usually minutes to hours)
3. Verify SSL certificate is active

## Rollback Plan

If issues arise:
```bash
npm run deploy:firebase
```
This will redeploy to Firebase Hosting while you troubleshoot.

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Migration Guide](https://developers.cloudflare.com/pages/platform/migration)

## Support

For issues specific to this project, check:
- Server.js backend compatibility
- API endpoint configurations
- Environment variable setup
