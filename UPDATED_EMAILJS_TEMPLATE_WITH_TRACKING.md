# Updated EmailJS Template with Tracking Information

## 📧 Update Your EmailJS Template

Go to EmailJS dashboard → Email Templates → template_xvvfl1b and replace the content with this:

**Subject Line:**
```
New Contact Form Message from {{from_name}} - {{subject}}
```

**Email Content:**
```
You have received a new message from the Greeter contact form:

📝 Sender Details:
• Name: {{from_name}}
• Email: {{from_email}}
• Subject: {{subject}}

💬 Message:
{{message}}

🔍 Tracking Information:
{{tracking_info}}

---
📧 Quick Reply: Click here to email sender directly: mailto:{{from_email}}?subject=Re: {{subject}}

This email was sent automatically from your Greeter website contact form.
You can reply directly to {{from_email}} or use the mailto link above.
```

## 🛡️ Email Validation Features Added:

### 1. **Email Format Validation**
- Checks for valid email format (user@domain.com)
- Prevents obviously fake emails

### 2. **Suspicious Domain Blocking**
Blocks known temporary/fake email providers:
- 10minutemail.com
- tempmail.org
- guerrillamail.com
- mailinator.com
- throwaway.email
- fakeemail.com
- temp-mail.org
- yopmail.com
- maildrop.cc
- tempmail.com
- sharklasers.com
- getairmail.com

### 3. **User Tracking Information**
Captures:
- **Timestamp**: When the form was submitted
- **User Agent**: Browser and device information
- **Language**: User's preferred language
- **Timezone**: User's timezone

## 🚀 How It Works:

1. **User fills form** → Email validation runs
2. **If email is suspicious** → Form blocks submission with error message
3. **If email is valid** → Form submits with tracking data
4. **You receive email** with full sender details + tracking info

## 📊 What You'll See in Emails:

```
🔍 Tracking Information:
Timestamp: 2024-05-08T20:36:45.123Z
User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
Language: en-US
Timezone: Asia/Kolkata
```

## ⚠️ Error Messages Users Will See:

- **Invalid format**: "Please enter a valid email address."
- **Suspicious domain**: "Please use a legitimate email address. Temporary or fake emails are not allowed."

## 🔧 Benefits:

- **Prevents fake emails** from temporary email services
- **Tracks user information** for verification
- **Maintains professional appearance**
- **Easy reply functionality** with mailto links
- **Detailed tracking** for security analysis

Update your EmailJS template now to enable these features!
