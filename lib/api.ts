import { mockStore } from "./mock-store"

const API_BASE = process.env.API_BASE_URL || ""
const TOKEN = process.env.API_TOKEN || ""
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

async function req(path: string, init?: RequestInit) {
  const headers: HeadersInit = {
    Authorization: `Bearer ${TOKEN}`,
    ...init?.headers,
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(init?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message || `Request failed with status ${res.status}`)
  }

  return res.json()
}

export function listCampaigns() {
  if (USE_MOCK) return mockStore.listCampaigns()
  return req("/api/campaigns")
}

export function createOrUpdateCampaign(payload: any) {
  if (USE_MOCK) return mockStore.createOrUpdateCampaign(payload)
  return req("/api/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function queueCampaign(id: string) {
  if (USE_MOCK) return mockStore.queueCampaign(id)
  return req(`/api/campaigns/${id}/queue`, { method: "POST" })
}

export function getCampaign(id: string) {
  if (USE_MOCK) return mockStore.getCampaign(id)
  return req(`/api/campaigns/${id}`)
}

export function sendTestEmail(payload: {
  from_name: string
  from_email: string
  subject: string
  html: string
  text_fallback: string
  to: string
}) {
  if (USE_MOCK) return mockStore.sendTestEmail(payload)
  return req("/api/email/test", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// Subscribers are managed via SheetDB and synced to Supabase
// For audiences, we fetch the synced data directly
export async function listContacts(query?: string) {
  if (USE_MOCK) return mockStore.listContacts(query)

  // Get synced subscribers from Supabase contacts table (used by audiences)
  const response = await fetch('/api/subscribers/list')
  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || 'Failed to fetch subscribers')
  }

  // Filter by query if provided
  if (query) {
    const q = query.toLowerCase()
    return result.filter((s: any) =>
      s.email?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q)
    )
  }

  return result
}

export function listAudiences() {
  if (USE_MOCK) return mockStore.listAudiences()
  return req("/api/audiences")
}

export function previewAudience(rules: any) {
  if (USE_MOCK) return mockStore.previewAudience(rules)
  return req("/api/audiences/preview", {
    method: "POST",
    body: JSON.stringify({ rules }),
  })
}

export function createAudience(payload: { name: string; description?: string; rules?: any }) {
  if (USE_MOCK) return mockStore.createAudience(payload)
  return req("/api/audiences", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateAudience(id: string, payload: { name: string; description?: string; rules?: any }) {
  if (USE_MOCK) return mockStore.updateAudience(id, payload)
  return req(`/api/audiences/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function deleteAudience(id: string) {
  if (USE_MOCK) return mockStore.deleteAudience(id)
  return req(`/api/audiences/${id}`, {
    method: "DELETE",
  })
}

export function getSettings() {
  if (USE_MOCK) return mockStore.getSettings()
  return req("/api/settings")
}

export function updateSettings(payload: any) {
  if (USE_MOCK) return mockStore.updateSettings(payload)
  return req("/api/settings", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function listSenderEmails() {
  if (USE_MOCK) return mockStore.listSenderEmails()
  return req("/api/sender-emails")
}

export function createSenderEmail(payload: { display_name: string; address: string }) {
  if (USE_MOCK) return mockStore.createSenderEmail(payload)
  return req("/api/sender-emails", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

// Campaign detail methods
export function getCampaignRecipients(id: string) {
  if (USE_MOCK) return mockStore.getCampaignRecipients(id)
  return req(`/api/campaigns/${id}/recipients`)
}

export function getCampaignEvents(id: string) {
  if (USE_MOCK) return mockStore.getCampaignEvents(id)
  return req(`/api/campaigns/${id}/events`)
}

export function cancelCampaign(id: string) {
  if (USE_MOCK) return mockStore.cancelCampaign(id)
  return req(`/api/campaigns/${id}/cancel`, { method: "POST" })
}

export function duplicateCampaign(id: string) {
  if (USE_MOCK) return mockStore.duplicateCampaign(id)
  return req(`/api/campaigns/${id}/duplicate`, { method: "POST" })
}

export function deleteCampaign(id: string) {
  if (USE_MOCK) return Promise.resolve({ success: true })
  return req(`/api/campaigns/${id}`, { method: "DELETE" })
}

export function resendToFailures(id: string) {
  if (USE_MOCK) return mockStore.resendToFailures(id)
  return req(`/api/campaigns/${id}/resend-failures`, { method: "POST" })
}
