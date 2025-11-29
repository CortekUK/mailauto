import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const payload = await request.json()

    // Store emails directly (contact_ids are actually emails from SheetDB)
    const contactEmails = payload.contact_ids || []

    // Update the audience with contact_emails stored directly
    const { data: audience, error: audienceError } = await supabase
      .from("audiences")
      .update({
        name: payload.name,
        description: payload.description,
        contact_count: contactEmails.length,
        contact_emails: contactEmails, // Store emails directly
      })
      .eq("id", id)
      .select()
      .single()

    if (audienceError) throw audienceError

    return NextResponse.json({
      ...audience,
      contact_ids: contactEmails,
      preview_count: contactEmails.length
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Delete the audience (no need to delete from audience_contacts anymore)
    const { error } = await supabase.from("audiences").delete().eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
