import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const payload = await request.json()

    // Update the audience
    const { data: audience, error: audienceError } = await supabase
      .from("audiences")
      .update({
        name: payload.name,
        description: payload.description,
        contact_count: payload.contact_ids?.length || 0,
      })
      .eq("id", id)
      .select()
      .single()

    if (audienceError) throw audienceError

    // Delete existing audience-contact relationships
    await supabase.from("audience_contacts").delete().eq("audience_id", id)

    // Add new contacts to audience
    if (payload.contact_ids && payload.contact_ids.length > 0) {
      const audienceContactsData = payload.contact_ids.map((contactId: string) => ({
        audience_id: id,
        contact_id: contactId,
      }))

      const { error: contactsError } = await supabase
        .from("audience_contacts")
        .insert(audienceContactsData)

      if (contactsError) throw contactsError
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Delete audience-contact relationships first
    await supabase.from("audience_contacts").delete().eq("audience_id", id)

    // Delete the audience
    const { error } = await supabase.from("audiences").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
