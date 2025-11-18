import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export default resend;

// Helper function to send a single email
export async function sendEmail({
  to,
  from,
  subject,
  html,
  text,
}: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}) {
  try {
    const result = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text: text || undefined,
    });

    return {
      success: true,
      messageId: result.data?.id,
      data: result.data,
    };
  } catch (error: any) {
    console.error('Resend error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

// Helper function to send batch emails (up to 100 at a time)
export async function sendBatchEmails(emails: Array<{
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}>) {
  try {
    // Resend supports batch sending (max 100 emails per request)
    const batches = [];
    const batchSize = 100;

    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize));
    }

    const results = [];

    for (const batch of batches) {
      const batchResult = await resend.batch.send(batch.map(email => ({
        from: email.from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text || undefined,
      })));

      results.push(batchResult);
    }

    return {
      success: true,
      results,
    };
  } catch (error: any) {
    console.error('Batch send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send batch emails',
    };
  }
}

// Replace template variables in email content
export function replaceTemplateVariables(content: string, variables: Record<string, string>): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value || '');
  }

  return result;
}
