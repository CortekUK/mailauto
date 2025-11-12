import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { ids, tag, action } = await request.json()

    // Fetch current contacts
    const { data: contacts, error: fetchError } = await supabase.from("contacts").select("id, tags").in("id", ids)

    if (fetchError) throw fetchError

    // Update each contact's tags
    const updates = contacts.map((contact) => {
      let newTags = contact.tags || []

      if (action === "add") {
        if (!newTags.includes(tag)) {
          newTags = [...newTags, tag]
        }
      } else if (action === "remove") {
        newTags = newTags.filter((t: string) => t !== tag)
      }

      return supabase.from("contacts").update({ tags: newTags }).eq("id", contact.id)
    })

    await Promise.all(updates)

    return NextResponse.json({
      message: `Tag ${action === "add" ? "added to" : "removed from"} ${ids.length} contact(s)`,
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
