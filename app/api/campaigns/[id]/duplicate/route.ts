import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get original campaign
    const { data: original, error: fetchError } = await supabase.from("campaigns").select("*").eq("id", id).single()

    if (fetchError) throw fetchError

    // Create duplicate as draft
    const { data: duplicate, error: createError } = await supabase
      .from("campaigns")
      .insert({
        subject: `${original.subject} (Copy)`,
        from_name: original.from_name,
        from_email: original.from_email,
        audience_id: original.audience_id,
        html: original.html,
        text_fallback: original.text_fallback,
        status: "draft",
      })
      .select()
      .single()

    if (createError) throw createError

    return NextResponse.json(duplicate)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
