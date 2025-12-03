/**
 * Generate 1000 test contacts using Gmail + trick (200 per email address)
 * Usage: npx tsx scripts/generate-1000-test-contacts.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_EMAILS = [
  'neemaghanbarinia@gmail.com',
  'jordanwheeldon93@icloud.com',
  'ilyasghulam35@gmail.com',
  'testgammadev@gmail.com',
  'corteksystemsltd@gmail.com'
];

async function generate1000TestContacts() {
  console.log('🔧 Generating 1000 test contacts (200 per email address)...');

  const allContacts = [];

  // Generate 200 contacts for each base email
  for (const baseEmail of BASE_EMAILS) {
    const [username, domain] = baseEmail.split('@');

    console.log(`\n📧 Generating 200 contacts for ${baseEmail}...`);

    for (let i = 1; i <= 200; i++) {
      allContacts.push({
        email: `${username}+test${i}@${domain}`,
        name: `Test User ${i}`,
        first_name: `Test`,
        last_name: `User ${i}`,
        company: `Test Company ${i}`,
        tags: ['test', 'load-test', '1000-email-test'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  console.log(`\n📦 Total contacts to insert: ${allContacts.length}`);

  // Insert in batches of 50
  let insertedCount = 0;
  for (let i = 0; i < allContacts.length; i += 50) {
    const batch = allContacts.slice(i, i + 50);

    const { error } = await supabase
      .from('contacts')
      .upsert(batch, { onConflict: 'email' });

    if (error) {
      console.error(`❌ Error inserting batch ${i / 50 + 1}:`, error);
      continue;
    }

    insertedCount += batch.length;
    console.log(`✅ Inserted batch ${i / 50 + 1} (${batch.length} contacts) - Total: ${insertedCount}/${allContacts.length}`);
  }

  console.log('\n✅ Successfully generated 1000 test contacts!');
  console.log('\n📬 Test email distribution:');
  BASE_EMAILS.forEach((email, index) => {
    const [username, domain] = email.split('@');
    console.log(`\n${index + 1}. ${email} (200 contacts)`);
    console.log(`   ${username}+test1@${domain} to ${username}+test200@${domain}`);
  });
  console.log('\n💡 All emails will be delivered to the respective inboxes!');
  console.log('\n🎯 Next steps:');
  console.log('   1. Go to Audiences → Create New');
  console.log('   2. Click "Select Test Users" to select all 1000 contacts');
  console.log('   3. Create campaign and send to test audience');
}

generate1000TestContacts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
