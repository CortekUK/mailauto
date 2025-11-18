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

    const { data: emails, error } = await supabase
      .from("sender_emails")
      .select("id, email, name, is_verified, verification_status, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Map to frontend format
    const formattedEmails = emails?.map(email => ({
      id: email.id,
      address: email.email,
      display_name: email.name || email.email,
      verified: email.is_verified
    })) || []

    return NextResponse.json(formattedEmails)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin
    const payload = await request.json()

    const { data, error } = await supabase
      .from("sender_emails")
      .insert({
        name: payload.display_name,
        email: payload.address,
        is_verified: false,
        verification_status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
