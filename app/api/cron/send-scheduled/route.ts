import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { sendCampaignEmails } from "@/lib/campaign-sender"

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

    const results = []

    for (const campaign of campaigns) {
      try {
        console.log(`Sending campaign: ${campaign.subject} (ID: ${campaign.id})`)

        // Call send function directly instead of HTTP request
        const sendResult = await sendCampaignEmails(campaign.id)

        results.push({
          campaignId: campaign.id,
          subject: campaign.subject,
          status: sendResult.success ? 'sent' : 'failed',
          stats: sendResult.stats,
          error: sendResult.error
        })

        if (sendResult.success) {
          console.log(`✅ Sent campaign ${campaign.id}:`, sendResult.stats)
        } else {
          console.error(`❌ Failed campaign ${campaign.id}:`, sendResult.error)
        }
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
