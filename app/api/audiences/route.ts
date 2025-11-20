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

    // Get contact IDs for each audience
    const audiencesWithContacts = await Promise.all(
      (audiences || []).map(async (audience) => {
        const { data: audienceContacts } = await supabase
          .from("audience_contacts")
          .select("contact_id")
          .eq("audience_id", audience.id)

        const contactIds = (audienceContacts || []).map((ac) => ac.contact_id)

        return {
          ...audience,
          contact_ids: contactIds,
          preview_count: contactIds.length
        }
      }),
    )

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

    // Create the audience
    const { data: audience, error: audienceError } = await supabase
      .from("audiences")
      .insert({
        name: payload.name,
        description: payload.description,
        type: 'manual',
        contact_count: payload.contact_ids?.length || 0,
      })
      .select()
      .single()

    if (audienceError) {
      console.error("Failed to create audience:", audienceError)
      throw audienceError
    }

    console.log("Audience created:", audience.id)

    // Add contacts to audience
    if (payload.contact_ids && payload.contact_ids.length > 0) {
      const audienceContactsData = payload.contact_ids.map((contactId: string) => ({
        audience_id: audience.id,
        contact_id: contactId,
      }))

      console.log(`Inserting ${audienceContactsData.length} contact relationships`)

      const { error: contactsError } = await supabase
        .from("audience_contacts")
        .insert(audienceContactsData)

      if (contactsError) {
        console.error("Failed to insert audience contacts:", contactsError)
        throw contactsError
      }

      console.log(`Successfully linked ${audienceContactsData.length} contacts to audience`)
    } else {
      console.log("No contacts to add to audience")
    }

    return NextResponse.json({
      ...audience,
      contact_ids: payload.contact_ids || [],
      preview_count: payload.contact_ids?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
