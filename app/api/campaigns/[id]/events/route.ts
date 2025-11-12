import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: events, error } = await supabase
      .from("campaign_events")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json(events || [])
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
