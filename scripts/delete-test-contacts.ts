/**
 * Delete test contacts
 * Usage: npx tsx scripts/delete-test-contacts.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteTestContacts() {
  console.log('🗑️  Deleting test contacts...');

  // Delete contacts that match test patterns
  const { data: contacts, error: fetchError } = await supabase
    .from('contacts')
    .select('id, email')
    .or('email.like.%+test%,email.like.test%@%');

  if (fetchError) {
    console.error('❌ Error fetching test contacts:', fetchError);
    process.exit(1);
  }

  if (!contacts || contacts.length === 0) {
    console.log('✅ No test contacts found to delete');
    process.exit(0);
  }

  console.log(`📧 Found ${contacts.length} test contacts to delete`);

  // Delete in batches
  const batchSize = 50;
  let deletedCount = 0;

  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    const ids = batch.map(c => c.id);

    const { error } = await supabase
      .from('contacts')
      .delete()
      .in('id', ids);

    if (error) {
      console.error(`❌ Error deleting batch ${i / batchSize + 1}:`, error);
      continue;
    }

    deletedCount += batch.length;
    console.log(`✅ Deleted batch ${i / batchSize + 1} (${batch.length} contacts)`);
  }

  console.log(`\n✅ Successfully deleted ${deletedCount} test contacts!`);
}

deleteTestContacts()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
