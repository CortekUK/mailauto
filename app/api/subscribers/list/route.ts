import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase()

    let query = supabase
      .from('contacts')
      .select('*')
      .or('status.is.null,status.neq.unsubscribed')
      .order('created_at', { ascending: false })

    const { data: subscribers, error } = await query

    if (error) throw error

    // Filter by search if provided
    if (search) {
      const filtered = (subscribers || []).filter((s: any) =>
        s.email?.toLowerCase().includes(search) ||
        s.name?.toLowerCase().includes(search) ||
        s.first_name?.toLowerCase().includes(search) ||
        s.last_name?.toLowerCase().includes(search) ||
        s.company?.toLowerCase().includes(search)
      )
      return NextResponse.json(filtered)
    }

    return NextResponse.json(subscribers || [])
  } catch (error: any) {
    console.error('Error fetching subscribers:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
