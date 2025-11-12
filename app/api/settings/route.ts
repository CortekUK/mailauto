import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: settings, error } = await supabase.from("settings").select("*").limit(1).single()

    if (error) {
      // If no settings exist, return defaults
      if (error.code === "PGRST116") {
        return NextResponse.json({
          default_book_link: "",
          default_discount_code: "",
          brand_logo_url: "",
          webhook_url: "",
          webhook_signing_secret: "",
        })
      }
      throw error
    }

    return NextResponse.json(settings)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const payload = await request.json()

    // Check if settings exist
    const { data: existing } = await supabase.from("settings").select("id").limit(1).single()

    if (existing) {
      // Update existing settings
      const { data, error } = await supabase.from("settings").update(payload).eq("id", existing.id).select().single()

      if (error) throw error
      return NextResponse.json(data)
    } else {
      // Insert new settings
      const { data, error } = await supabase.from("settings").insert(payload).select().single()

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
