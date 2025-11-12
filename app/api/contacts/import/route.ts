import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ message: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    // Skip header row and parse CSV
    const contacts = lines.slice(1).map((line) => {
      const [email, first_name, tags] = line.split(",").map((s) => s.trim())
      return {
        email,
        first_name: first_name || null,
        tags: tags ? tags.split(";").filter(Boolean) : [],
      }
    })

    const { data, error } = await supabase.from("contacts").upsert(contacts, { onConflict: "email" }).select()

    if (error) throw error

    return NextResponse.json({ imported: data?.length || 0 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
