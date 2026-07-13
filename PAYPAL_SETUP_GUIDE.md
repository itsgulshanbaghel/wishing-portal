# PayPal Payment Gateway Setup Guide

## Current Status
- ✅ PayPal API integration implemented
- ✅ Dynamic routing for international users
- ✅ PayPal capture endpoint added
- ✅ PayPal webhook handler added
- ⏳ PayPal credentials need to be configured
- ⏳ Webhook URL needs to be registered in PayPal Dashboard

## Dynamic Payment Gateway System

Your system now automatically routes users to the appropriate payment gateway based on their location:

- **Indian users** → Cashfree Payments (₹29 INR)
- **International users** → PayPal (local currency pricing)

### Country-Specific Pricing

The system automatically detects the user's country and shows the appropriate price in their local currency:

| Country/Region | Currency | Amount |
|----------------|----------|--------|
| 🇺🇸 United States | USD | $1.99 |
| 🇨🇦 Canada | CAD | CA$2.49 |
| 🇬🇧 United Kingdom | GBP | £1.79 |
| 🇪🇺 Eurozone | EUR | €1.99 |
| 🇦🇺 Australia | AUD | A$2.99 |
| 🇳🇿 New Zealand | NZD | NZ$2.99 |
| 🇸🇬 Singapore | SGD | S$2.49 |
| 🇯🇵 Japan | JPY | ¥250 |
| 🇰🇷 South Korea | USD | $1.80 |
| 🇭🇰 Hong Kong | HKD | HK$15 |
| 🇹🇼 Taiwan | TWD | NT$59 |
| 🇦🇪 UAE | USD | $1.90 |
| 🇸🇦 Saudi Arabia | USD | $1.86 |
| 🇶🇦 Qatar | USD | $1.92 |
| 🇰🇼 Kuwait | USD | $1.95 |
| 🇴🇲 Oman | USD | $1.56 |
| 🇧🇭 Bahrain | USD | $1.59 |
| 🇮🇱 Israel | ILS | ₪7.90 |
| 🇮🇳 India | INR | ₹29 (Cashfree) |
| 🇵🇰 Pakistan | USD | $1.00 |
| 🇧🇩 Bangladesh | USD | $1.00 |
| 🇳🇵 Nepal | USD | $1.00 |
| 🇱🇰 Sri Lanka | USD | $1.00 |
| 🇲🇾 Malaysia | MYR | RM4.90 |
| 🇹🇭 Thailand | THB | ฿39 |
| 🇮🇩 Indonesia | USD | $1.00 |
| 🇵🇭 Philippines | PHP | ₱59 |
| 🇻🇳 Vietnam | USD | $1.00 |
| 🇧🇷 Brazil | BRL | R$6.90 |
| 🇲🇽 Mexico | MXN | MX$25 |
| 🇦🇷 Argentina | USD | $1.99 |
| 🇨🇱 Chile | USD | $1.49 |
| 🇨🇴 Colombia | USD | $1.49 |
| 🇿🇦 South Africa | USD | $1.49 |
| 🇳🇬 Nigeria | USD | $1.00 |
| 🇪🇬 Egypt | USD | $1.00 |
| 🌍 Other Countries | USD | $1.49 |

## Step 1: Get PayPal API Credentials

### For Production:
1. Log in to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Apps & Credentials**
3. Click **Create App**
4. Enter app name: "The Greeter Custom URL"
5. Select **Seller** as the app type
6. Copy the **Client ID** and **Client Secret**
7. Update your `.env` file:
   ```bash
   PAYPAL_CLIENT_ID=your_production_client_id
   PAYPAL_CLIENT_SECRET=your_production_client_secret
   PAYPAL_ENV=production
   ```

### For Sandbox Testing:
1. Use the sandbox credentials from PayPal Developer Dashboard
2. Keep `PAYPAL_ENV=sandbox` in `.env`
3. Test with PayPal's test payment methods

## Step 2: Configure PayPal Webhook

1. In PayPal Developer Dashboard, go to your app
2. Navigate to **Webhooks** section
3. Click **Add Webhook**
4. Enter webhook URL: `https://wishing-portal.onrender.com/api/payment/paypal/webhook`
5. Select events to subscribe:
   - ✅ PAYMENT.CAPTURE.COMPLETED
   - ✅ PAYMENT.CAPTURE.DECLINED
   - ✅ CHECKOUT.ORDER.APPROVED
   - ✅ CHECKOUT.ORDER.APPROVAL.REVERSED
6. Save the webhook configuration
7. Copy the **Webhook ID** for verification (optional)

## Step 3: Verify PayPal Account

