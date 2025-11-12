import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { rules } = await request.json()

    // Build query based on rules (simplified - in production, handle all rule types)
    let query = supabase.from("contacts").select("*", { count: "exact", head: true })

    // Apply basic filters from rules
    if (rules && Array.isArray(rules)) {
      for (const group of rules) {
        if (group.rules && Array.isArray(group.rules)) {
          for (const rule of group.rules) {
            if (rule.field === "unsubscribed" && rule.value === false) {
              query = query.is("unsubscribed_at", null)
            }
            if (rule.field === "tag" && rule.value) {
              query = query.contains("tags", [rule.value])
            }
          }
        }
      }
    }

    const { count, error } = await query

    if (error) throw error

    return NextResponse.json({ count: count || 0 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
