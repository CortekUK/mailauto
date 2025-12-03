/**
 * Generate test contacts using Gmail + trick (youremail+1@gmail.com)
 * All emails will go to your inbox but count as separate contacts
 * Usage: npx tsx scripts/generate-real-test-contacts.ts your-email@gmail.com
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateRealTestContacts(baseEmail: string) {
  if (!baseEmail || !baseEmail.includes('@')) {
    console.error('❌ Please provide a valid email address');
    console.log('Usage: npx tsx scripts/generate-real-test-contacts.ts your-email@gmail.com');
    process.exit(1);
  }

  const [username, domain] = baseEmail.split('@');

  console.log(`🔧 Generating 100 test contacts using ${baseEmail}...`);
  console.log(`📧 All emails will be delivered to ${baseEmail}`);

  const testContacts = [];

  for (let i = 1; i <= 100; i++) {
    testContacts.push({
      email: `${username}+test${i}@${domain}`,
      name: `Test User ${i}`,
      first_name: `Test`,
      last_name: `User ${i}`,
      company: `Test Company ${i}`,
      tags: ['test', 'real-delivery'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Insert in batches of 50
  for (let i = 0; i < testContacts.length; i += 50) {
    const batch = testContacts.slice(i, i + 50);

    const { error } = await supabase
      .from('contacts')
      .upsert(batch, { onConflict: 'email' });

    if (error) {
      console.error(`❌ Error inserting batch ${i / 50 + 1}:`, error);
      continue;
    }

    console.log(`✅ Inserted batch ${i / 50 + 1} (${batch.length} contacts)`);
  }

  console.log('\n✅ Successfully generated 100 test contacts!');
  console.log(`\n📬 All emails will be delivered to: ${baseEmail}`);
  console.log('\n📧 Example test emails:');
  console.log(`   ${username}+test1@${domain}`);
  console.log(`   ${username}+test2@${domain}`);
  console.log(`   ...`);
  console.log(`   ${username}+test100@${domain}`);
  console.log('\n💡 Gmail/Outlook will treat these as the same inbox!');
}

const baseEmail = process.argv[2];
generateRealTestContacts(baseEmail)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
