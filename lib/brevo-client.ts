import { TransactionalEmailsApi, TransactionalEmailsApiApiKeys, SendSmtpEmail, AccountApi, AccountApiApiKeys } from '@getbrevo/brevo';

// Initialize Brevo API client
let apiInstance: TransactionalEmailsApi | null = null;

function getBrevoClient(): TransactionalEmailsApi {
  if (!apiInstance) {
    apiInstance = new TransactionalEmailsApi();
    apiInstance.setApiKey(TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');
  }
  return apiInstance;
}

// Attachment type for email
export interface EmailAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

// Helper function to fetch attachment content and convert to base64
async function fetchAttachmentAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

// Helper function to send a single email
export async function sendEmail({
  to,
  from,
  subject,
  html,
  text,
  attachments,
}: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
}) {
  try {
    const client = getBrevoClient();

    const sendSmtpEmail: SendSmtpEmail = {
      to: [{ email: to }],
      sender: { email: from },
      subject: subject,
      htmlContent: html,
      textContent: text,
    };

    // Add attachments if provided
    if (attachments && attachments.length > 0) {
      const attachmentPromises = attachments.map(async (att) => {
        const content = await fetchAttachmentAsBase64(att.url);
        return {
          name: att.name,
          content: content,
        };
      });

      sendSmtpEmail.attachment = await Promise.all(attachmentPromises);
    }

    const result = await client.sendTransacEmail(sendSmtpEmail);

    return {
      success: true,
      messageId: result.body?.messageId,
      data: result,
    };
  } catch (error: any) {
    console.error('Brevo send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

// Helper function to send batch emails (one by one with delay to avoid rate limits)
export async function sendBatchEmails(
  emails: Array<{
    to: string;
    from: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: EmailAttachment[];
  }>,
  delayMs: number = 100 // Delay between emails to avoid rate limiting
) {
  const results = [];

  for (const email of emails) {
    const result = await sendEmail(email);
    results.push({ ...result, to: email.to });

    // Add delay between sends to avoid rate limiting
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.length - successCount;

  return {
    success: failureCount === 0,
    total: results.length,
    sent: successCount,
    failed: failureCount,
    results,
  };
}

// Replace template variables in email content
export function replaceTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, value || '');
  }

  return result;
}

// Verify Brevo API connection
export async function verifyConnection(): Promise<boolean> {
  try {
    // Try to get account info as a simple connection test
    const accountApi = new AccountApi();
    accountApi.setApiKey(AccountApiApiKeys.apiKey, process.env.BREVO_API_KEY || '');
    await accountApi.getAccount();
    console.log('✅ Brevo API connection verified successfully');
    return true;
  } catch (error: any) {
    console.error('❌ Brevo API connection failed:', error.message);
    return false;
  }
}
