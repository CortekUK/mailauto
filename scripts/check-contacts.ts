import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkContacts() {
  // Get total contacts
  const { count: totalCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Total contacts:', totalCount);

  // Get test contacts
  const { count: testCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .or('email.like.%+test%,email.like.test%@%');

  console.log('🧪 Test contacts (with +test or test@):', testCount);

  // Get non-test contacts
  const { count: nonTestCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .not('email', 'like', '%+test%')
    .not('email', 'like', 'test%@%');

  console.log('👥 Non-test contacts:', nonTestCount);

  // Show sample of non-test contacts
  const { data: sampleContacts } = await supabase
    .from('contacts')
    .select('email, name, created_at')
    .not('email', 'like', '%+test%')
    .not('email', 'like', 'test%@%')
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('\n📋 Sample of non-test contacts (most recent):');
  sampleContacts?.forEach(c => console.log('  -', c.email, c.name || '(no name)'));
}

checkContacts().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
