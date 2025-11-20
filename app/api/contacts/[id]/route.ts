import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id } = params

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.first_name !== undefined) updateData.name = body.first_name
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.unsubscribed_at !== undefined) updateData.unsubscribed_at = body.unsubscribed_at

    const { data: contact, error } = await supabase.from("contacts").update(updateData).eq("id", id).select().single()

    if (error) throw error

    return NextResponse.json(contact)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { id } = params

    // First, get all audiences affected by this contact deletion
    const { data: affectedAudiences } = await supabase
      .from("audience_contacts")
      .select("audience_id")
      .eq("contact_id", id)

    // Remove contact from audience_contacts table
    await supabase.from("audience_contacts").delete().eq("contact_id", id)

    // Delete the contact
    const { error } = await supabase.from("contacts").delete().eq("id", id)

    if (error) throw error

    // Update contact_count for affected audiences
    if (affectedAudiences && affectedAudiences.length > 0) {
      const uniqueAudienceIds = [...new Set(affectedAudiences.map(a => a.audience_id))]

      for (const audienceId of uniqueAudienceIds) {
        const { count } = await supabase
          .from("audience_contacts")
          .select("*", { count: "exact", head: true })
          .eq("audience_id", audienceId)

        await supabase
          .from("audiences")
          .update({ contact_count: count || 0 })
          .eq("id", audienceId)
      }
    }

    return NextResponse.json({ message: "Contact deleted successfully" })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
