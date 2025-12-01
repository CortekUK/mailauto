import { NextRequest, NextResponse } from 'next/server';
import { sheetDBService } from '@/lib/sheetdb/client';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client for updating audiences
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

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

    // Auto-sync to Supabase
    triggerSync(request);

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

    // Auto-sync to Supabase
    triggerSync(request);

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

    // If deleting by email, also remove from all audiences
    if (columnName === 'Email 1' && columnValue) {
      const deletedEmail = columnValue.toLowerCase();
      console.log(`🗑️ Removing ${deletedEmail} from all audiences...`);

      // Get all audiences that contain this email
      const { data: audiences, error: fetchError } = await supabaseAdmin
        .from('audiences')
        .select('id, contact_emails, contact_count');

      if (!fetchError && audiences) {
        for (const audience of audiences) {
          const emails = audience.contact_emails || [];
          const updatedEmails = emails.filter(
            (email: string) => email.toLowerCase() !== deletedEmail
          );

          // Only update if email was found in this audience
          if (updatedEmails.length !== emails.length) {
            await supabaseAdmin
              .from('audiences')
              .update({
                contact_emails: updatedEmails,
                contact_count: updatedEmails.length
              })
              .eq('id', audience.id);

            console.log(`✅ Removed ${deletedEmail} from audience ${audience.id}`);
          }
        }
      }
    }

    // Auto-sync to Supabase
    triggerSync(request);

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: any) {
    console.error('SheetDB DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete data from SheetDB' },
      { status: 500 }
    );
  }
}
