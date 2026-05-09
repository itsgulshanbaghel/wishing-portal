# Verification Template Parameter Fix

## 🔧 **Updated Parameter Names:**

I've changed the code to use these parameter names:
- `name` (instead of `to_name`)
- `email` (instead of `to_email`)
- `verification_code`
- `company_name`
- `reply_to`
- `from_name`

## 📧 **Update Your EmailJS Template:**

Go to EmailJS dashboard → Email Templates → template_96pkstd

**Update the template content to use:**

**Subject:**
```
Greeter - Email Verification Required
```

**Email Content:**
```
Dear {{name}},

Thank you for your interest in contacting Greeter. To ensure the security and authenticity of our communications, we need to verify your email address.

🔐 Your One-Time Verification Code: {{verification_code}}

Please enter this 6-digit code on the contact form to proceed with sending your message.

Important Information:
• This code is valid for 10 minutes only
• Never share this code with anyone
• Our team will never ask for your password
• If you didn't request this verification, please disregard this email

Once verified, your message will be delivered directly to our support team at greeterindia@gmail.com.

Thank you for your understanding and cooperation.

Best regards,

The Greeter Support Team
🌐 www.greeter.com
📧 support@greeter.com

---
This is an automated security message from Greeter.
Company: {{company_name}} | Verification ID: {{verification_code}}
```

## 🔄 **Also Update Template Settings:**

In the template editor, make sure:
- **"To Email"** field is set to: `{{email}}`
- **"Reply To"** field is set to: `{{email}}`
- **"From Name"** field is set to: "Greeter Verification"

## 🧪 **Test Again:**

After updating the template:
1. Try submitting the form
2. Check console for success message
3. Check your email for verification code

The parameter names should now match perfectly!
