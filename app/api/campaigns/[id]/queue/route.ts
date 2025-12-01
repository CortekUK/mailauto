import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { sheetDBService } from "@/lib/sheetdb/client"
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

    if (campaign.audience_id) {
      // Get audience with contact_emails
      const { data: audience } = await supabase
        .from("audiences")
        .select("contact_emails")
        .eq("id", campaign.audience_id)
        .single()

      if (audience?.contact_emails) {
        // Parse contact_emails (stored as JSON array of emails)
        const contactEmails = typeof audience.contact_emails === 'string'
          ? JSON.parse(audience.contact_emails)
          : audience.contact_emails

        // Fetch all subscribers from SheetDB
        const sheetData = await sheetDBService.read()

        // Filter to only those emails in the audience
        const emailSet = new Set(contactEmails.map((e: string) => e.toLowerCase()))

        recipients = (sheetData || [])
          .filter((row: any) => {
            const email = row['Email 1']?.toLowerCase()
            return email && emailSet.has(email)
          })
          .map((row: any) => ({
            id: row['Email 1'], // Use email as ID
            email: row['Email 1'],
            name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim() || null,
            first_name: row['First Name'],
            last_name: row['Last Name'],
            company: row['Company'],
            city: row['Address 1 - City'],
            state: row['Address 1 - State/Region'],
            country: row['Address 1 - Country'],
          }))
      }
    } else if (campaign.audience_type === "sheetdb" || campaign.audience_type === "all") {
      // Fallback: Get all subscribers from SheetDB
      const sheetData = await sheetDBService.read()

      recipients = (sheetData || [])
        .filter((row: any) => row['Email 1'])
        .map((row: any) => ({
          id: row['Email 1'],
          email: row['Email 1'],
          name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim() || null,
          first_name: row['First Name'],
          last_name: row['Last Name'],
          company: row['Company'],
          city: row['Address 1 - City'],
          state: row['Address 1 - State/Region'],
          country: row['Address 1 - Country'],
        }))
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

    // Create campaign recipients records (contact_id can be null for SheetDB contacts)
    const recipientRecords = recipients.map(contact => ({
      campaign_id: id,
      contact_id: null, // We don't use Supabase contact IDs anymore
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

    // Call send function directly instead of HTTP request
    const sendResult = await sendCampaignEmails(id)

    if (sendResult.success) {
      console.log(`Campaign ${id} sent successfully:`, sendResult.stats)
      return NextResponse.json({
        ...data,
        status: 'sent',
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
