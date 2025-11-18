# MailAuto Setup Guide

Complete guide to set up your email campaign system with SheetDB, Supabase, and Resend.

---

## ✅ What's Been Set Up

1. **Database Schema** - Complete Supabase schema for campaigns, contacts, and tracking
2. **SheetDB Integration** - Subscriber management with Google Sheets
3. **Supabase Sync** - Automatic syncing from SheetDB to Supabase
4. **Resend Integration** - Professional email sending service
5. **Campaign System** - Full campaign creation, scheduling, and tracking

---

## 🚀 Setup Steps

### Step 1: Set Up Supabase Database

1. **Go to your Supabase project** (AutoMail)
   - URL: https://zxrrtakhaifsqhqxmnpw.supabase.co

2. **Run the Database Schema**
   - Open **SQL Editor** in Supabase dashboard
   - Copy the contents of `supabase-schema.sql` file
   - Paste and **Run** the SQL query
   - This will create all necessary tables

3. **Verify Tables Created**
   - Go to **Table Editor**
   - You should see these tables:
     - `contacts` - Your subscribers
     - `campaigns` - Email campaigns
     - `campaign_recipients` - Delivery tracking
     - `campaign_events` - Event log
     - `audiences` - Saved audience segments
     - `sender_emails` - Verified sender addresses
     - `sync_log` - Sync operation logs

✅ Your Supabase credentials are already configured in `.env.local`

---

### Step 2: Set Up Resend (Email Sending)

1. **Create Resend Account**
   - Go to https://resend.com
   - Sign up for a free account

2. **Get API Key**
   - Go to **API Keys** section
   - Click **Create API Key**
   - Copy the API key

3. **Add Resend Key to Environment**
   - Open `.env.local` file
   - Find the line: `RESEND_API_KEY=`
   - Paste your API key: `RESEND_API_KEY=re_your_key_here`

4. **Verify Sender Email**
   - In Resend dashboard, go to **Domains**
   - Add and verify your sending domain OR
   - Use Resend's test email for development

5. **Add Sender Email to Database**
   - Go to Supabase SQL Editor
   - Run this query (replace with your email):
   ```sql
   INSERT INTO sender_emails (email, name, is_verified, verification_status)
   VALUES ('your-email@yourdomain.com', 'Your Name', true, 'verified');
   ```

---

### Step 3: Sync Subscribers

1. **Add Subscribers to SheetDB**
   - Go to `/subscribers` page
   - Add subscribers manually or upload CSV
   - Your Google Sheet should have: `name` and `email` columns

2. **Sync to Supabase**
   - On the subscribers page, click **"Sync to Supabase"** button
   - This will copy all SheetDB subscribers to Supabase
   - You'll see a success message with sync stats

3. **Verify Sync**
   - Go to Supabase **Table Editor**
   - Open `contacts` table
   - Your subscribers should be there!

---

### Step 4: Restart Dev Server

**Important:** Restart your development server to load environment variables:

```bash
# Stop current server (Ctrl+C)
pnpm dev
```

---

## 📧 How to Send Your First Campaign

### 1. Create Campaign

1. Go to **Home page** (/)
2. Fill in campaign details:
   - **From Email**: Use your verified sender email
   - **Subject**: Your email subject
   - **Audience**: Select "All Subscribers" (SheetDB)
   - **HTML Content**: Write your email content

3. Use template variables:
   - `{{name}}` or `{{first_name}}` - Subscriber's name
   - `{{email}}` - Subscriber's email

### 2. Save Draft

- Click **"Save Draft"** to save your campaign
- Campaign will be saved to Supabase

### 3. Send Campaign

- Click **"Schedule & Send"**
- Choose "Send Now" or schedule for later
- Confirm sending

### 4. Track Results

- Campaign will be sent via Resend
- Go to **Campaigns** page to view stats
- Click on a campaign to see detailed analytics

---

## 🔄 How the System Works

### Data Flow:

