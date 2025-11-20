import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET() {
  try {
    const supabase = supabaseAdmin

    // Get all audiences
    const { data: audiences, error: audiencesError } = await supabase
      .from("audiences")
      .select("*")
      .order("created_at", { ascending: false })

    // For each audience, get contact count
    const audiencesWithCounts = await Promise.all(
      (audiences || []).map(async (audience) => {
        const { data: contacts, count } = await supabase
          .from("audience_contacts")
          .select("*", { count: "exact" })
          .eq("audience_id", audience.id)

        return {
          ...audience,
          actual_contact_count: count,
          contact_ids: contacts?.map(c => c.contact_id) || []
        }
      })
    )

    return NextResponse.json({
      total: audiences?.length || 0,
      audiences: audiencesWithCounts,
      error: audiencesError
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
