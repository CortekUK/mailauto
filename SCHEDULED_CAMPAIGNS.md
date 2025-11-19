# Scheduled Campaigns

This feature allows you to schedule campaigns to be sent at a specific future date and time.

## How It Works

1. **Schedule a Campaign**: When creating a campaign, select "Schedule for later" and choose a date/time
2. **Queue the Campaign**: Click "Schedule & Send" - the campaign will be queued but NOT sent immediately
3. **Automatic Sending**: A cron job checks every minute for campaigns that are ready to send

## Production (Vercel)

The cron job is configured in `vercel.json` to run every minute:
```json
{
  "crons": [
    {
      "path": "/api/cron/send-scheduled",
      "schedule": "* * * * *"
    }
  ]
}
```

This runs automatically on Vercel with no additional setup required.

## Local Development

For local testing of scheduled campaigns, you have two options:

### Option 1: Manual Trigger
Call the cron endpoint manually when you want to check for scheduled campaigns:
```bash
curl http://localhost:3000/api/cron/send-scheduled
```

### Option 2: Auto-polling (Recommended for testing)
Open a second terminal and run:
```bash
# Check every minute
while true; do
  curl http://localhost:3000/api/cron/send-scheduled
  sleep 60
done
```

Or on Windows PowerShell:
```powershell
while ($true) {
  Invoke-WebRequest -Uri "http://localhost:3000/api/cron/send-scheduled"
  Start-Sleep -Seconds 60
}
```

## Testing

1. Create a campaign with "Schedule for later" selected
2. Set the date/time to 2-3 minutes in the future
3. Click "Schedule & Send"
4. The campaign will show status "queued"
5. After the scheduled time passes, the cron job will automatically send it
6. Check the campaign detail page - status will change to "sending" then "sent"

## Cron Schedule Format

The cron schedule uses standard cron syntax:
- `* * * * *` = Every minute
- `*/5 * * * *` = Every 5 minutes
- `0 * * * *` = Every hour
- `0 9 * * *` = Every day at 9 AM UTC

**Note**: Vercel cron jobs run in UTC timezone. Make sure to account for this when scheduling campaigns.
