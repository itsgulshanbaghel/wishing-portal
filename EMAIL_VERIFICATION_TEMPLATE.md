# Email Verification Template Setup

## 📧 Create Verification Email Template

You need to create a new EmailJS template for sending verification codes.

### **Step 1: Create New Template**

1. Go to EmailJS dashboard → **Email Templates**
2. Click **"Create New Template"**
3. Fill in the details below

### **Step 2: Template Details**

**Template Name:** Email Verification

**Template ID:** `template_verification` (this will be auto-generated)

**Subject Line:**
```
Verify your email address for Greeter
```

**Email Content:**
```
Hello {{to_name}},

Thank you for contacting Greeter! To ensure your email address is real, please verify it using the code below:

🔐 Your Verification Code: {{verification_code}}

This code will expire in 10 minutes. Enter this code on the contact form to send your message.

If you didn't request this verification, you can safely ignore this email.

Best regards,
The Greeter Team

---
This is an automated verification email from Greeter.
Company: {{company_name}}
```

### **Step 3: Save and Get Template ID**

1. Click **"Save"**
2. Copy the **Template ID** (it will be something like `template_xxxxxxxxx`)
3. Update the code in ContactUs.html line 1312:
   ```javascript
   return emailjs.send('service_greeter', 'YOUR_ACTUAL_VERIFICATION_TEMPLATE_ID', templateParams);
   ```

## 🔄 How the Verification System Works:

### **User Flow:**
1. User fills contact form and clicks "Send Message"
2. System sends 6-digit code to user's email
3. Verification input appears on the page
4. User enters the code
5. If correct → Message is sent to greeterindia@gmail.com
6. If incorrect → User can retry (max 3 attempts)

### **Security Features:**
- **6-digit random codes** (100000-999999)
- **3 attempt limit** to prevent guessing
- **Code regeneration** on resend
- **Session-based verification** (verifiedEmail variable)
- **Automatic cleanup** after verification

### **User Experience:**
- Clean verification interface with styling
- Real-time feedback on code entry
- Resend code functionality
- Attempt counter display
- Success/error messages

## 📧 What User Receives:

```
Hello John Doe,

Thank you for contacting Greeter! To ensure your email address is real, please verify it using the code below:

🔐 Your Verification Code: 728494

This code will expire in 10 minutes. Enter this code on the contact form to send your message.

If you didn't request this verification, you can safely ignore this email.

Best regards,
The Greeter Team

---
This is an automated verification email from Greeter.
Company: Greeter
```

## ⚠️ Important Notes:

- You need to create this template in EmailJS dashboard
- The template ID must match what's in the code (line 1312)
- Verification codes are 6 digits and randomly generated
- Users get 3 attempts before being blocked
- Verified emails are cached during the session

## 🚀 Benefits:

- **100% real emails** - Users must have access to the inbox
- **No fake emails** - Can't use temporary emails that can't be checked
- **Professional appearance** - Clean verification process
- **User-friendly** - Clear instructions and feedback

Create the verification template now and update the template ID in the code!
