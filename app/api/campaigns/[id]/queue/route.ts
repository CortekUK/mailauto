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

    // Get recipients based on audience
    let recipients: any[] = []

    console.log("📧 Queue campaign:", id)
    console.log("📧 Campaign audience_id:", campaign.audience_id)
    console.log("📧 Campaign audience_type:", campaign.audience_type)

    if (campaign.audience_id) {
      // Get audience with contact_emails
      const { data: audience, error: audienceError } = await supabase
        .from("audiences")
        .select("*")
        .eq("id", campaign.audience_id)
        .single()

      console.log("📧 Audience data:", JSON.stringify(audience, null, 2))
      console.log("📧 Audience error:", audienceError)

      if (audience?.contact_emails) {
        // Parse contact_emails (stored as JSON array of emails)
        const contactEmails = typeof audience.contact_emails === 'string'
          ? JSON.parse(audience.contact_emails)
          : audience.contact_emails

        console.log("📧 Contact emails from audience:", contactEmails?.length, "emails")
        console.log("📧 First few emails:", contactEmails?.slice(0, 3))

        // Filter to only those emails in the audience
        const emailSet = new Set(contactEmails.map((e: string) => e.toLowerCase()))

        // Fetch contacts from Supabase (don't filter by status - use audience emails directly)
        const { data: contacts, error: contactsError } = await supabase
          .from('contacts')
          .select('*')

        console.log("📧 Total contacts in Supabase:", contacts?.length)
        console.log("📧 Contacts error:", contactsError)
        console.log("📧 First contact sample:", contacts?.[0])

        recipients = (contacts || [])
          .filter((contact: any) => {
            const email = contact.email?.toLowerCase()
            // Include contact if email is in audience and status is not 'unsubscribed'
            const isInAudience = email && emailSet.has(email)
            const isNotUnsubscribed = contact.status !== 'unsubscribed'
            if (email && isInAudience) {
              console.log(`📧 Contact ${email} - inAudience: ${isInAudience}, status: ${contact.status}`)
            }
            return isInAudience && isNotUnsubscribed
          })
          .map((contact: any) => ({
            id: contact.id,
            email: contact.email,
            name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || null,
            first_name: contact.first_name,
            last_name: contact.last_name,
            company: contact.company,
            city: contact.city,
            state: contact.state,
            country: contact.country,
          }))
      }
    } else if (campaign.audience_type === "all_subscribers" || campaign.audience_type === "all") {
      // Get all subscribers from Supabase (exclude unsubscribed)
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .or('status.is.null,status.neq.unsubscribed')

      recipients = (contacts || [])
        .filter((contact: any) => contact.email)
        .map((contact: any) => ({
          id: contact.id,
          email: contact.email,
          name: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || null,
          first_name: contact.first_name,
          last_name: contact.last_name,
          company: contact.company,
          city: contact.city,
          state: contact.state,
          country: contact.country,
        }))
    }

    console.log("📧 Final recipients count:", recipients.length)
    console.log("📧 First recipient:", recipients[0])

    if (recipients.length === 0) {
      return NextResponse.json({
        message: "No recipients found for this campaign",
        debug: {
          audience_id: campaign.audience_id,
          audience_type: campaign.audience_type
        }
      }, { status: 400 })
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
      contact_id: contact.id || null,
      email: contact.email,
      name: contact.name,
      first_name: contact.first_name || null,
      last_name: contact.last_name || null,
      company: contact.company || null,
      status: "pending"
    }))

    console.log("Inserting recipient records:", JSON.stringify(recipientRecords.slice(0, 2), null, 2))

    const { error: insertError } = await supabase
      .from("campaign_recipients")
      .insert(recipientRecords)

    if (insertError) {
      console.error("Failed to create recipient records:", insertError)
      console.error("Error details:", JSON.stringify(insertError, null, 2))
      return NextResponse.json({
        message: "Failed to create recipient records",
        error: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      }, { status: 500 })
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
    const scheduledTime = campaign.scheduled_at ? new Date(campaign.scheduled_at) : null
    const now = new Date()
    const isScheduled = scheduledTime && scheduledTime > now

    console.log(`📅 Schedule check for campaign ${id}:`)
    console.log(`   - scheduled_at raw: ${campaign.scheduled_at}`)
    console.log(`   - scheduled_at parsed: ${scheduledTime?.toISOString()}`)
    console.log(`   - current time: ${now.toISOString()}`)
    console.log(`   - is scheduled for future: ${isScheduled}`)

    if (isScheduled) {
      console.log(`⏰ Campaign ${id} scheduled for ${campaign.scheduled_at}. Will be sent by cron job.`)
      return NextResponse.json({
        ...data,
        message: `Campaign scheduled for ${scheduledTime!.toLocaleString()}`
      })
    }

    // Trigger immediate send for campaigns without future scheduling
    console.log(`Sending campaign ${id} immediately...`)

    // For large campaigns (100+), just return queued and let cron handle all batches
    const IMMEDIATE_SEND_THRESHOLD = 100

    if (recipients.length > IMMEDIATE_SEND_THRESHOLD) {
      console.log(`📦 Large campaign (${recipients.length} recipients) - will be processed in batches via cron`)
      return NextResponse.json({
        ...data,
        message: `Campaign queued with ${recipients.length} recipients. Sending in batches (this may take a few minutes).`,
        batchProcessing: true,
        totalRecipients: recipients.length,
        estimatedMinutes: Math.ceil(recipients.length / 100)
      })
    }

    // For smaller campaigns, send immediately
    const sendResult = await sendCampaignEmails(id)

    if (sendResult.success) {
      console.log(`Campaign ${id} sent successfully:`, sendResult.stats)
      return NextResponse.json({
        ...data,
        status: sendResult.stats?.hasMore ? 'sending' : 'sent',
        sendResult: sendResult.stats
      })
    } else {
      console.error(`Campaign ${id} send failed:`, sendResult.error)
      return NextResponse.json({
        ...data,
        sendError: sendResult.error
      })
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
