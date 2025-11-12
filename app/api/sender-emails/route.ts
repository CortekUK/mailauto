import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: emails, error } = await supabase
      .from("from_emails")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(emails || [])
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const payload = await request.json()

    // Extract domain from email address
    const domain = payload.address.split("@")[1]

    const { data, error } = await supabase
      .from("from_emails")
      .insert({
        display_name: payload.display_name,
        email_address: payload.address,
        domain,
        is_verified: false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
