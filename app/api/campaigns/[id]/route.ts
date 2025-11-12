import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: campaign, error } = await supabase
      .from("campaigns")
      .select(`
        *,
        audiences (
          id,
          name
        )
      `)
      .eq("id", id)
      .single()

    if (error) throw error

    return NextResponse.json(campaign)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
