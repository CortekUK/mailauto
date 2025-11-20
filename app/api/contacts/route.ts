import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    let query = supabase.from("contacts").select("*").order("created_at", { ascending: false })

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`)
    }

    const { data: contacts, error } = await query

    if (error) throw error

    return NextResponse.json(contacts || [])
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        email: body.email,
        name: body.name || body.first_name,
        tags: body.tags || [],
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(contact)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
