# EmailJS Setup Instructions for Greeter Contact Form

## Overview
Your contact form has been updated to use EmailJS, which allows sending emails directly from the frontend without requiring a backend server. Follow these steps to configure it properly.

## Step 1: Create EmailJS Account
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account (you can use your Gmail account)
3. Verify your email address

## Step 2: Create an Email Service
1. After logging in, click on "Email Services" in the dashboard
2. Click "Add New Service"
3. Select "Gmail" (or your preferred email service)
4. Connect your Gmail account `greeterindia@gmail.com`
5. Follow the authentication process to grant EmailJS permission

## Step 3: Create an Email Template
1. Go to "Email Templates" in the dashboard
2. Click "Create New Template"
3. Use the following template details:

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

## Step 4: Get Your Credentials
After setting up the service and template, you'll need:
1. **Public Key** - Found in Account → General → Public Key
2. **Service ID** - Found in Email Services → Your Gmail service
3. **Template ID** - Found in Email Templates → Your template

## Step 5: Update the Code
Replace the placeholder values in your ContactUs.html file:

### Line 1293 - Replace YOUR_PUBLIC_KEY:
```javascript
emailjs.init("YOUR_ACTUAL_PUBLIC_KEY_HERE");
```

### Line 1329 - Replace YOUR_SERVICE_ID and YOUR_TEMPLATE_ID:
```javascript
emailjs.send('YOUR_ACTUAL_SERVICE_ID', 'YOUR_ACTUAL_TEMPLATE_ID', templateParams)
```

## Step 6: Test the Form
1. Open your ContactUs.html page in a browser
2. Fill out the contact form with test data
3. Submit the form
4. Check your Gmail inbox for the test email

## Important Notes:
- The free EmailJS plan allows 200 emails per month
- All emails will be sent to `greeterindia@gmail.com`
- The form includes loading states and error handling
- If EmailJS fails to send, users will see an error message with alternative contact options

## Troubleshooting:
- **Email not sending**: Check your EmailJS dashboard for error logs
- **Authentication issues**: Re-connect your email service in EmailJS
- **Template errors**: Ensure all template variables match exactly ({{from_name}}, {{from_email}}, {{subject}}, {{message}})

## Security:
- Your public key is safe to expose in frontend code
- EmailJS handles the secure email sending process
- No backend server is required

Once configured, your contact form will send emails directly to your Gmail account!
