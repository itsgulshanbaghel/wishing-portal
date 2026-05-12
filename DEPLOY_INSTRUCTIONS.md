# Render Deployment Instructions for MongoDB Atlas

## MongoDB Connection Update Required

### Current Status
- ✅ Analytics tracking code is working
- ✅ Frontend chart structure is correct
- ✅ Debugging is deployed and working
- ❌ MongoDB connection needs to be updated on Render

### Step 1: Update Render Environment Variables

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Select your `wishing-portal` service

2. **Update Environment Variables**
   - Click on the "Environment" tab
   - Find or add the `MONGODB_URI` variable
   - Set the value to:
   ```
   mongodb+srv://gulshanbaghel:greetly06@thegreeter.eu9o9le.mongodb.net/?appName=TheGreeter
   ```

3. **Save and Deploy**
   - Click "Save Changes"
   - Render will automatically redeploy your application

### Step 2: Verify Deployment

After deployment completes (2-5 minutes):

1. **Test Admin Dashboard**
   - Visit: https://wishing-portal.onrender.com/admin
   - Login with: admin / greeter2026

2. **Expected Results**
   - Charts should populate with analytics data
   - "No data" message should disappear
   - Recent Activity table should show tracked events

### Step 3: Monitor Logs (Optional)

Check Render logs to verify:
- MongoDB connection successful
- Analytics endpoints receiving data
- Dashboard data retrieval working

### What This Fixes

Once MongoDB Atlas is connected:
- Analytics data will be properly stored
- Charts will populate with real metrics
- All time periods will show correct data
- Recent Activity will display tracked events

### Troubleshooting

If charts still show "No data":
1. Check Render logs for MongoDB connection errors
2. Verify the MongoDB Atlas connection string is correct
3. Ensure MongoDB Atlas allows connections from Render's IP
4. Check if analytics tracking is being called on the main website

## Next Steps

After MongoDB is connected:
1. Test different time periods (All Time, 7 Days, Today)
2. Verify all charts populate correctly
3. Monitor analytics data collection
4. Enjoy your working analytics dashboard! 🎉
