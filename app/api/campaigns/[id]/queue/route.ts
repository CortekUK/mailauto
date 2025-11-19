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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = supabaseAdmin

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 })
    }

    // Get recipients based on audience type
    let recipients: any[] = []

    if (campaign.audience_type === "sheetdb" || campaign.audience_type === "all") {
      // Get all active contacts
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, email, name")
        .eq("status", "active")

      recipients = contacts || []
    } else if (campaign.audience_type === "saved" && campaign.audience_id) {
      // Get contacts from specific audience
      const { data: audienceContacts } = await supabase
        .from("audience_contacts")
        .select(`
          contact:contacts (
            id,
            email,
            name
          )
        `)
        .eq("audience_id", campaign.audience_id)

      recipients = audienceContacts?.map((ac: any) => ac.contact).filter(Boolean) || []
    }

    if (recipients.length === 0) {
      return NextResponse.json({ message: "No recipients found for this campaign" }, { status: 400 })
    }

    // Delete existing recipients and events first (in case campaign is being re-queued after editing)
    await supabase
      .from("campaign_recipients")
      .delete()
      .eq("campaign_id", id)

    await supabase
      .from("campaign_events")
      .delete()
      .eq("campaign_id", id)

    // Create campaign recipients records
    const recipientRecords = recipients.map(contact => ({
      campaign_id: id,
      contact_id: contact.id,
      email: contact.email,
      name: contact.name,
      status: "pending"
    }))

    const { error: insertError } = await supabase
      .from("campaign_recipients")
      .insert(recipientRecords)

    if (insertError) {
      console.error("Failed to create recipient records:", insertError)
      return NextResponse.json({ message: "Failed to create recipient records" }, { status: 500 })
    }

    // Update campaign status to queued and set total recipients
    const { data, error } = await supabase
      .from("campaigns")
      .update({
        status: "queued",
        total_recipients: recipients.length
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Check if campaign is scheduled for future
    const isScheduled = campaign.scheduled_at && new Date(campaign.scheduled_at) > new Date()

    if (isScheduled) {
      console.log(`Campaign ${id} scheduled for ${campaign.scheduled_at}. Will be sent by cron job.`)
      return NextResponse.json({
        ...data,
        message: `Campaign scheduled for ${new Date(campaign.scheduled_at).toLocaleString()}`
      })
    }

    // Trigger immediate send for campaigns without future scheduling
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = request.headers.get('host') || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    console.log(`Triggering immediate send for campaign ${id} at ${baseUrl}/api/campaigns/${id}/send`)

    // Trigger send endpoint (non-blocking)
    fetch(`${baseUrl}/api/campaigns/${id}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    }).then(res => {
      console.log(`Send trigger response: ${res.status}`)
      return res.json()
    }).then(data => {
      console.log('Send trigger result:', data)
    }).catch(err => {
      console.error('Failed to trigger campaign send:', err);
    });

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
