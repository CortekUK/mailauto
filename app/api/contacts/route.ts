import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client
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
        .or('status.is.null,status.neq.unsubscribed');

      await supabaseAdmin
        .from('audiences')
        .update({ contact_count: count || 0 })
        .eq('id', allSubsAudience.id);
    }
  } catch (error) {
    console.error('Error updating audience count:', error);
  }
}

// GET: List all contacts
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .or('status.is.null,status.neq.unsubscribed')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('Contacts GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST: Create new contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, company, city, state, country, labels } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check for duplicate email
    const { data: existingContact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existingContact) {
      return NextResponse.json({
        success: false,
        error: 'This email is already subscribed',
        duplicate: true
      }, { status: 409 });
    }

    // Insert new contact
    const contact = {
      email: normalizedEmail,
      name: `${firstName || ''} ${lastName || ''}`.trim() || null,
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || null,
      labels: labels?.trim() || null,
      status: 'active',
      source: 'manual',
      tags: [],
    };

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .insert(contact)
      .select()
      .single();

    if (error) throw error;

    await updateAudienceCount();

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('Contacts POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create contact' },
      { status: 500 }
    );
  }
}

// PUT: Update existing contact
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, oldEmail, firstName, lastName, email, phone, company, city, state, country, labels } = body;

    if (!id && !oldEmail) {
      return NextResponse.json(
        { success: false, error: 'Contact ID or old email is required' },
        { status: 400 }
      );
    }

    const normalizedNewEmail = email?.toLowerCase().trim();
    const normalizedOldEmail = oldEmail?.toLowerCase().trim();

    // If email is being changed, check if new email already exists
    if (normalizedOldEmail && normalizedNewEmail && normalizedOldEmail !== normalizedNewEmail) {
      const { data: existingWithNewEmail } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('email', normalizedNewEmail)
        .single();

      if (existingWithNewEmail) {
        return NextResponse.json({
          success: false,
          error: 'Cannot change email: the new email is already in use',
          duplicate: true
        }, { status: 409 });
      }
    }

    const updateData = {
      email: normalizedNewEmail,
      name: `${firstName || ''} ${lastName || ''}`.trim() || null,
      first_name: firstName?.trim() || null,
      last_name: lastName?.trim() || null,
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || null,
      labels: labels?.trim() || null,
      updated_at: new Date().toISOString()
    };

    let query = supabaseAdmin.from('contacts').update(updateData);

    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('email', normalizedOldEmail);
    }

    const { data, error } = await query.select().single();

    if (error) throw error;

    await updateAudienceCount();

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    console.error('Contacts PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE: Delete contact
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email } = body;

    if (!id && !email) {
      return NextResponse.json(
        { success: false, error: 'Contact ID or email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email?.toLowerCase().trim();

    // Delete contact
    let query = supabaseAdmin.from('contacts').delete();

    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('email', normalizedEmail);
    }

    const { error } = await query;

    if (error) throw error;

    // Remove from all audiences that contain this email
    if (normalizedEmail) {
      const { data: audiences } = await supabaseAdmin
        .from('audiences')
        .select('id, contact_emails, contact_count');

      if (audiences) {
        for (const audience of audiences) {
          const emails = audience.contact_emails || [];
          const updatedEmails = emails.filter(
            (e: string) => e.toLowerCase() !== normalizedEmail
          );

          if (updatedEmails.length !== emails.length) {
            await supabaseAdmin
              .from('audiences')
              .update({
                contact_emails: updatedEmails,
                contact_count: updatedEmails.length
              })
              .eq('id', audience.id);
          }
        }
      }
    }

    await updateAudienceCount();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Contacts DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
