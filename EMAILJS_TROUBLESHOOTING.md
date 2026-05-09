# EmailJS Troubleshooting Guide

## 🔍 Common Issues and Solutions

### 1. Check Browser Console for Errors
**First Step - Always do this:**
1. Open your ContactUs.html page
2. Press `F12` to open Developer Tools
3. Click on **"Console"** tab
4. Try submitting the form
5. Look for any red error messages

### 2. Verify EmailJS Configuration

#### Service ID Issues:
- Go to EmailJS dashboard → **Email Services**
- Check that `service_greeter` exists and is **Active**
- If not active, click the service and click **"Activate"**

#### Template ID Issues:
- Go to EmailJS dashboard → **Email Templates**
- Check that `template_f1qgudh` exists
- Verify template has all required variables: `{{from_name}}`, `{{from_email}}`, `{{subject}}`, `{{message}}`

#### Public Key Issues:
- Go to EmailJS dashboard → **Account** → **General**
- Verify your public key is: `QzvA-__61RB8pzLms`
- If different, update the code

### 3. Common Error Messages and Solutions

#### "401 Unauthorized" or "403 Forbidden"
**Cause:** Incorrect public key or service not active
**Solution:** 
- Verify public key is correct
- Activate your email service in EmailJS dashboard

#### "400 Bad Request" 
**Cause:** Template variables don't match
**Solution:**
- Check template has exact variable names: `{{from_name}}`, `{{from_email}}`, `{{subject}}`, `{{message}}`
- No extra spaces or different spelling

#### "Template not found"
**Cause:** Template ID is incorrect
**Solution:**
- Verify template ID: `template_f1qgudh`
- Copy exact ID from EmailJS dashboard

### 4. Gmail Service Connection Issues

#### Check Gmail Service Status:
1. Go to EmailJS dashboard → **Email Services**
2. Click on your Gmail service
3. Look for connection status
4. If disconnected, click **"Reconnect"** and follow Gmail authentication

#### Gmail Permissions:
- Make sure you granted EmailJS permission to send emails from your Gmail
- Check Gmail for any security alerts about EmailJS access

### 5. Template Content Check

Your template should contain:
```
You have received a new message from the Greeter contact form:

Name: {{from_name}}
Email: {{from_email}}
Subject: {{subject}}

Message:
{{message}}

---
This email was sent automatically from your Greeter website contact form.
```

### 6. Rate Limiting

**Free Plan Limits:**
- 200 emails per month
- 2 emails per second
- If you exceeded limits, wait and try again

### 7. Network/HTTPS Issues

**Local Testing:**
- EmailJS works better on HTTPS servers
- If testing locally, some browsers may block the request
- Try using a simple HTTP server or deploy to a web host

### 8. Debug Steps

1. **Check Console:** Look for specific error messages
2. **Verify Service:** Ensure service is active in EmailJS dashboard
3. **Check Template:** Verify template ID and variables
4. **Test Connection:** Reconnect Gmail service if needed
5. **Try Different Browser:** Sometimes browser extensions interfere

### 9. Quick Fix Checklist

- [ ] Check browser console for errors
- [ ] Verify EmailJS service is active
- [ ] Confirm template ID is correct
- [ ] Check template variables match exactly
- [ ] Reconnect Gmail service if needed
- [ ] Test on HTTPS if possible
- [ ] Check EmailJS monthly quota

### 10. Alternative Solutions

If EmailJS still doesn't work:
1. **Try Formspree** - Another email service
2. **Use Netlify Forms** - If hosting on Netlify
3. **Create a simple PHP backend** - If you have server access

## 🆘 Still Having Issues?

1. **Screenshot the console error** and share it
2. **Check your EmailJS dashboard** for any service alerts
3. **Verify all credentials** are exactly as shown in EmailJS

The most common issue is usually a mismatch between the template variables and what the code sends, or an inactive email service.
