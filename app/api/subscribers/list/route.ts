import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    // Get all synced subscribers from contacts table
    let query = supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false })

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data: subscribers, error } = await query

    if (error) throw error

    return NextResponse.json(subscribers || [])
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