```
SheetDB (Google Sheets)
   ↓
   ↓ [Sync Button]
   ↓
Supabase (contacts table)
   ↓
   ↓ [Campaign Creation]
   ↓
Campaigns (draft → queued → sending → sent)
   ↓
   ↓ [Send via Resend]
   ↓
Campaign Recipients (delivery tracking)
   ↓
   ↓ [Open/Click Events]
   ↓
Campaign Events (analytics)
```

### Key Features:

1. **Subscriber Management**
   - Add/Edit/Delete subscribers in SheetDB
   - Bulk CSV upload
   - Sync to Supabase for campaigns

2. **Campaign Creation**
   - Visual email composer
   - Template variables for personalization
   - Save drafts
   - Schedule or send immediately

3. **Email Delivery**
   - Sent via Resend (professional email service)
   - Track delivery status per recipient
   - Handle bounces and failures

4. **Analytics & Tracking**
   - Sent, delivered, opened, clicked counts
   - Per-recipient delivery status
   - Event timeline
   - Resend failed emails

---

## 🔧 API Endpoints

### Subscribers & Sync

- `GET/POST /api/sheetdb` - Manage SheetDB subscribers
- `POST /api/sync/sheetdb-to-supabase` - Sync subscribers to Supabase

### Campaigns

- `GET /api/campaigns` - List all campaigns
- `POST /api/campaigns` - Create/update campaign
- `GET /api/campaigns/[id]` - Get campaign details
- `POST /api/campaigns/[id]/queue` - Queue campaign for sending
- `POST /api/campaigns/[id]/send` - Process and send campaign
- `POST /api/campaigns/[id]/cancel` - Cancel queued campaign
- `GET /api/campaigns/[id]/recipients` - Get campaign recipients
- `GET /api/campaigns/[id]/events` - Get campaign events

---

## ⚠️ Important Notes

### Email Sending Limits

- **Resend Free Tier**: 100 emails/day, 3,000 emails/month
- For more, upgrade to Resend paid plan
- Consider adding rate limiting for large lists

### Best Practices

1. **Always Sync Before Campaigns**
   - Click "Sync to Supabase" before sending campaigns
   - Ensures Supabase has latest subscribers

2. **Verify Sender Email**
   - Add your domain to Resend
   - Verify DNS records
   - Better deliverability than test email

3. **Test Campaigns**
   - Use "Send Test Email" feature
   - Send to yourself first
   - Check spam folder

4. **Monitor Deliverability**
   - Check campaign stats regularly
   - High bounce rate? Check email list quality
   - Low open rate? Improve subject lines

---

## 🐛 Troubleshooting

### Campaign Not Sending?

1. Check Resend API key is set in `.env.local`
2. Verify sender email in `sender_emails` table
3. Check console for errors
4. Ensure campaign status is "queued"

### No Subscribers in Campaign?

1. Click "Sync to Supabase" button
2. Check `contacts` table in Supabase
3. Ensure subscribers have valid emails

### Emails Not Delivering?

1. Check Resend dashboard for errors
2. Verify sender domain is authenticated
3. Check recipient email addresses are valid
4. Review `campaign_events` for bounces

---

## 📊 Database Tables Overview

| Table | Purpose |
|-------|---------|
| `contacts` | All subscribers (synced from SheetDB) |
| `campaigns` | Email campaigns (draft, queued, sent) |
| `campaign_recipients` | Per-recipient delivery tracking |
| `campaign_events` | Detailed event log (sent, delivered, opened, clicked) |
| `audiences` | Saved audience segments |
| `sender_emails` | Verified sender email addresses |
| `sync_log` | SheetDB sync operation history |

---

## 🎯 Next Steps

1. ✅ Run database schema in Supabase
2. ✅ Get Resend API key and add to `.env.local`
3. ✅ Verify sender email in Resend
4. ✅ Add sender email to database
5. ✅ Restart dev server
6. ✅ Add subscribers via SheetDB
7. ✅ Click "Sync to Supabase"
8. ✅ Create your first campaign!

---

## 🆘 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Resend Docs**: https://resend.com/docs
- **SheetDB Docs**: https://docs.sheetdb.io

---

**Your email campaign system is ready! 🚀**

Just complete the setup steps above and you'll be sending professional email campaigns in minutes.
