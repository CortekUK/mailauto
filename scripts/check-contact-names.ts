import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data } = await supabase
    .from('contacts')
    .select('email, name, first_name, last_name')
    .limit(15);

  console.log('Sample contacts:\n');
  data?.forEach(c => {
    console.log(`Email: ${c.email}`);
    console.log(`  name: "${c.name || '(empty)'}"`);
    console.log(`  first_name: "${c.first_name || '(empty)'}"`);
    console.log(`  last_name: "${c.last_name || '(empty)'}"`);
    console.log('');
  });
}

check().then(() => process.exit(0));
