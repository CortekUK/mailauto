import { NextRequest, NextResponse } from 'next/server';
import { sheetDBService } from '@/lib/sheetdb/client';

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
