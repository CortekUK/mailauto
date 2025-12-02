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

// Map Wix form fields to our schema
interface WixFormData {
  // Common Wix form field names (adjust based on your actual Wix form)
  firstName?: string;
  first_name?: string;
  'First Name'?: string;
  lastName?: string;
  last_name?: string;
  'Last Name'?: string;
  email?: string;
  Email?: string;
  'Email 1'?: string;
  phone?: string;
  Phone?: string;
  'Phone 1'?: string;
  company?: string;
  Company?: string;
  city?: string;
  City?: string;
  state?: string;
  State?: string;
  country?: string;
  Country?: string;
  // Allow any other fields
  [key: string]: string | undefined;
}

function extractField(data: WixFormData, ...keys: string[]): string {
  for (const key of keys) {
    if (data[key]) return data[key] as string;
  }
  return '';
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Received Wix form webhook');

    const body = await request.json();
    console.log('📝 Webhook payload:', JSON.stringify(body, null, 2));

    // Handle both direct form data and nested Wix webhook format
    const formData: WixFormData = body.data || body.formData || body;

    // Extract fields with multiple possible field name formats
    // Handle "Full Name" field - split into first/last if provided
    const fullName = extractField(formData, 'fullName', 'full_name', 'Full Name', 'full-name', 'FullName', 'name', 'Name');
    let firstName = extractField(formData, 'firstName', 'first_name', 'First Name', 'first-name', 'FirstName');
    let lastName = extractField(formData, 'lastName', 'last_name', 'Last Name', 'last-name', 'LastName');

    // If fullName is provided but firstName/lastName are not, split the fullName
    if (fullName && !firstName && !lastName) {
      const nameParts = fullName.trim().split(/\s+/);
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    const email = extractField(formData, 'email', 'Email', 'Email 1', 'email-address', 'emailAddress');
    const phone = extractField(formData, 'phone', 'Phone', 'Phone 1', 'phone-number', 'phoneNumber');
    const company = extractField(formData, 'company', 'Company', 'company-name', 'companyName');
    const city = extractField(formData, 'city', 'City', 'Address 1 - City');
    const state = extractField(formData, 'state', 'State', 'Address 1 - State/Region', 'region', 'Region');
    const country = extractField(formData, 'country', 'Country', 'Address 1 - Country');
    const message = extractField(formData, 'message', 'Message', 'Message Us', 'messageUs', 'message_us', 'notes', 'Notes');

    if (!email) {
      console.error('❌ No email provided in webhook');
      return NextResponse.json({
        success: false,
        error: 'Email is required'
      }, { status: 400 });
    }

    console.log(`✅ Extracted contact: ${firstName} ${lastName} <${email}>`);

    // Step 1: Add to SheetDB (Google Sheet)
    const sheetDBData = {
      'First Name': firstName,
      'Last Name': lastName,
      'Email 1': email.toLowerCase().trim(),
      'Phone 1': phone,
      'Company': company,
      'Address 1 - City': city,
      'Address 1 - State/Region': state,
      'Address 1 - Country': country,
      'Email subscriber status': 'subscribed',
      'Source': 'wix-form',
      'Created At (UTC+0)': new Date().toISOString(),
    };

    console.log('📤 Adding to SheetDB...');
    const sheetDBResult = await sheetDBService.create(sheetDBData);
    console.log('✅ SheetDB result:', sheetDBResult);

    // Step 2: Add/Update in Supabase for immediate consistency
    const supabaseContact = {
      email: email.toLowerCase().trim(),
      name: `${firstName} ${lastName}`.trim() || null,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      company: company || null,
      city: city || null,
      state: state || null,
      country: country || null,
      notes: message || null, // Store form message in notes field
      status: 'active',
      source: 'wix-form',
      tags: [],
    };

    console.log('📤 Upserting to Supabase...');

    // Check if contact exists
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('email', supabaseContact.email)
      .single();

    if (existing) {
      // Update existing contact
      const { error } = await supabaseAdmin
        .from('contacts')
        .update({
          ...supabaseContact,
          updated_at: new Date().toISOString()
        })
        .eq('email', supabaseContact.email);

      if (error) {
        console.error('❌ Supabase update error:', error);
      } else {
        console.log('✅ Contact updated in Supabase');
      }
    } else {
      // Insert new contact
      const { error } = await supabaseAdmin
        .from('contacts')
        .insert(supabaseContact);

      if (error) {
        console.error('❌ Supabase insert error:', error);
      } else {
        console.log('✅ Contact inserted in Supabase');
      }
    }

    // Step 3: Update audience count
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

    // Log the webhook event
    await supabaseAdmin.from('sync_log').insert({
      sync_type: 'wix_webhook',
      status: 'success',
      total_records: 1,
      synced_records: 1,
      new_records: existing ? 0 : 1,
      updated_records: existing ? 1 : 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Contact added successfully',
      contact: {
        email: supabaseContact.email,
        name: supabaseContact.name
      }
    });

  } catch (error: any) {
    console.error('💥 Webhook error:', error);

    // Log the error
    await supabaseAdmin.from('sync_log').insert({
      sync_type: 'wix_webhook',
      status: 'failed',
      error_message: error.message,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    }).catch(() => {}); // Don't fail if logging fails

    return NextResponse.json({
      success: false,
      error: error.message || 'Webhook processing failed'
    }, { status: 500 });
  }
}

// Allow GET for testing the endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Wix form webhook endpoint is active',
    usage: 'POST form data to this endpoint',
    expectedFields: {
      required: ['email'],
      optional: ['firstName', 'lastName', 'phone', 'company', 'city', 'state', 'country', 'message']
    },
    example: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      message: 'Hello, I would like more information...'
    }
  });
}
