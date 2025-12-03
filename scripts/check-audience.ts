/**
 * Check the audience used in the campaign
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAudience() {
  // Get the most recent campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('id, subject, audience_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!campaign) {
    console.log('❌ No campaign found');
    return;
  }

  console.log('📧 Campaign:', campaign.subject);
  console.log('🎯 Audience ID:', campaign.audience_id);

  // Get audience details
  const { data: audience } = await supabase
    .from('audiences')
    .select('*')
    .eq('id', campaign.audience_id)
    .single();

  if (!audience) {
    console.log('❌ Audience not found');
    return;
  }

  console.log('\n👥 Audience Details:');
  console.log('  Name:', audience.name);
  console.log('  Description:', audience.description || '(none)');
  console.log('  Contact IDs count:', audience.contact_ids?.length || 0);

  // Check how many of those contacts still exist
  if (audience.contact_ids && audience.contact_ids.length > 0) {
    const { count: existingCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .in('email', audience.contact_ids);

    console.log('  Existing contacts:', existingCount);
  }

  // Check test contacts count
  const { count: testContactsCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .or('email.like.%+test%,email.like.test%@%');

  console.log('\n🧪 Total test contacts in database:', testContactsCount);
}

checkAudience()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
