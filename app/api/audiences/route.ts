import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: audiences, error } = await supabase
      .from("audiences")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Return audiences with contact_emails parsed from JSON
    const audiencesWithContacts = (audiences || []).map((audience) => {
      // Parse contact_emails if it's stored as JSON string
      let contactEmails: string[] = []
      if (audience.contact_emails) {
        try {
          contactEmails = typeof audience.contact_emails === 'string'
            ? JSON.parse(audience.contact_emails)
            : audience.contact_emails
        } catch {
          contactEmails = []
        }
      }

      return {
        ...audience,
        contact_ids: contactEmails, // Use emails as IDs for compatibility
        preview_count: contactEmails.length
      }
    })

    return NextResponse.json(audiencesWithContacts)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const payload = await request.json()

    console.log("Creating audience with payload:", payload)

    // Store emails directly in the audiences table (contact_ids are actually emails from SheetDB)
    const contactEmails = payload.contact_ids || []

    // Create the audience with contact_emails stored as JSON
    const { data: audience, error: audienceError } = await supabase
      .from("audiences")
      .insert({
        name: payload.name,
        description: payload.description,
        type: 'manual',
        contact_count: contactEmails.length,
        contact_emails: contactEmails, // Store emails directly
      })
      .select()
      .single()

    if (audienceError) {
      console.error("Failed to create audience:", audienceError)
      throw audienceError
    }

    console.log("Audience created:", audience.id, "with", contactEmails.length, "contacts")

    return NextResponse.json({
      ...audience,
      contact_ids: contactEmails,
      preview_count: contactEmails.length
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
