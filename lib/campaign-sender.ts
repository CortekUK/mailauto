import { createClient } from '@supabase/supabase-js';
import { sendEmail, replaceTemplateVariables, processHtmlForEmail } from '@/lib/brevo-client';

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

export interface SendCampaignResult {
  success: boolean;
  error?: string;
  stats?: {
    total: number;
    sent: number;
    failed: number;
  };
}

// Maximum emails to send per batch (to avoid timeout)
// With 60s timeout on Vercel Pro and ~200ms per email, we can safely do 100
const BATCH_SIZE = 100;

// Number of emails to send concurrently (parallel processing)
const CONCURRENT_SENDS = 5;

export async function sendCampaignEmails(campaignId: string): Promise<SendCampaignResult> {
  try {
    console.log(`📧 Starting to send campaign: ${campaignId}`);

    // Step 1: Get campaign details
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return { success: false, error: 'Campaign not found' };
    }

    // Check if campaign is in queued or sending status (sending = multi-batch in progress)
    if (campaign.status !== 'queued' && campaign.status !== 'sending') {
      return {
        success: false,
        error: `Campaign must be in 'queued' or 'sending' status. Current status: ${campaign.status}`
      };
    }

    // Step 2: Update campaign status to 'sending'
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    // Step 3: Get settings for default values (book_link, discount_code)
    const { data: settings } = await supabaseAdmin
      .from('settings')
      .select('*')
      .limit(1)
      .single();

    const defaultSettings = {
      book_link: settings?.default_book_link || '',
      discount_code: settings?.default_discount_code || '',
      brand_logo_url: settings?.brand_logo_url || '',
    };

    // Step 4: Get campaign recipients
    const { data: campaignRecipients, error: recipientsError } = await supabaseAdmin
      .from('campaign_recipients')
      .select(`
        *,
        contacts (
          id,
          email,
          name
        )
      `)
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    if (recipientsError) {
      console.error('Failed to fetch recipients:', recipientsError);
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);

      return { success: false, error: 'Failed to fetch recipients' };
    }

    const allRecipients = campaignRecipients?.map((cr: any) => ({
      recipient_id: cr.id,
      contact_id: cr.contacts?.id || cr.contact_id,
      email: cr.email || cr.contacts?.email,
      name: cr.name || cr.contacts?.name,
      first_name: cr.first_name || cr.contacts?.first_name,
      last_name: cr.last_name || cr.contacts?.last_name,
      phone: cr.contacts?.phone,
      company: cr.company || cr.contacts?.company,
      city: cr.contacts?.city,
      state: cr.contacts?.state,
      country: cr.contacts?.country,
    })) || [];

    console.log(`👥 Found ${allRecipients.length} pending recipients`);

    // Process only a batch at a time to avoid timeout
    const recipients = allRecipients.slice(0, BATCH_SIZE);
    const hasMoreRecipients = allRecipients.length > BATCH_SIZE;

    if (hasMoreRecipients) {
      console.log(`📦 Processing batch of ${recipients.length} (${allRecipients.length - BATCH_SIZE} remaining for next run)`);
    }

    if (recipients.length === 0) {
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);

      return { success: false, error: 'No pending recipients found for this campaign' };
    }

    // Step 4: Send emails to all recipients using concurrent processing
    let sentCount = 0;
    let failedCount = 0;

    // Helper function to send a single email
    async function sendToRecipient(recipient: typeof recipients[0]): Promise<{ success: boolean; email: string }> {
      try {
        const variables = {
          // Contact-specific variables
          first_name: recipient.first_name || recipient.name?.split(' ')[0] || '',
          last_name: recipient.last_name || recipient.name?.split(' ').slice(1).join(' ') || '',
          name: recipient.name || `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim(),
          email: recipient.email,
          phone: recipient.phone || '',
          company: recipient.company || '',
          city: recipient.city || '',
          state: recipient.state || '',
          country: recipient.country || '',
          // Default settings variables
          book_link: defaultSettings.book_link,
          discount_code: defaultSettings.discount_code,
          brand_logo_url: defaultSettings.brand_logo_url,
        };

        const personalizedSubject = replaceTemplateVariables(campaign.subject, variables);
        // Replace variables and add inline styles for email compatibility
        const htmlWithVariables = replaceTemplateVariables(campaign.html, variables);
        const personalizedHtml = processHtmlForEmail(htmlWithVariables);
        const personalizedText = campaign.text_fallback
          ? replaceTemplateVariables(campaign.text_fallback, variables)
          : undefined;

        const result = await sendEmail({
          to: recipient.email,
          from: campaign.from_email,
          subject: personalizedSubject,
          html: personalizedHtml,
          text: personalizedText,
          attachments: campaign.attachments || undefined
        });

        if (result.success) {
          await supabaseAdmin
            .from('campaign_recipients')
            .update({
              status: 'sent',
              delivery_status: 'sent',
              sent_at: new Date().toISOString(),
              provider_message_id: result.messageId
            })
            .eq('id', recipient.recipient_id);

          await supabaseAdmin
            .from('campaign_events')
            .insert({
              campaign_id: campaignId,
              event_type: 'sent',
              email: recipient.email
            });

          console.log(`✅ Sent to ${recipient.email}`);
          return { success: true, email: recipient.email };
        } else {
          await supabaseAdmin
            .from('campaign_recipients')
            .update({
              status: 'failed',
              delivery_status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: result.error
            })
            .eq('id', recipient.recipient_id);

          await supabaseAdmin
            .from('campaign_events')
            .insert({
              campaign_id: campaignId,
              event_type: 'failed',
              email: recipient.email
            });

          console.error(`❌ Failed to send to ${recipient.email}:`, result.error);
          return { success: false, email: recipient.email };
        }
      } catch (error: any) {
        console.error(`Error sending to ${recipient.email}:`, error);

        await supabaseAdmin
          .from('campaign_recipients')
          .update({
            status: 'failed',
            delivery_status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', recipient.recipient_id);

        return { success: false, email: recipient.email };
      }
    }

    // Process recipients in chunks of CONCURRENT_SENDS for parallel execution
    for (let i = 0; i < recipients.length; i += CONCURRENT_SENDS) {
      const chunk = recipients.slice(i, i + CONCURRENT_SENDS);
      const results = await Promise.all(chunk.map(sendToRecipient));

      results.forEach(r => {
        if (r.success) sentCount++;
        else failedCount++;
      });

      // Small delay between chunks to avoid rate limiting
      if (i + CONCURRENT_SENDS < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Step 5: Update campaign with status
    // If there are more recipients, keep status as 'sending' so cron picks it up again
    // Otherwise, mark as 'sent' or 'failed'

    if (hasMoreRecipients) {
      // Keep as 'sending' so cron job picks it up again for next batch
      // Update counts but don't change status
      const { data: currentCampaign } = await supabaseAdmin
        .from('campaigns')
        .select('sent_count, failed_count')
        .eq('id', campaignId)
        .single();

      await supabaseAdmin
        .from('campaigns')
        .update({
          status: 'sending', // Stay sending for next batch
          sent_count: (currentCampaign?.sent_count || 0) + sentCount,
          failed_count: (currentCampaign?.failed_count || 0) + failedCount
        })
        .eq('id', campaignId);

      console.log(`📦 Batch completed. Sent: ${sentCount}, Failed: ${failedCount}. ${allRecipients.length - BATCH_SIZE} recipients remaining for next batch.`);
    } else {
      // All recipients processed - finalize campaign
      const { data: currentCampaign } = await supabaseAdmin
        .from('campaigns')
        .select('sent_count, failed_count, total_recipients')
        .eq('id', campaignId)
        .single();

      const totalSent = (currentCampaign?.sent_count || 0) + sentCount;
      const totalFailed = (currentCampaign?.failed_count || 0) + failedCount;
      const finalStatus = totalSent === 0 ? 'failed' : 'sent';

      await supabaseAdmin
        .from('campaigns')
        .update({
          status: finalStatus,
          sent_at: new Date().toISOString(),
          sent_count: totalSent,
          failed_count: totalFailed
        })
        .eq('id', campaignId);

      console.log(`✅ Campaign completed. Total Sent: ${totalSent}, Total Failed: ${totalFailed}`);
    }

    return {
      success: true,
      stats: {
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
        hasMore: hasMoreRecipients,
        remaining: hasMoreRecipients ? allRecipients.length - BATCH_SIZE : 0
      }
    };

  } catch (error: any) {
    console.error('Campaign send error:', error);

    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'failed' })
      .eq('id', campaignId);

    return { success: false, error: error.message || 'Failed to send campaign' };
  }
}
