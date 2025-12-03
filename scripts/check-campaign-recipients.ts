/**
 * Check campaign recipients to understand why only 580 were sent
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCampaignRecipients() {
  // Get the most recent campaign
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, subject, status, total_recipients, sent_count, failed_count')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!campaigns || campaigns.length === 0) {
    console.log('❌ No campaigns found');
    return;
  }

  const campaign = campaigns[0];
  console.log('\n📧 Most Recent Campaign:');
  console.log('  ID:', campaign.id);
  console.log('  Subject:', campaign.subject);
  console.log('  Status:', campaign.status);
  console.log('  Total Recipients:', campaign.total_recipients);
  console.log('  Sent Count:', campaign.sent_count);
  console.log('  Failed Count:', campaign.failed_count);

  // Get all campaign recipients
  const { data: recipients, count: totalRecipients } = await supabase
    .from('campaign_recipients')
    .select('*', { count: 'exact' })
    .eq('campaign_id', campaign.id);

  console.log('\n📊 Campaign Recipients Breakdown:');
  console.log('  Total recipients in table:', totalRecipients);

  // Count by delivery status
  const statusCounts: Record<string, number> = {};
  recipients?.forEach(r => {
    const status = r.delivery_status || 'unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  console.log('\n  By delivery status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`    ${status}: ${count}`);
  });

  // Check the audience used
  const { data: campaignData } = await supabase
    .from('campaigns')
    .select('audience_id, audiences(name, contact_ids)')
    .eq('id', campaign.id)
    .single();

  if (campaignData?.audiences) {
    const audience = campaignData.audiences as any;
    console.log('\n👥 Audience Details:');
    console.log('  Name:', audience.name);
    console.log('  Contact IDs in audience:', audience.contact_ids?.length || 0);
  }

  // Sample some recipients to see their emails
  console.log('\n📋 Sample Recipients (first 10):');
  recipients?.slice(0, 10).forEach(r => {
    console.log(`  ${r.email} - ${r.delivery_status || 'unknown'}`);
  });
}

checkCampaignRecipients()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
