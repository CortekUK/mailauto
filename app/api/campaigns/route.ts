import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select(`
        *,
        audiences (
          id,
          name
        )
      `)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(campaigns || [])
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const payload = await request.json()

    // If id exists, update; otherwise insert
    if (payload.id) {
      const { data, error } = await supabase
        .from("campaigns")
        .update({
          subject: payload.subject,
          body: payload.body,
          audience_id: payload.audience_id,
          scheduled_at: payload.scheduled_at,
        })
        .eq("id", payload.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    } else {
      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          subject: payload.subject,
          body: payload.body,
          audience_id: payload.audience_id,
          scheduled_at: payload.scheduled_at,
          status: "draft",
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
