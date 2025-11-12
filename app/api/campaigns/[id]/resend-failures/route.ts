import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get failed recipients
    const { data: failedRecipients, error: fetchError } = await supabase
      .from("campaign_recipients")
      .select("*")
      .eq("campaign_id", id)
      .in("delivery_status", ["failed", "bounced"])

    if (fetchError) throw fetchError

    // In a real implementation, you would trigger the email sending service here
    // For now, we'll just reset their status to pending
    const { error: updateError } = await supabase
      .from("campaign_recipients")
      .update({ delivery_status: "pending", error: null })
      .eq("campaign_id", id)
      .in("delivery_status", ["failed", "bounced"])

    if (updateError) throw updateError

    return NextResponse.json({ message: "Resending to failed recipients", count: failedRecipients?.length || 0 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
