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

export async function GET() {
  try {
    const supabase = supabaseAdmin

    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select(`
        *,
        audiences (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Fetch all recipients and events for all campaigns
    const campaignIds = campaigns?.map(c => c.id) || []

    const { data: allRecipients } = await supabase
      .from("campaign_recipients")
      .select("campaign_id, delivery_status")
      .in("campaign_id", campaignIds)

    const { data: allEvents } = await supabase
      .from("campaign_events")
      .select("campaign_id, event_type, email")
      .in("campaign_id", campaignIds)

    // Calculate stats for each campaign
    const campaignsWithStats = campaigns?.map(campaign => {
      const recipients = allRecipients?.filter(r => r.campaign_id === campaign.id) || []
      const events = allEvents?.filter(e => e.campaign_id === campaign.id) || []

      const sent = recipients.filter(r => r.delivery_status === 'sent').length
      const delivered = sent
      const failures = recipients.filter(r => r.delivery_status === 'failed').length

      const openEvents = events.filter(e => e.event_type === 'opened')
      const opens = openEvents.length
      const unique_opens = new Set(openEvents.map(e => e.email)).size

      const clickEvents = events.filter(e => e.event_type === 'clicked')
      const clicks = clickEvents.length
      const unique_clicks = new Set(clickEvents.map(e => e.email)).size

      return {
        ...campaign,
        stats: {
          sent,
          delivered,
          opens,
          unique_opens,
          clicks,
          unique_clicks,
          failures
        }
      }
    }) || []

    return NextResponse.json(campaignsWithStats)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin
    const payload = await request.json()

    // If id exists, update; otherwise insert
    if (payload.id) {
      const { data, error } = await supabase
        .from("campaigns")
        .update({
          subject: payload.subject,
          from_name: payload.from_name,
          from_email: payload.from_email,
          preheader: payload.preheader,
          html: payload.html,
          text_fallback: payload.text_fallback,
          audience_id: payload.audience_id,
          audience_type: payload.audience_type,
          scheduled_at: payload.scheduled_at,
          attachments: payload.attachments || [],
        })
        .eq("id", payload.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    } else {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          subject: payload.subject,
          from_name: payload.from_name,
          from_email: payload.from_email,
          preheader: payload.preheader,
          html: payload.html,
          text_fallback: payload.text_fallback,
          audience_id: payload.audience_id,
          audience_type: payload.audience_type,
          scheduled_at: payload.scheduled_at,
          attachments: payload.attachments || [],
          status: "draft",
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
