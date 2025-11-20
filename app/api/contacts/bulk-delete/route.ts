import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { ids } = await request.json()

    // First, get all audiences affected by these contact deletions
    const { data: affectedAudiences } = await supabase
      .from("audience_contacts")
      .select("audience_id")
      .in("contact_id", ids)

    // Remove contacts from audience_contacts table
    await supabase.from("audience_contacts").delete().in("contact_id", ids)

    // Delete the contacts
    const { error } = await supabase.from("contacts").delete().in("id", ids)

    if (error) throw error

    // Update contact_count for affected audiences
    if (affectedAudiences && affectedAudiences.length > 0) {
      const uniqueAudienceIds = [...new Set(affectedAudiences.map(a => a.audience_id))]

      for (const audienceId of uniqueAudienceIds) {
        const { count } = await supabase
          .from("audience_contacts")
          .select("*", { count: "exact", head: true })
          .eq("audience_id", audienceId)

        await supabase
          .from("audiences")
          .update({ contact_count: count || 0 })
          .eq("id", audienceId)
      }
    }

    return NextResponse.json({ message: `${ids.length} contact(s) deleted` })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
