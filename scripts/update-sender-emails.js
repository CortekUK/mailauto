// Script to update sender emails in database
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function updateSenderEmails() {
  console.log('🔄 Updating sender emails...');

  // Delete old emails
  const { error: deleteError } = await supabase
    .from('sender_emails')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Error deleting old emails:', deleteError);
  } else {
    console.log('✅ Deleted old sender emails');
  }

  // Add new verified emails
  const newEmails = [
    {
      email: 'hello@withloveleanne.co.uk',
      name: 'With Love Leanne',
      is_verified: true,
      verification_status: 'verified'
    },
    {
      email: 'onboarding@resend.dev',
      name: 'Resend Team',
      is_verified: true,
      verification_status: 'verified'
    }
  ];

  for (const email of newEmails) {
    const { data, error } = await supabase
      .from('sender_emails')
      .insert(email)
      .select()
      .single();

    if (error) {
      console.error(`❌ Error adding ${email.email}:`, error);
    } else {
      console.log(`✅ Added ${email.email}`);
    }
  }

  console.log('✅ Sender emails updated successfully!');
  process.exit(0);
}

updateSenderEmails().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
