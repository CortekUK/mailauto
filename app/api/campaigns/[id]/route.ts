import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select(`
        *,
        audiences (
          id,
          name
        )
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    // Calculate stats from campaign_recipients and campaign_events
    const { data: recipients } = await supabase
      .from("campaign_recipients")
      .select("delivery_status")
      .eq("campaign_id", id)

    const { data: events } = await supabase
      .from("campaign_events")
      .select("event_type, email")
      .eq("campaign_id", id)

    // Calculate stats
    const sent = recipients?.filter(r => r.delivery_status === 'sent').length || 0
    const delivered = sent // For now, sent = delivered until we have delivery webhooks
    const failures = recipients?.filter(r => r.delivery_status === 'failed').length || 0

    const openEvents = events?.filter(e => e.event_type === 'opened') || []
    const opens = openEvents.length
    const unique_opens = new Set(openEvents.map(e => e.email)).size

    const clickEvents = events?.filter(e => e.event_type === 'clicked') || []
    const clicks = clickEvents.length
    const unique_clicks = new Set(clickEvents.map(e => e.email)).size

    const stats = {
      sent,
      delivered,
      opens,
      unique_opens,
      clicks,
      unique_clicks,
      failures
    }

    return NextResponse.json({ ...campaign, stats })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // First, check if campaign exists and its status
    const { data: campaign, error: fetchError } = await supabase
      .from("campaigns")
      .select("status")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError

    // Only allow deleting campaigns that are draft, queued, or failed
    if (!['draft', 'queued', 'failed'].includes(campaign.status)) {
      return NextResponse.json(
        { error: `Cannot delete campaign with status: ${campaign.status}` },
        { status: 400 }
      )
    }

    // Delete related data first (campaign_recipients, campaign_events)
    await supabase.from("campaign_recipients").delete().eq("campaign_id", id)
    await supabase.from("campaign_events").delete().eq("campaign_id", id)

    // Delete the campaign
    const { error: deleteError } = await supabase
      .from("campaigns")
      .delete()
      .eq("id", id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true, message: "Campaign deleted successfully" })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
