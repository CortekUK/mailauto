import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // First, check the current status
    const { data: campaign, error: fetchError } = await supabase
      .from("campaigns")
      .select("status")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError

    // Only allow cancelling draft or queued campaigns
    if (!["draft", "queued"].includes(campaign.status)) {
      return NextResponse.json(
        { message: `Cannot cancel a campaign with status "${campaign.status}". Only draft or queued campaigns can be cancelled.` },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("campaigns")
      .update({ status: "canceled" })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
