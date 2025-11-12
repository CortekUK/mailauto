export const ValidationMessages = {
  subject: {
    required: "Subject is required",
    maxLength: "Subject must be 120 characters or less",
  },
  fromEmail: {
    required: "From Email is required",
    verified: "From Email must be a verified sender",
  },
  audience: {
    required: "Audience is required",
  },
  htmlBody: {
    required: "HTML body is required",
    minLength: "HTML body must be at least 50 characters",
  },
  schedule: {
    future: "Schedule must be in the future",
  },
  email: {
    required: "Email is required",
    invalid: "Please enter a valid email address",
  },
  name: {
    required: "Name is required",
  },
} as const

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateCampaign(data: {
  subject: string
  fromEmail: string
  audienceType: string
  audienceId: string
  htmlContent: string
  scheduleType: string
  scheduledAt: string
  senderEmails: Array<{ address: string; verified: boolean }>
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}

  // Subject validation
  if (!data.subject.trim()) {
    errors.subject = ValidationMessages.subject.required
  } else if (data.subject.length > 120) {
    errors.subject = ValidationMessages.subject.maxLength
  }

  // From Email validation
  if (!data.fromEmail) {
    errors.fromEmail = ValidationMessages.fromEmail.required
  } else {
    const senderEmail = data.senderEmails.find((e) => e.address === data.fromEmail)
    if (senderEmail && !senderEmail.verified) {
      errors.fromEmail = ValidationMessages.fromEmail.verified
    }
  }

  // Audience validation
  if (data.audienceType === "saved" && !data.audienceId) {
    errors.audience = ValidationMessages.audience.required
  }

  // HTML body validation
  if (!data.htmlContent.trim()) {
    errors.htmlBody = ValidationMessages.htmlBody.required
  } else if (data.htmlContent.trim().length < 50) {
    errors.htmlBody = ValidationMessages.htmlBody.minLength
  }

  // Schedule validation
  if (data.scheduleType === "schedule" && data.scheduledAt) {
    const scheduledDate = new Date(data.scheduledAt)
    if (scheduledDate <= new Date()) {
      errors.schedule = ValidationMessages.schedule.future
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
