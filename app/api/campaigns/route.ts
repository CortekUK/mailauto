import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

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

export async function GET() {
  try {
    const supabase = supabaseAdmin

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
    const supabase = supabaseAdmin
    const payload = await request.json()

    // If id exists, update; otherwise insert
    if (payload.id) {
      const { data, error } = await supabase
        .from("campaigns")
        .update({
          subject: payload.subject,
          from_name: payload.from_name,
          from_email: payload.from_email,
          preheader: payload.preheader,
          html: payload.html,
          text_fallback: payload.text_fallback,
          audience_id: payload.audience_id,
          audience_type: payload.audience_type,
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
          from_name: payload.from_name,
          from_email: payload.from_email,
          preheader: payload.preheader,
          html: payload.html,
          text_fallback: payload.text_fallback,
          audience_id: payload.audience_id,
          audience_type: payload.audience_type,
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
