# SMTP Setup Guide

Your application now uses **Nodemailer with SMTP** for sending emails. This works with ANY email provider that supports SMTP.

## Popular SMTP Providers

### 1. **Gmail** (Free - 500 emails/day)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Go to "App passwords"
4. Generate a new app password for "Mail"
5. Use that 16-character password (not your regular password!)

---

### 2. **Outlook/Hotmail** (Free)
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

---

### 3. **Yahoo Mail** (Free)
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

---

### 4. **SendGrid** (Free tier: 100 emails/day)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=YOUR_SENDGRID_API_KEY
```

---

### 5. **Mailgun** (Free tier: 100 emails/day)
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASSWORD=YOUR_MAILGUN_SMTP_PASSWORD
```

---

### 6. **Amazon SES** (Pay as you go - $0.10 per 1,000 emails)
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=YOUR_SES_SMTP_USERNAME
SMTP_PASSWORD=YOUR_SES_SMTP_PASSWORD
```

---

### 7. **Brevo (Sendinblue)** (Free tier: 300 emails/day)
```env
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-login
SMTP_PASSWORD=your-smtp-key
```

---

## Setup Instructions

1. **Choose your SMTP provider** from the list above
2. **Update `.env.local`** with your SMTP credentials
3. **Add sender email** to Supabase `sender_emails` table
4. **Restart your dev server**: `npm run dev`
5. **Create a test campaign** and send!

---

## Vercel Deployment

When deploying to Vercel:

1. Go to **Project Settings** → **Environment Variables**
2. Add all SMTP variables:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_SECURE`
   - `SMTP_USER`
   - `SMTP_PASSWORD`

Your send endpoint will automatically run as a **Serverless Function** (not Edge Function) with a 60-second timeout.

---

## Troubleshooting

### Emails not sending?
1. Check SMTP credentials are correct
2. For Gmail: Make sure you're using an **App Password**, not your regular password
3. Check dev server logs for error messages
4. Verify sender email is in `sender_emails` table with `is_verified = true`

### Timeout errors?
- Your SMTP provider might be rate limiting
- Increase delay between emails in `nodemailer-client.ts` (default: 100ms)

---

## Recommended Provider for Your Use Case

**Best option: Gmail** (if you have a Gmail account)
- ✅ Free
- ✅ 500 emails/day
- ✅ Works immediately with app password
- ✅ No DNS setup required
- ✅ Reliable delivery

**Alternative: Brevo**
- ✅ Free tier: 300 emails/day
- ✅ SMTP works without domain verification
- ✅ Good for testing
