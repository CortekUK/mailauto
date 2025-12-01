import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, replaceTemplateVariables } from '@/lib/brevo-client';

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
      recipient_id: cr.id, // campaign_recipient table ID
      contact_id: cr.contacts?.id || cr.contact_id,
      email: cr.email || cr.contacts?.email,
      name: cr.name || cr.contacts?.name,
      first_name: cr.contacts?.first_name,
      last_name: cr.contacts?.last_name,
      phone: cr.contacts?.phone,
      company: cr.contacts?.company,
      city: cr.contacts?.city,
      state: cr.contacts?.state,
      country: cr.contacts?.country,
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
        // Replace template variables - support for new schema
        const variables = {
          first_name: recipient.first_name || recipient.name?.split(' ')[0] || '',
          last_name: recipient.last_name || recipient.name?.split(' ').slice(1).join(' ') || '',
          name: recipient.name || `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim(),
          email: recipient.email,
          phone: recipient.phone || '',
          company: recipient.company || '',
          city: recipient.city || '',
          state: recipient.state || '',
          country: recipient.country || '',
        };

        const personalizedHtml = replaceTemplateVariables(campaign.html, variables);
        const personalizedText = campaign.text_fallback
          ? replaceTemplateVariables(campaign.text_fallback, variables)
          : undefined;

        // Send email via Brevo
        const result = await sendEmail({
          to: recipient.email,
          from: campaign.from_email,
          subject: campaign.subject,
          html: personalizedHtml,
          text: personalizedText,
          attachments: campaign.attachments || undefined
        });

        if (result.success) {
          // Update recipient status to sent
          await supabaseAdmin
            .from('campaign_recipients')
            .update({
              status: 'sent',
              delivery_status: 'sent',
              sent_at: new Date().toISOString(),
              provider_message_id: result.messageId
            })
            .eq('id', recipient.recipient_id);

          // Log event
          const { error: eventError } = await supabaseAdmin
            .from('campaign_events')
            .insert({
              campaign_id: campaignId,
              event_type: 'sent',
              email: recipient.email
            });

          if (eventError) {
            console.error('Failed to log event:', eventError);
          }

          sentCount++;
          console.log(`✅ Sent to ${recipient.email}`);
        } else {
          // Update recipient status to failed
          await supabaseAdmin
            .from('campaign_recipients')
            .update({
              status: 'failed',
              delivery_status: 'failed',
              failed_at: new Date().toISOString(),
              error_message: result.error
            })
            .eq('id', recipient.recipient_id);

          // Log event
          await supabaseAdmin
            .from('campaign_events')
            .insert({
              campaign_id: campaignId,
              event_type: 'failed',
              email: recipient.email
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
            delivery_status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', recipient.recipient_id);
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
