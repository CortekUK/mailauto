import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sheetDBService } from '@/lib/sheetdb/client';

// Initialize Supabase client with service role key for admin access
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

export async function POST(request: NextRequest) {
  const syncStartTime = new Date();

  try {
    console.log('🔄 Starting SheetDB to Supabase sync...');

    // Step 1: Fetch all subscribers from SheetDB
    console.log('📥 Fetching subscribers from SheetDB...');
    const sheetDBSubscribers = await sheetDBService.read();

    if (!Array.isArray(sheetDBSubscribers) || sheetDBSubscribers.length === 0) {
      console.log('⚠️ No subscribers found in SheetDB');
      return NextResponse.json({
        success: true,
        message: 'No subscribers to sync',
        stats: {
          total: 0,
          synced: 0,
          new: 0,
          updated: 0,
          failed: 0
        }
      });
    }

    console.log(`✅ Found ${sheetDBSubscribers.length} subscribers in SheetDB`);

    // Step 2: Prepare contact data for Supabase
    const contactsToSync = sheetDBSubscribers.map((subscriber: any) => ({
      email: subscriber.email?.toLowerCase().trim(),
      name: subscriber.name?.trim() || null,
      status: 'active',
      source: 'sheetdb',
      tags: []
    })).filter((contact: any) => contact.email); // Remove any without email

    console.log(`📝 Prepared ${contactsToSync.length} valid contacts for sync`);

    // Step 3: Sync to Supabase (upsert - insert or update)
    let newCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    for (const contact of contactsToSync) {
      try {
        // Check if contact exists
        const { data: existing } = await supabaseAdmin
          .from('contacts')
          .select('id, email')
          .eq('email', contact.email)
          .single();

        if (existing) {
          // Update existing contact
          const { error } = await supabaseAdmin
            .from('contacts')
            .update({
              name: contact.name,
              updated_at: new Date().toISOString()
            })
            .eq('email', contact.email);

          if (error) {
            console.error(`❌ Failed to update ${contact.email}:`, error);
            failedCount++;
            errors.push({ email: contact.email, error: error.message });
          } else {
            updatedCount++;
          }
        } else {
          // Insert new contact
          const { error } = await supabaseAdmin
            .from('contacts')
            .insert(contact);

          if (error) {
            console.error(`❌ Failed to insert ${contact.email}:`, error);
            failedCount++;
            errors.push({ email: contact.email, error: error.message });
          } else {
            newCount++;
          }
        }
      } catch (err: any) {
        console.error(`❌ Error processing ${contact.email}:`, err);
        failedCount++;
        errors.push({ email: contact.email, error: err.message });
      }
    }

    // Step 3.5: Handle deletions - Remove contacts from Supabase that are no longer in SheetDB
    console.log('🗑️ Checking for deleted contacts...');

    // Get all email addresses from SheetDB
    const sheetDBEmails = new Set(contactsToSync.map(c => c.email));

    // Get all contacts in Supabase with source='sheetdb'
    const { data: supabaseContacts } = await supabaseAdmin
      .from('contacts')
      .select('id, email')
      .eq('source', 'sheetdb');

    // Find contacts that are in Supabase but not in SheetDB anymore
    const contactsToDelete = supabaseContacts?.filter(
      contact => !sheetDBEmails.has(contact.email)
    ) || [];

    let deletedCount = 0;
    if (contactsToDelete.length > 0) {
      console.log(`🗑️ Found ${contactsToDelete.length} contacts to delete`);

      for (const contact of contactsToDelete) {
        try {
          const { error } = await supabaseAdmin
            .from('contacts')
            .delete()
            .eq('id', contact.id);

          if (error) {
            console.error(`❌ Failed to delete ${contact.email}:`, error);
          } else {
            deletedCount++;
            console.log(`✅ Deleted ${contact.email}`);
          }
        } catch (err: any) {
          console.error(`❌ Error deleting ${contact.email}:`, err);
        }
      }
    }

    const syncEndTime = new Date();
    const duration = syncEndTime.getTime() - syncStartTime.getTime();

    const stats = {
      total: contactsToSync.length,
      synced: newCount + updatedCount,
      new: newCount,
      updated: updatedCount,
      deleted: deletedCount,
      failed: failedCount,
      duration: `${duration}ms`
    };

    console.log('✅ Sync completed:', stats);

    // Step 4: Log the sync operation
    await supabaseAdmin.from('sync_log').insert({
      sync_type: 'sheetdb_to_supabase',
      status: failedCount > 0 ? (failedCount < contactsToSync.length ? 'partial' : 'failed') : 'success',
      total_records: contactsToSync.length,
      synced_records: newCount + updatedCount,
      failed_records: failedCount,
      new_records: newCount,
      updated_records: updatedCount,
      deleted_records: deletedCount,
      error_details: errors.length > 0 ? errors : null,
      started_at: syncStartTime.toISOString(),
      completed_at: syncEndTime.toISOString()
    });

    // Step 5: Update "All Subscribers" audience count
    const { data: allSubsAudience } = await supabaseAdmin
      .from('audiences')
      .select('id')
      .eq('type', 'sheetdb')
      .single();

    if (allSubsAudience) {
      const { count } = await supabaseAdmin
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      await supabaseAdmin
        .from('audiences')
        .update({ contact_count: count || 0 })
        .eq('id', allSubsAudience.id);
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed successfully`,
      stats,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Only return first 10 errors
    });

  } catch (error: any) {
    console.error('💥 Sync failed:', error);

    // Log failed sync
    await supabaseAdmin.from('sync_log').insert({
      sync_type: 'sheetdb_to_supabase',
      status: 'failed',
      error_message: error.message,
      started_at: syncStartTime.toISOString(),
      completed_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: false,
      error: error.message || 'Sync failed'
    }, { status: 500 });
  }
}

// GET endpoint to trigger sync (for convenience)
export async function GET(request: NextRequest) {
  return POST(request);
}
