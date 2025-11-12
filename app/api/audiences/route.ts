import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: audiences, error } = await supabase
      .from("audiences")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) throw error

    // Get preview count for each audience (simplified - in production, evaluate rules)
    const audiencesWithCounts = await Promise.all(
      (audiences || []).map(async (audience) => {
        const { count } = await supabase.from("contacts").select("*", { count: "exact", head: true })

        return { ...audience, preview_count: count || 0 }
      }),
    )

    return NextResponse.json(audiencesWithCounts)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const payload = await request.json()

    const { data, error } = await supabase
      .from("audiences")
      .insert({
        name: payload.name,
        description: payload.description,
        rules: payload.rules || {},
      })
      .select()
      .single()

    if (error) throw error

    // Get preview count
    const { count } = await supabase.from("contacts").select("*", { count: "exact", head: true })

    return NextResponse.json({ ...data, preview_count: count || 0 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