### For Production:
1. Ensure your PayPal business account is verified
2. Check that your bank account is linked for withdrawals
3. Verify that production API keys are active
4. Test with small amounts first

### For Sandbox Testing:
1. Keep `PAYPAL_ENV=sandbox` in `.env`
2. Use sandbox test credentials
3. Test with PayPal's test payment methods

## Step 4: Update .env File

Add the following to your `.env` file:

```bash
# PayPal Payment Gateway
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENV=sandbox  # Change to 'production' for live payments
```

## Step 5: Restart Your Server

After updating `.env`:
```bash
# Stop current server (Ctrl+C)
# Restart with new environment variables
node server.js
```

## Step 6: Test Payment Flow

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
    "slug": "test-slug"
  }'

# Test PayPal capture (after user approval)
curl -X POST https://wishing-portal.onrender.com/api/payment/paypal/capture \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD_xxx"
  }'
```

## Payment Flow Architecture

### For Indian Users (Cashfree):
1. User clicks "Personalise URL"
2. Server detects country (India) via geo-IP
3. Server routes to Cashfree (₹29 INR)
4. User completes payment on Cashfree
5. Cashfree webhook sends success notification
6. Server reserves custom URL
7. User redirected to success page

### For International Users (PayPal):
1. User clicks "Personalise URL"
2. Server detects country (non-India) via geo-IP
3. Server routes to PayPal (local currency)
4. User approves payment on PayPal
5. Server captures payment via API
6. PayPal webhook sends confirmation
7. Server reserves custom URL
8. User redirected to success page

## Security Features Implemented

- **Server-side price detection**: Prices are determined server-side based on geo-IP, never trusted from client
- **Input validation**: All endpoints validate input types, lengths, and formats
- **Helmet security headers**: CSP, HSTS, and other security headers enabled
- **Rate limiting**: API endpoints protected from abuse
- **Webhook signature verification**: Cashfree webhooks verified with HMAC signatures
- **Slug sanitization**: Custom URLs sanitized to prevent injection attacks
- **Payment status verification**: Direct API verification for pending payments

## Troubleshooting

### PayPal payment not redirecting:
- Check if `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are correct
- Verify environment matches (sandbox vs production)
- Check server logs for PayPal API errors
- Ensure PayPal account is verified

### PayPal webhook not received:
- Verify webhook URL is correct in PayPal Dashboard
- Check if webhook is active and subscribed to correct events
- Ensure your server is publicly accessible
- Check firewall/security settings

### Custom URL not reserved:
- Check if payment status is actually PAID in database
- Verify webhook is processing correctly
- Check MongoDB connection status
- Verify PayPal capture was successful

### Country detection issues:
- Check if geoip-lite is working correctly
- Verify IP headers are being passed correctly
- Test with VPN from different countries

## Monitoring and Analytics

Check your server logs for payment events:
```bash
# PayPal order creation
# [PayPal] Creating order ORD_xxx for 1.99 USD

# PayPal capture
# [PayPal] Capturing order xxx
# [PayPal] Order ORD_xxx captured successfully

# PayPal webhook
# [PayPal Webhook] Received event: PAYMENT.CAPTURE.COMPLETED
# [PayPal Webhook] Order ORD_xxx marked as PAID
```

## Security Notes

- **Never commit `.env` file to version control**
- **Rotate PayPal API secrets periodically**
- **Monitor payment transactions regularly**
- **Set up alerts for failed payments**
- **Keep PayPal credentials secure**
- **Use webhook signature verification in production**
- **Enable PayPal fraud detection tools**

## Contact PayPal Support

If you face issues:
- Developer Support: https://developer.paypal.com/support/
- Merchant Support: https://www.paypal.com/support
- Documentation: https://developer.paypal.com/docs/

## Next Steps After Setup

1. **Monitor first few transactions** closely
2. **Set up revenue tracking** in PayPal Dashboard
3. **Configure withdrawal schedules** in PayPal
4. **Add refund handling** if needed
5. **Set up analytics** for payment conversion rates
6. **Test with VPN** from different countries to verify geo-detection
7. **Monitor webhook delivery** in PayPal Dashboard

## Dual-Gateway Configuration Summary

Your system now supports:
- **Cashfree** for Indian users (₹29 INR)
- **PayPal** for international users (local currency pricing)
- **Automatic geo-detection** for seamless user experience
- **Secure payment processing** with proper validation
- **Webhook handlers** for both gateways
- **Comprehensive error handling** and logging

The system will automatically route users to the appropriate payment gateway based on their detected location, ensuring the best payment experience for your global user base.
