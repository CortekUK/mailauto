/**
 * Generate 100 test contacts for campaign testing
 * Usage: npx tsx scripts/generate-test-contacts.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateTestContacts() {
  console.log('🔧 Generating 100 test contacts...');

  const testContacts = [];

  for (let i = 1; i <= 100; i++) {
    testContacts.push({
      email: `test${i}@example.com`,
      name: `Test User ${i}`,
      first_name: `Test`,
      last_name: `User ${i}`,
      company: `Test Company ${i}`,
      city: 'London',
      state: 'England',
      country: 'UK',
      tags: ['test', 'generated'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // Insert in batches of 50
  for (let i = 0; i < testContacts.length; i += 50) {
    const batch = testContacts.slice(i, i + 50);

    const { data, error } = await supabase
      .from('contacts')
      .upsert(batch, { onConflict: 'email' });

    if (error) {
      console.error(`❌ Error inserting batch ${i / 50 + 1}:`, error);
      continue;
    }

    console.log(`✅ Inserted batch ${i / 50 + 1} (${batch.length} contacts)`);
  }

  console.log('✅ Successfully generated 100 test contacts!');
  console.log('\n📧 Test emails:');
  console.log('   test1@example.com');
  console.log('   test2@example.com');
  console.log('   ...');
  console.log('   test100@example.com');
  console.log('\n💡 Next steps:');
  console.log('   1. Go to Audiences → Create New');
  console.log('   2. Select all test contacts (filter by tag: "test")');
  console.log('   3. Create campaign and send to test audience');
}

generateTestContacts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
