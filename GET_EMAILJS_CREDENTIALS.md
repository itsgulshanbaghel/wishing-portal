# How to Get EmailJS Public Key and Template ID

## 🔑 Getting Your Public Key

1. **Login to EmailJS Dashboard**
   - Go to [https://www.emailjs.com/](https://www.emailjs.com/)
   - Click "Sign In" and login to your account

2. **Find Your Public Key**
   - In the dashboard, click on **"Account"** (left sidebar)
   - Click on **"General"** tab
   - You'll see your **Public Key** displayed
   - Copy this key (it looks like: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

## 📧 Getting Your Template ID

1. **Go to Email Templates**
   - In the dashboard, click on **"Email Templates"** (left sidebar)
   - You should see your template (if you created one following the setup guide)
   - If you haven't created one yet, click **"Create New Template"**

2. **Get Template ID**
   - Click on your template name
   - You'll see the **Template ID** at the top right
   - Copy this ID (it looks like: `template_xxxxxxxxx`)

## 📝 If You Need to Create a Template

If you don't have a template yet:

1. Click **"Create New Template"**
2. Fill in these details:

**Template Name:** Greeter Contact Form

**Subject:** New Contact Form Message from {{from_name}} - {{subject}}

**Email Content:**
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

3. Click **"Save"**
4. Your Template ID will appear at the top right

## 🔄 Update Your Code

Once you have both credentials:

1. **Public Key** - Replace line 1293:
   ```javascript
   emailjs.init("YOUR_ACTUAL_PUBLIC_KEY_HERE");
   ```

2. **Template ID** - Replace line 1329:
   ```javascript
   emailjs.send('service_greeter', 'YOUR_ACTUAL_TEMPLATE_ID', templateParams)
   ```

## ✅ Quick Checklist

- [ ] Login to EmailJS dashboard
- [ ] Copy Public Key from Account → General
- [ ] Copy Template ID from Email Templates
- [ ] Update line 1293 with Public Key
- [ ] Update line 1329 with Template ID
- [ ] Test the contact form

## 🧪 Testing

After updating both credentials:
1. Open your ContactUs.html page
2. Fill out the form with test data
3. Submit the form
4. Check your Gmail inbox for the email

The form should now send emails directly to greeterindia@gmail.com!
