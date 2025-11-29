import { NextResponse } from "next/server"
import { sheetDBService } from "@/lib/sheetdb/client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.toLowerCase()

    // Fetch directly from SheetDB (source of truth)
    const sheetData = await sheetDBService.read()

    // Transform SheetDB data to match expected format
    let index = 0
    const subscribers = (sheetData || []).map((row: any) => {
      const firstName = row['First Name'] || ''
      const lastName = row['Last Name'] || ''
      const email = row['Email 1'] || ''
      index++

      return {
        id: email || `contact-${index}`, // Use email as ID or generate one
        email: email,
        name: `${firstName} ${lastName}`.trim() || null,
        first_name: firstName,
        last_name: lastName,
        phone: row['Phone 1'] || null,
        company: row['Company'] || null,
        city: row['Address 1 - City'] || null,
        state: row['Address 1 - State/Region'] || null,
        country: row['Address 1 - Country'] || null,
        status: row['Email subscriber status'] || 'active',
        source: row['Source'] || 'sheetdb',
        created_at: row['Created At (UTC+0)'] || new Date().toISOString(),
      }
    }).filter((s: any) => s.email) // Only include rows with email

    // Filter by search if provided
    if (search) {
      const filtered = subscribers.filter((s: any) =>
        s.email?.toLowerCase().includes(search) ||
        s.name?.toLowerCase().includes(search) ||
        s.first_name?.toLowerCase().includes(search) ||
        s.last_name?.toLowerCase().includes(search) ||
        s.company?.toLowerCase().includes(search)
      )
      return NextResponse.json(filtered)
    }

    return NextResponse.json(subscribers)
  } catch (error: any) {
    console.error('Error fetching subscribers from SheetDB:', error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
