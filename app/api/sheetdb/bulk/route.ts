import { NextRequest, NextResponse } from 'next/server';
import { sheetDBService } from '@/lib/sheetdb/client';

// Helper function to trigger sync to Supabase
async function triggerSync(request: NextRequest) {
  try {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    console.log('🔄 Auto-triggering sync to Supabase...');

    // Trigger sync in background (don't await to avoid slowing down the response)
    fetch(`${baseUrl}/api/sync/sheetdb-to-supabase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error('Auto-sync failed:', err));
  } catch (error) {
    console.error('Error triggering sync:', error);
  }
}

// POST: Bulk create rows in SheetDB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Bulk upload request body:', body);
    const { data } = body;

    if (!data || !Array.isArray(data)) {
      console.log('Bulk upload error: Invalid data format');
      return NextResponse.json(
        { success: false, error: 'Data must be an array' },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data to upload' },
        { status: 400 }
      );
    }

    // Validate each row has name and email
    const invalidRows = data.filter(row => !row.name || !row.email);
    if (invalidRows.length > 0) {
      console.log(`Found ${invalidRows.length} invalid rows`);
    }

    // Filter to only valid rows
    const validData = data.filter(row => row.name && row.email);

    if (validData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid data to upload' },
        { status: 400 }
      );
    }

    console.log(`Uploading ${validData.length} subscribers to SheetDB`);

    // SheetDB can handle bulk uploads by passing an array
    const result = await sheetDBService.create(validData);

    console.log('Bulk upload result:', result);

    // Auto-sync to Supabase
    triggerSync(request);

    return NextResponse.json({
      success: true,
      data: result,
      uploaded: validData.length,
      skipped: data.length - validData.length
    }, { status: 201 });
  } catch (error: any) {
    console.error('SheetDB bulk upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload data to SheetDB' },
      { status: 500 }
    );
  }
}
