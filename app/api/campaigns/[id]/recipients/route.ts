import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: recipients, error } = await supabase
      .from("campaign_recipients")
      .select(`
        *,
        contacts (
          email,
          first_name
        )
      `)
      .eq("campaign_id", id)

    if (error) throw error

    return NextResponse.json(recipients || [])
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
