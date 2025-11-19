#!/usr/bin/env node

/**
 * Local Development Cron Simulator
 *
 * This script polls the /api/cron/send-scheduled endpoint every minute
 * to simulate the Vercel cron job behavior in local development.
 *
 * Usage:
 *   node scripts/check-scheduled.js
 *
 * Or add to package.json scripts:
 *   "cron": "node scripts/check-scheduled.js"
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const INTERVAL = 60000 // 1 minute in milliseconds

console.log('🕐 Starting local cron simulator...')
console.log(`📡 Checking ${BASE_URL}/api/cron/send-scheduled every minute`)
console.log('Press Ctrl+C to stop\n')

async function checkScheduledCampaigns() {
  const now = new Date()
  const timeStr = now.toLocaleTimeString()
  const isoStr = now.toISOString()

  console.log(`[${timeStr}] Checking for scheduled campaigns... (Current UTC: ${isoStr})`)

  try {
    const response = await fetch(`${BASE_URL}/api/cron/send-scheduled`)
    const data = await response.json()

    if (response.ok) {
      if (data.processed > 0) {
        console.log(`✅ [${timeStr}] Processed ${data.processed} campaign(s)`)
        console.log(JSON.stringify(data.results, null, 2))
      } else {
        console.log(`⏳ [${timeStr}] ${data.message}`)
      }
    } else {
      console.error(`❌ [${timeStr}] Error:`, data.error || data.message)
    }
  } catch (error) {
    console.error(`❌ [${timeStr}] Failed to check scheduled campaigns:`, error.message)
  }

  console.log('') // blank line for readability
}

// Run immediately on start
checkScheduledCampaigns()

// Then run every minute
setInterval(checkScheduledCampaigns, INTERVAL)
