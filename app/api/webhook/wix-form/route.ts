import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  [key: string]: string | undefined;
}

function extractField(data: WixFormData, ...keys: string[]): string {
  for (const key of keys) {
    if (data[key]) return data[key] as string;
  }
  return '';
}

// Helper function to update audience count
async function updateAudienceCount() {
  try {
    const { data: allSubsAudience } = await supabaseAdmin
      .from('audiences')
      .select('id')
      .eq('type', 'all_subscribers')
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
  } catch (error) {
    console.error('Error updating audience count:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📥 Received Wix form webhook');

    const body = await request.json();
    console.log('📝 Webhook payload:', JSON.stringify(body, null, 2));

    // Handle various Wix webhook formats
    const formData: WixFormData = body.submissions || body.data || body.formData || body;

    // Extract fields with multiple possible field name formats
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
    const phone = extractField(formData, 'phone', 'Phone', 'Phone 1', 'phone-number', 'phoneNumber', 'phone_number_1', 'Phone Number');
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

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`✅ Extracted contact: ${firstName} ${lastName} <${normalizedEmail}>`);

    // Check if contact already exists
    const { data: existing } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    // If contact already exists, reject the submission (no duplicates allowed)
    if (existing) {
      console.log(`⏭️ Email ${normalizedEmail} already exists, rejecting submission`);
      return NextResponse.json({
        success: false,
        error: 'This email is already subscribed',
        duplicate: true
      }, { status: 409 });
    }

    // Insert new contact into Supabase
    const contact = {
      email: normalizedEmail,
      name: `${firstName} ${lastName}`.trim() || null,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: phone || null,
      company: company || null,
      city: city || null,
      state: state || null,
      country: country || null,
      notes: message || null,
      status: 'active',
      source: 'wix-form',
      tags: [],
    };

    console.log('📤 Inserting new contact in Supabase...');
    const { error } = await supabaseAdmin
      .from('contacts')
      .insert(contact);

    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }

    console.log('✅ Contact inserted in Supabase');

    // Update audience count
    await updateAudienceCount();

    // Log the webhook event
    await supabaseAdmin.from('sync_log').insert({
      sync_type: 'wix_webhook',
      status: 'success',
      total_records: 1,
      synced_records: 1,
      new_records: 1,
      updated_records: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Contact added successfully',
      contact: {
        email: contact.email,
        name: contact.name
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
    }).catch(() => {});

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
