import { NextRequest, NextResponse } from 'next/server';
import { sheetDBService } from '@/lib/sheetdb/client';

// GET: Read data from SheetDB
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sheet = searchParams.get('sheet') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    // If search parameters are provided
    const searchColumn = searchParams.get('searchColumn');
    const searchValue = searchParams.get('searchValue');

    let data;
    if (searchColumn && searchValue) {
      data = await sheetDBService.search(searchColumn, searchValue, { sheet, limit, offset });
    } else {
      data = await sheetDBService.read({ sheet, limit, offset });
    }

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('SheetDB GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch data from SheetDB' },
      { status: 500 }
    );
  }
}

// POST: Create new rows in SheetDB
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('POST request body:', body);
    const { data, sheet } = body;

    if (!data) {
      console.log('POST error: No data provided');
      return NextResponse.json(
        { success: false, error: 'Data is required' },
        { status: 400 }
      );
    }

    console.log('Calling sheetDBService.create with:', { data, sheet });
    const result = await sheetDBService.create(data, { sheet });
    console.log('POST result:', result);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    console.error('SheetDB POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create data in SheetDB' },
      { status: 500 }
    );
  }
}

// PUT: Update existing rows in SheetDB
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { columnName, columnValue, data, sheet } = body;

    if (!columnName || !columnValue || !data) {
      return NextResponse.json(
        { success: false, error: 'columnName, columnValue, and data are required' },
        { status: 400 }
      );
    }

    const result = await sheetDBService.update(columnName, columnValue, data, { sheet });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    console.error('SheetDB PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update data in SheetDB' },
      { status: 500 }
    );
  }
}

// DELETE: Delete rows from SheetDB
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { columnName, columnValue, sheet } = body;

    if (!columnName || !columnValue) {
      return NextResponse.json(
        { success: false, error: 'columnName and columnValue are required' },
        { status: 400 }
      );
    }

    const result = await sheetDBService.delete(columnName, columnValue, { sheet });

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    console.error('SheetDB DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete data from SheetDB' },
      { status: 500 }
    );
  }
}
