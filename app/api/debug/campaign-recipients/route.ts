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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const audienceId = searchParams.get('audienceId')

    if (!audienceId) {
      return NextResponse.json({ error: "audienceId required" }, { status: 400 })
    }

    const supabase = supabaseAdmin

    // Check audience exists
    const { data: audience, error: audienceError } = await supabase
      .from("audiences")
      .select("*")
      .eq("id", audienceId)
      .single()

    // Check audience_contacts entries
    const { data: audienceContacts, error: acError } = await supabase
      .from("audience_contacts")
      .select("*")
      .eq("audience_id", audienceId)

    // Try the same query as queue endpoint
    const { data: joinedContacts, error: joinError } = await supabase
      .from("audience_contacts")
      .select(`
        contact:contacts (
          id,
          email,
          name
        )
      `)
      .eq("audience_id", audienceId)

    // Get all contacts to see what's in there
    const { data: allContacts, error: contactsError } = await supabase
      .from("contacts")
      .select("*")

    return NextResponse.json({
      audienceId,
      audience: {
        data: audience,
        error: audienceError
      },
      audienceContacts: {
        count: audienceContacts?.length || 0,
        data: audienceContacts,
        error: acError
      },
      joinedContacts: {
        count: joinedContacts?.length || 0,
        data: joinedContacts,
        error: joinError,
        mapped: joinedContacts?.map((ac: any) => ac.contact).filter(Boolean)
      },
      allContacts: {
        count: allContacts?.length || 0,
        data: allContacts,
        error: contactsError
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
