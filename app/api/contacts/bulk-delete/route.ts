import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { ids } = await request.json()

    const { error } = await supabase.from("contacts").delete().in("id", ids)

    if (error) throw error

    return NextResponse.json({ message: `${ids.length} contact(s) deleted` })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
