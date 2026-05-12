# MongoDB Atlas Setup for Render Deployment

## Issue Identified
The current MongoDB URI in `.env` points to `localhost:27017` which won't work on Render since it's trying to connect to a local database.

## Solution: Set up MongoDB Atlas

### Step 1: Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (free tier is sufficient)

### Step 2: Get Connection String
1. In MongoDB Atlas, go to your cluster
2. Click "Connect" 
3. Choose "Connect your application"
4. Copy the connection string

### Step 3: Update Render Environment Variables
1. Go to your Render dashboard
2. Select your wishing-portal service
3. Go to "Environment" tab
4. Add/Update environment variable:
   - **Key**: `MONGODB_URI`
   - **Value**: Your MongoDB Atlas connection string

### Step 4: Example Connection String Format
```
mongodb+srv://username:password@cluster.mongodb.net/wishing-portal?retryWrites=true&w=majority
```

### Step 5: Redeploy
After updating the environment variable, Render will automatically redeploy your application.

## Alternative: Use Render's Managed MongoDB
Render also offers managed MongoDB databases:
1. Go to Render dashboard
2. Click "New +" -> "PostgreSQL" (they don't have MongoDB, so Atlas is better)
3. Or use MongoDB Atlas as recommended above

## Current Status
- Analytics tracking is working correctly
- Frontend chart structure is correct
- Only MongoDB connection needs to be fixed
- Once MongoDB is connected, charts should populate with data

## Next Steps
1. Set up MongoDB Atlas
2. Update Render environment variable
3. Test admin dashboard
4. Verify charts populate with analytics data
