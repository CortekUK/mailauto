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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = supabaseAdmin

    const { data: recipients, error } = await supabase
      .from("campaign_recipients")
      .select(`
        *,
        contacts (
          email,
          name
        )
      `)
      .eq("campaign_id", id)

    if (error) throw error

    return NextResponse.json(recipients || [])
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
