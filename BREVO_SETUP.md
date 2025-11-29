# Brevo Email Setup Guide

Your application now uses **Brevo (formerly Sendinblue)** for sending transactional emails via their API.

## Why Brevo?

- **Free tier**: 300 emails/day
- **Simple API**: No SMTP configuration needed
- **Fast & reliable**: Direct API integration
- **Great deliverability**: Better inbox placement
- **Easy setup**: Just add an API key

---

## Setup Instructions

### 1. Create a Brevo Account

1. Go to [https://www.brevo.com](https://www.brevo.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key

1. Log in to your Brevo account
2. Go to **Settings** → **SMTP & API** → **API Keys**
3. Click **Generate a new API key**
4. Give it a name (e.g., "MailAuto Production")
5. Copy the API key (you'll only see it once!)

### 3. Add API Key to Your Environment

Add the following to your `.env.local` file:

```env
BREVO_API_KEY=your-api-key-here
```

Replace `your-api-key-here` with the API key you copied from Brevo.

### 4. Configure Sender Email

1. In Brevo, go to **Settings** → **Senders & IP**
2. Add and verify your sender email address
3. Follow the verification steps (click the link in the verification email)
4. Add the same email to your Supabase `sender_emails` table with `is_verified = true`

### 5. Restart Your Dev Server

```bash
npm run dev
```

### 6. Test Your Setup

Create a test campaign and send it to verify everything works!

---

## Environment Variables

Required environment variable for Brevo:

- `BREVO_API_KEY` - Your Brevo API key from the dashboard

---

## Vercel Deployment

When deploying to Vercel:

1. Go to **Project Settings** → **Environment Variables**
2. Add the `BREVO_API_KEY` variable with your API key
3. Redeploy your application

---

## Rate Limits

**Free Tier:**
- 300 emails/day
- 9,000 emails/month

**Paid Plans:**
- Starting at $25/month for 20,000 emails
- No daily sending limits
- Advanced features like A/B testing, heat maps, etc.

---

## Troubleshooting

### Emails not sending?

1. **Check your API key**: Make sure `BREVO_API_KEY` is set correctly in `.env.local`
2. **Verify sender email**: The sender email must be verified in Brevo dashboard
3. **Check console logs**: Look for error messages in your terminal
4. **Check Brevo dashboard**: Go to **Statistics** → **Email** to see delivery status

### "API key not found" error?

- Restart your dev server after adding the `BREVO_API_KEY` to `.env.local`
- Make sure there are no extra spaces or quotes around the API key

### Emails going to spam?

- Verify your sender domain in Brevo
- Add SPF and DKIM records (Brevo provides these in Settings → Senders & IP)
- Warm up your sending reputation by starting with smaller volumes

---

## API Features

The Brevo client (`lib/brevo-client.ts`) provides:

- `sendEmail()` - Send a single transactional email
- `sendBatchEmails()` - Send multiple emails with rate limiting
- `replaceTemplateVariables()` - Replace {{variables}} in email content
- `verifyConnection()` - Test your Brevo API connection

---

## Monitoring & Analytics

Track your email performance in the Brevo dashboard:

1. Go to **Statistics** → **Email**
2. View:
   - Delivery rates
   - Open rates
   - Click rates
   - Bounce rates
   - Unsubscribes

---

## Additional Resources

- [Brevo API Documentation](https://developers.brevo.com/)
- [Brevo Node.js SDK](https://github.com/getbrevo/brevo-node)
- [Brevo Support](https://help.brevo.com/)

---

## Comparison: SMTP vs API

| Feature | SMTP | Brevo API |
|---------|------|-----------|
| Setup complexity | Medium | Easy |
| Speed | Slower | Faster |
| Reliability | Depends on provider | High |
| Analytics | Limited | Comprehensive |
| Error handling | Basic | Detailed |
| Rate limiting | Varies | Clear limits |

The Brevo API integration is recommended for better performance and easier management.
