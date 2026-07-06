# Cashfree Payment Gateway Setup Guide

## Current Status
- ✅ Environment set to production
- ✅ API credentials configured
- ✅ Dual-domain support configured (thegreeter.in + wishing-portal.onrender.com)
- ⏳ Webhook secret needs to be configured
- ⏳ Webhook URL needs to be registered in Cashfree Dashboard

## Dual-Domain Configuration

Your project is accessible from multiple domains:
- **Frontend**: `https://thegreeter.in` (main user-facing site)
- **Frontend**: `https://thegreeterindia.web.app` (Firebase hosting)
- **Backend API**: `https://wishing-portal.onrender.com` (server & webhooks)

This configuration is already supported in your server.js with:
- CORS enabled for all three domains
- Dynamic return URLs based on referring domain
- Webhooks pointing to the API server

Users can access your site from any of these domains and the payment flow will work correctly, redirecting them back to the same domain they started from.

## Step 1: Configure Webhook in Cashfree Dashboard

1. Log in to [Cashfree Merchant Dashboard](https://dashboard.cashfree.com)
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. **Select Webhook Version**: Choose the **latest/current version** (recommended by Cashfree)
   - Your server is configured for API version `2022-09-01`
   - Select the version that matches this or the latest available
5. Enter your webhook URL: `https://wishing-portal.onrender.com/api/payment/webhook`
   - **Important**: Use the API server URL, not the frontend domain
6. Select events to subscribe:
   - ✅ PAYMENT_SUCCESS_WEBHOOK
   - ✅ PAYMENT_FAILED_WEBHOOK
   - ✅ PAYMENT_CANCELLED
   - ✅ ORDER_PAID
   - ✅ ORDER_CANCELLED
   - ✅ ORDER_EXPIRED
7. Copy the **Webhook Secret** that's generated
8. Update your `.env` file:
   ```bash
   CASHFREE_WEBHOOK_SECRET=paste_your_webhook_secret_here
   ```

## Step 2: Verify Your Cashfree Account

### For Production:
1. Ensure your Cashfree account is **KYC verified**
2. Check that your bank account is linked for settlements
3. Verify that production API keys are active
4. Test with small amounts first

### For Sandbox Testing:
1. Keep `CASHFREE_ENV=sandbox` in `.env`
2. Use sandbox test credentials
3. Test with Cashfree's test payment methods

## Step 3: Restart Your Server

After updating `.env`:
```bash
# Stop current server (Ctrl+C)
# Restart with new environment variables
node server.js
```

## Step 4: Test Payment Flow

### Manual Testing:
1. Go to your website: `https://thegreeter.in`
2. Create a greeting page
3. Click "Personalise Your URL"
4. Enter a custom slug
5. Click the payment button
6. Complete test payment
7. Verify redirect to success page

### API Testing:
```bash
# Test price detection
curl https://wishing-portal.onrender.com/api/payment/detect-price

# Test order creation (requires valid websiteId and slug)
curl -X POST https://wishing-portal.onrender.com/api/payment/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "websiteId": "test_id",
    "slug": "test-slug",
    "amount": 29,
    "currency": "INR"
  }'
```

## Step 5: Monitor Webhooks

Check your server logs for webhook events:
```bash
# Look for webhook processing logs
# [Webhook] Order ORD_xxx status updated to PAID
```

## Troubleshooting

### Payment not redirecting:
- Check if `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` are correct
- Verify environment matches (sandbox vs production)
- Check server logs for Cashfree API errors

### Webhook not received:
- Verify webhook URL is correct in Cashfree Dashboard
- Check if webhook secret matches in `.env`
- Ensure your server is publicly accessible
- Check firewall/security settings

### Custom URL not reserved:
- Check if payment status is actually PAID in database
- Verify webhook is processing correctly
- Check MongoDB connection status

## Security Notes

- **Never commit `.env` file to version control**
- **Rotate webhook secrets periodically**
- **Monitor payment transactions regularly**
- **Set up alerts for failed payments**
- **Keep Cashfree credentials secure**

## Contact Cashfree Support

If you face issues:
- Email: merchants@cashfree.com
- Dashboard: https://dashboard.cashfree.com/support
- Documentation: https://docs.cashfree.com/docs/

## Next Steps After Setup

1. **Monitor first few transactions** closely
2. **Set up revenue tracking** in your dashboard
3. **Configure settlement schedules** in Cashfree
4. **Add refund handling** if needed
5. **Set up analytics** for payment conversion rates
