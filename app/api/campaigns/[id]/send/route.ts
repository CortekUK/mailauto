import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, replaceTemplateVariables } from '@/lib/resend-client';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;

  try {
    console.log(`📧 Starting to send campaign: ${campaignId}`);

    // Step 1: Get campaign details
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({
        success: false,
        error: 'Campaign not found'
      }, { status: 404 });
    }

    // Check if campaign is in queued status
    if (campaign.status !== 'queued') {
      return NextResponse.json({
        success: false,
        error: `Campaign must be in 'queued' status. Current status: ${campaign.status}`
      }, { status: 400 });
    }

    // Step 2: Update campaign status to 'sending'
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    // Step 3: Get campaign recipients (should already be created by queue endpoint)
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

      return NextResponse.json({
        success: false,
        error: 'Failed to fetch recipients'
      }, { status: 500 });
    }

    const recipients = campaignRecipients?.map((cr: any) => ({
      id: cr.contacts?.id || cr.contact_id,
      email: cr.email || cr.contacts?.email,
      name: cr.name || cr.contacts?.name
    })) || [];

    console.log(`👥 Found ${recipients.length} recipients`);

    if (recipients.length === 0) {
      await supabaseAdmin
        .from('campaigns')
        .update({ status: 'failed' })
        .eq('id', campaignId);

      return NextResponse.json({
        success: false,
        error: 'No pending recipients found for this campaign'
      }, { status: 400 });
    }

    // Step 5: Send emails to all recipients
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        // Replace template variables
        const variables = {
          first_name: recipient.name?.split(' ')[0] || '',
          name: recipient.name || '',
          email: recipient.email
        };

        const personalizedHtml = replaceTemplateVariables(campaign.html, variables);
        const personalizedText = campaign.text_fallback
          ? replaceTemplateVariables(campaign.text_fallback, variables)
          : undefined;

        // Send email via Resend
        const result = await sendEmail({
          to: recipient.email,
          from: campaign.from_email,
          subject: campaign.subject,
          html: personalizedHtml,
          text: personalizedText
        });

        if (result.success) {
          // Update recipient status to sent
          await supabaseAdmin
            .from('campaign_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              provider_message_id: result.messageId
            })
            .eq('campaign_id', campaignId)
            .eq('email', recipient.email);

          // Log event
          await supabaseAdmin
            .from('campaign_events')
            .insert({
              campaign_id: campaignId,
              event_type: 'sent',
              email: recipient.email,
              provider_event_id: result.messageId
            });

          sentCount++;
          console.log(`✅ Sent to ${recipient.email}`);
        } else {
          // Update recipient status to failed
          await supabaseAdmin
            .from('campaign_recipients')
            .update({
              status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: result.error
            })
            .eq('campaign_id', campaignId)
            .eq('email', recipient.email);

          // Log event
          await supabaseAdmin
            .from('campaign_events')
            .insert({
              campaign_id: campaignId,
              event_type: 'failed',
              email: recipient.email,
              provider_metadata: { error: result.error }
            });

          failedCount++;
          console.error(`❌ Failed to send to ${recipient.email}:`, result.error);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.error(`Error sending to ${recipient.email}:`, error);
        failedCount++;

        await supabaseAdmin
          .from('campaign_recipients')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('campaign_id', campaignId)
          .eq('email', recipient.email);
      }
    }

    // Step 6: Update campaign with final status and stats
    const finalStatus = failedCount === recipients.length ? 'failed' : 'sent';

    await supabaseAdmin
      .from('campaigns')
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        total_recipients: recipients.length,
        sent_count: sentCount,
        failed_count: failedCount
      })
      .eq('id', campaignId);

    console.log(`✅ Campaign send completed. Sent: ${sentCount}, Failed: ${failedCount}`);

    return NextResponse.json({
      success: true,
      message: 'Campaign sent successfully',
      stats: {
        total: recipients.length,
        sent: sentCount,
        failed: failedCount
      }
    });

  } catch (error: any) {
    console.error('Campaign send error:', error);

    // Update campaign status to failed
    await supabaseAdmin
      .from('campaigns')
      .update({ status: 'failed' })
      .eq('id', campaignId);

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send campaign'
    }, { status: 500 });
  }
}
