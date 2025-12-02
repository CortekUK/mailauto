# Wix Form Integration Setup Guide

This document outlines what's needed to connect your Wix website form to the MailAuto application.

## What You Need From the Site Owner

Before setting up the integration, you need:

1. **Edit Access to Wix Dashboard** - You need permission to access the Wix Automations feature
2. **Form Name** - Know which form on the website you want to connect (e.g., the contact form at /contact)

---

## Setup Instructions (For Site Owner)

### Step 1: Access Wix Automations

1. Go to your Wix Dashboard at https://www.wix.com/dashboard
2. In the left sidebar, click **Automations**
3. Click **+ New Automation**

### Step 2: Create the Automation

1. **Trigger**: Select "Wix Forms" → "Form is submitted"
2. **Choose your form**: Select the contact form (or whichever form you want to connect)
3. **Action**: Select "Send an HTTP request" (also called "Webhook" or "HTTP Request")

### Step 3: Configure the Webhook

Enter the following details:

| Field | Value |
|-------|-------|
| **Request URL** | `https://cortek-mailauto.vercel.app/api/webhook/wix-form` |
| **HTTP Method** | `POST` |
| **Content-Type** | `application/json` |

Your production webhook URL is: `https://cortek-mailauto.vercel.app/api/webhook/wix-form`

### Step 4: Configure Request Body

Select **JSON format** and map your form fields. The webhook expects these field names:

```json
{
  "firstName": "{{First Name field}}",
  "lastName": "{{Last Name field}}",
  "email": "{{Email field}}",
  "phone": "{{Phone field}}",
  "company": "{{Company field}}",
  "city": "{{City field}}",
  "state": "{{State/Region field}}",
  "country": "{{Country field}}",
  "message": "{{Message field}}"
}
```

**Important**: Only `email` is required. All other fields are optional.

The webhook automatically handles many common field name formats:
- `firstName`, `first_name`, `First Name`, `FirstName`
- `email`, `Email`, `Email 1`
- etc.

### Step 5: Test the Automation

1. **Save** the automation
2. Go to your website and submit a test form
3. Check your MailAuto application - the new subscriber should appear in real-time
4. In Wix Automations, check the activity log to verify the webhook succeeded

---

## Troubleshooting

### Webhook Not Working?

1. **Check the URL**: Make sure you're using the correct domain (https, not http)
2. **Check Automation Status**: Make sure the automation is "Active" not "Paused"
3. **View Logs**: In Wix Automations, click on your automation and check "Activity" for error messages

### Subscriber Not Appearing?

1. **Check Email**: The email field is required - forms without email won't be processed
2. **Check Duplicates**: If the email already exists, it will update the existing record instead of creating a duplicate
3. **Check Server Logs**: View your Vercel deployment logs for any error messages

### Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | The webhook endpoint is public - this shouldn't happen. Check your middleware.ts |
| 400 Bad Request | Email field is missing or invalid |
| 500 Server Error | Check server logs for database connection issues |

---

## Technical Details

### Webhook Endpoint

```
POST /api/webhook/wix-form
```

### Request Body (Example)

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1 234 567 890",
  "message": "I would like more information about your services"
}
```

### Response (Success)

```json
{
  "success": true,
  "message": "Contact added successfully",
  "contact": {
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

### What Happens When Form is Submitted

1. Wix sends form data to the webhook
2. Webhook writes data to Google Sheet (SheetDB)
3. Webhook writes/updates data in Supabase
4. Application receives real-time update via Supabase subscription
5. New subscriber appears instantly in the UI

### Duplicate Prevention

- If someone submits with an email that already exists:
  - **In Supabase**: The existing record is updated (not duplicated)
  - **In Google Sheet**: A new row is added (SheetDB doesn't prevent duplicates)
  - **In UI**: Existing subscriber info is updated

---

## Quick Checklist

- [ ] Site owner grants edit access to Wix Dashboard
- [ ] Create new Automation in Wix
- [ ] Set trigger: "Wix Forms" → "Form is submitted"
- [ ] Set action: "Send HTTP request"
- [ ] Configure webhook URL: `https://YOUR-DOMAIN/api/webhook/wix-form`
- [ ] Set method: POST, Content-Type: application/json
- [ ] Map form fields to JSON body
- [ ] Activate the automation
- [ ] Test with a form submission
- [ ] Verify subscriber appears in MailAuto

---

## Need Help?

If you encounter issues:
1. Check the Wix Automation activity log
2. Check Vercel deployment logs
3. Test the endpoint directly using the GET method: `https://cortek-mailauto.vercel.app/api/webhook/wix-form`
