import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Use admin client to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: Request) {
  try {
    const now = new Date()
    const nowISO = now.toISOString()
    console.log(`🔍 Checking for scheduled campaigns at ${now.toLocaleString()} (${nowISO})`)

    // Find campaigns that are queued and scheduled for now or past
    const { data: campaigns, error } = await supabaseAdmin
      .from('campaigns')
      .select('id, subject, scheduled_at')
      .eq('status', 'queued')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', nowISO)

    if (error) {
      console.error('Error fetching scheduled campaigns:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!campaigns || campaigns.length === 0) {
      console.log('⏳ No campaigns ready to send')
      return NextResponse.json({
        message: 'No scheduled campaigns to send',
        processed: 0
      })
    }

    console.log(`📧 Found ${campaigns.length} campaign(s) ready to send:`)
    campaigns.forEach(c => {
      console.log(`   - "${c.subject}" scheduled for ${c.scheduled_at}`)
    })

    // Trigger send for each campaign
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    const results = []

    for (const campaign of campaigns) {
      try {
        console.log(`Sending campaign: ${campaign.subject} (ID: ${campaign.id})`)

        const response = await fetch(`${baseUrl}/api/campaigns/${campaign.id}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })

        const data = await response.json()

        results.push({
          campaignId: campaign.id,
          subject: campaign.subject,
          status: response.ok ? 'sent' : 'failed',
          data
        })

        console.log(`✅ Triggered send for campaign ${campaign.id}`)
      } catch (error: any) {
        console.error(`Failed to send campaign ${campaign.id}:`, error)
        results.push({
          campaignId: campaign.id,
          subject: campaign.subject,
          status: 'error',
          error: error.message
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${campaigns.length} scheduled campaign(s)`,
      processed: campaigns.length,
      results
    })

  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
