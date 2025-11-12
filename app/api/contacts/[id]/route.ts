import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { id } = params

    const updateData: any = {}
    if (body.first_name !== undefined) updateData.first_name = body.first_name
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.unsubscribed_at !== undefined) updateData.unsubscribed_at = body.unsubscribed_at

    const { data: contact, error } = await supabase.from("contacts").update(updateData).eq("id", id).select().single()

    if (error) throw error

    return NextResponse.json(contact)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
