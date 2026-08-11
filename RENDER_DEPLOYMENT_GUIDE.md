# Render Deployment Guide - New Account Setup

## Prerequisites
- GitHub account with your project repository
- Render account (sign up at https://render.com)
- All environment variables from your current `.env` file

## Step 1: Create New Render Account
1. Go to https://render.com
2. Click "Sign Up" and create a new account
3. Verify your email address
4. Connect your GitHub account to Render

## Step 2: Prepare Your Repository
1. Ensure your code is pushed to GitHub
2. Verify these files exist in your repository:
   - `Procfile` (already created)
   - `render.yaml` (already created)
   - `package.json` (already exists)
   - `.env` (already exists)

## Step 3: Create New Web Service
1. Log into your new Render account
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `wishing-portal` (or your preferred name)
   - **Region**: Choose the region closest to your users
   - **Branch**: `main` (or your default branch)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`

## Step 4: Add Environment Variables
In Render dashboard, add these environment variables from your `.env` file:

### Required Variables:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ADMIN_USER=your_admin_user
ADMIN_PASS=your_admin_pass
MONGODB_URI=your_mongodb_uri
GROQ_API_KEY_1=your_groq_api_key_1
GROQ_API_KEY_2=your_groq_api_key_2
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_smtp_pass
ALERT_EMAIL=your_email@gmail.com
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
CASHFREE_APP_ID=your_cashfree_app_id
CASHFREE_SECRET_KEY=your_cashfree_secret_key
CASHFREE_ENV=production
SITE_URL=https://thegreeter.in
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENV=sandbox
```

### Important: After Deployment
Once your service is deployed and you have the URL, update the `.env` file locally:
```
API_BASE_URL=https://YOUR_ACTUAL_RENDER_URL.onrender.com
```

## Step 5: Deploy
1. Click "Create Web Service"
2. Wait for the build to complete (2-5 minutes)
3. Render will provide your service URL (e.g., `https://wishing-portal-xxxx.onrender.com`)

## Step 6: Update Configuration
1. Copy your new Render service URL
2. Update the `API_BASE_URL` in your local `.env` file
3. If needed, update any hardcoded URLs in your frontend code
4. Commit and push the updated `.env` changes

## Step 7: Verify Deployment
1. Visit your new Render URL
2. Test key functionality:
   - API endpoints
   - Database connections
   - Payment gateways
   - File uploads (Cloudinary)
   - Email notifications

## Troubleshooting

### Build Failures:
- Check Node.js version compatibility (Render uses latest Node.js by default)
- Verify all dependencies in `package.json`
- Check build logs in Render dashboard

### Runtime Errors:
- Verify all environment variables are set correctly
- Check MongoDB connection string
- Review Render logs for specific errors

### Database Connection Issues:
- Ensure MongoDB URI is correct
- Check if MongoDB Atlas allows connections from Render's IP ranges
- Verify SSL settings in connection string

## Migration Notes
- Your old Render service (`wishing-portal.onrender.com`) will continue running until you delete it
- Consider keeping both running during transition for safety
- Update any third-party services (webhooks, callbacks) with your new URL
- Update DNS records if you're using a custom domain

## Cost Considerations
- Free tier: 512MB RAM, 0.1 CPU (suitable for development/testing)
- Paid tiers start at $7/month for production use
- Consider your traffic and resource needs before choosing a plan
