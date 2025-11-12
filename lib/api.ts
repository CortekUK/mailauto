import { mockStore } from "./mock-store"

const API_BASE = process.env.API_BASE_URL || ""
const TOKEN = process.env.API_TOKEN || ""
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true" || !API_BASE

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

export function listContacts(query?: string) {
  if (USE_MOCK) return mockStore.listContacts(query)
  const params = query ? `?search=${encodeURIComponent(query)}` : ""
  return req(`/api/contacts${params}`)
}

export function createContact(payload: { email: string; first_name?: string; tags?: string[] }) {
  if (USE_MOCK) return mockStore.createContact(payload)
  return req("/api/contacts", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateContact(
  id: string,
  payload: { first_name?: string; tags?: string[]; unsubscribed_at?: string | null },
) {
  if (USE_MOCK) return mockStore.updateContact(id, payload)
  return req(`/api/contacts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export function deleteContacts(ids: string[]) {
  if (USE_MOCK) return mockStore.deleteContacts(ids)
  return req("/api/contacts/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  })
}

export function bulkAddTag(ids: string[], tag: string) {
  if (USE_MOCK) return mockStore.bulkAddTag(ids, tag)
  return req("/api/contacts/bulk-tag", {
    method: "POST",
    body: JSON.stringify({ ids, tag, action: "add" }),
  })
}

export function bulkRemoveTag(ids: string[], tag: string) {
  if (USE_MOCK) return mockStore.bulkRemoveTag(ids, tag)
  return req("/api/contacts/bulk-tag", {
    method: "POST",
    body: JSON.stringify({ ids, tag, action: "remove" }),
  })
}

export function bulkUnsubscribe(ids: string[]) {
  if (USE_MOCK) return mockStore.bulkUnsubscribe(ids)
  return req("/api/contacts/bulk-unsubscribe", {
    method: "POST",
    body: JSON.stringify({ ids }),
  })
}

export function importContacts(formData: FormData) {
  if (USE_MOCK) return mockStore.importContacts(formData)
  return req("/api/contacts/import", {
    method: "POST",
    body: formData,
  })
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

export function resendToFailures(id: string) {
  if (USE_MOCK) return mockStore.resendToFailures(id)
  return req(`/api/campaigns/${id}/resend-failures`, { method: "POST" })
}
