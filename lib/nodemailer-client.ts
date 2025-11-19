import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// SMTP configuration from environment variables
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
};

// Create reusable transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport(SMTP_CONFIG);
  }
  return transporter;
}

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
    const transporter = getTransporter();

    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || undefined,
    });

    return {
      success: true,
      messageId: result.messageId,
      data: result,
    };
  } catch (error: any) {
    console.error('SMTP send error:', error);
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

// Verify SMTP connection
export async function verifyConnection(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    return true;
  } catch (error: any) {
    console.error('❌ SMTP connection failed:', error.message);
    return false;
  }
}
