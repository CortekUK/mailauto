// Mock data store for local development without backend
// Simulates 300-600ms latency and includes 5% failure rate on queueCampaign

function delay(ms = Math.random() * 300 + 300) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function uuid() {
  return Math.random().toString(36).substring(2, 15)
}

// Seeded mock data
const campaigns = [
  {
    id: "camp_001",
    subject: "Welcome to Our Platform!",
    from_name: "Launch Team",
    from_email: "team@launchconsole.com",
    audience_id: "aud_001",
    audience_name: "All Subscribers",
    html: "<h1>Welcome!</h1><p>Hi {{first_name}}, we're excited to have you here.</p>",
    text_fallback: "Welcome! Hi {{first_name}}, we're excited to have you here.",
    status: "sent",
    scheduled_at: new Date(Date.now() - 86400000).toISOString(),
    sent_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    recipient_count: 5,
    sent_count: 5,
    delivered_count: 5,
    opened_count: 3,
    clicked_count: 1,
    failed_count: 0,
  },
  {
    id: "camp_002",
    subject: "Summer Sale - 30% Off!",
    from_name: "Marketing Team",
    from_email: "sales@launchconsole.com",
    audience_id: "aud_001",
    audience_name: "All Subscribers",
    html: "<h1>Summer Sale</h1><p>Get 30% off with code {{discount_code}}</p>",
    text_fallback: "Summer Sale - Get 30% off with code {{discount_code}}",
    status: "draft",
    scheduled_at: null,
    sent_at: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    recipient_count: 5,
    sent_count: 0,
    delivered_count: 0,
    opened_count: 0,
    clicked_count: 0,
    failed_count: 0,
  },
]

let contacts = [
  {
    id: "cont_001",
    email: "alice@example.com",
    first_name: "Alice",
    tags: ["customer", "vip"],
    unsubscribed_at: null,
    opened_any: true,
    clicked_any: true,
    created_at: new Date(Date.now() - 604800000).toISOString(),
    opens_count: 5,
    clicks_count: 2,
  },
  {
    id: "cont_002",
    email: "bob@example.com",
    first_name: "Bob",
    tags: ["subscriber"],
    unsubscribed_at: null,
    opened_any: true,
    clicked_any: false,
    created_at: new Date(Date.now() - 518400000).toISOString(),
    opens_count: 2,
    clicks_count: 0,
  },
  {
    id: "cont_003",
    email: "charlie@example.com",
    first_name: "Charlie",
    tags: ["lead"],
    unsubscribed_at: null,
    opened_any: false,
    clicked_any: false,
    created_at: new Date(Date.now() - 432000000).toISOString(),
    opens_count: 0,
    clicks_count: 0,
  },
  {
    id: "cont_004",
    email: "diana@example.com",
    first_name: "Diana",
    tags: ["customer"],
    unsubscribed_at: new Date(Date.now() - 86400000).toISOString(),
    opened_any: true,
    clicked_any: false,
    created_at: new Date(Date.now() - 345600000).toISOString(),
    opens_count: 1,
    clicks_count: 0,
  },
  {
    id: "cont_005",
    email: "eve@example.com",
    first_name: "Eve",
    tags: ["subscriber", "engaged"],
    unsubscribed_at: null,
    opened_any: true,
    clicked_any: true,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    opens_count: 8,
    clicks_count: 4,
  },
]

let audiences = [
  {
    id: "aud_001",
    name: "All Subscribers",
    description: "Everyone who hasn't unsubscribed",
    rules: { operator: "AND", conditions: [{ field: "unsubscribed", value: false }] },
    contact_count: 4,
    created_at: new Date(Date.now() - 2592000000).toISOString(),
    updated_at: new Date(Date.now() - 2592000000).toISOString(),
  },
]

const senderEmails = [
  {
    id: "send_001",
    display_name: "Launch Team",
    address: "team@launchconsole.com",
    domain: "launchconsole.com",
    verified: true,
    created_at: new Date(Date.now() - 7776000000).toISOString(),
  },
]

const settings = {
  id: "settings_001",
  default_book_link: "https://example.com/book",
  default_discount_code: "SUMMER30",
  brand_logo_url: "/generic-company-logo.png",
  webhook_url: "https://webhook.site/your-unique-id",
  signing_secret: "whsec_1234567890abcdefghijklmnopqrstuvwxyz",
  updated_at: new Date().toISOString(),
}

const campaignRecipients: any = {}
const campaignEvents: any = {}

export const mockStore = {
  async listCampaigns() {
    await delay()
    return campaigns
  },

  async createOrUpdateCampaign(payload: any) {
    await delay()
    const existing = payload.id ? campaigns.find((c) => c.id === payload.id) : null

    if (existing) {
      Object.assign(existing, {
        ...payload,
        updated_at: new Date().toISOString(),
      })
      return existing
    }

    const newCampaign = {
      id: payload.id || `camp_${uuid()}`,
      status: "draft",
      sent_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      recipient_count: 0,
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      failed_count: 0,
      ...payload,
    }
    campaigns.push(newCampaign)
    return newCampaign
  },

  async queueCampaign(id: string) {
    await delay()

    // 5% failure rate
    if (Math.random() < 0.05) {
      throw new Error("Failed to queue campaign. Please try again.")
    }

    const campaign = campaigns.find((c) => c.id === id)
    if (!campaign) throw new Error("Campaign not found")

    campaign.status = "queued"
    campaign.updated_at = new Date().toISOString()
    return campaign
  },

  async getCampaign(id: string) {
    await delay()
    const campaign = campaigns.find((c) => c.id === id)
    if (!campaign) throw new Error("Campaign not found")
    return campaign
  },

  async sendTestEmail(payload: any) {
    await delay()
    return { success: true, message: `Test email sent to ${payload.to}` }
  },

  async listContacts(query?: string) {
    await delay()
    if (!query) return contacts

    const lowerQuery = query.toLowerCase()
    return contacts.filter(
      (c) =>
        c.email.toLowerCase().includes(lowerQuery) ||
        c.first_name?.toLowerCase().includes(lowerQuery) ||
        c.tags?.some((t) => t.toLowerCase().includes(lowerQuery)),
    )
  },

  async createContact(payload: any) {
    await delay()
    const newContact = {
      id: `cont_${uuid()}`,
      email: payload.email,
      first_name: payload.first_name || "",
      tags: payload.tags || [],
      unsubscribed_at: null,
      opened_any: false,
      clicked_any: false,
      created_at: new Date().toISOString(),
      opens_count: 0,
      clicks_count: 0,
    }
    contacts.push(newContact)
    return newContact
  },

  async updateContact(id: string, payload: any) {
    await delay()
    const contact = contacts.find((c) => c.id === id)
    if (!contact) throw new Error("Contact not found")

    Object.assign(contact, payload)
    return contact
  },

  async deleteContacts(ids: string[]) {
    await delay()
    contacts = contacts.filter((c) => !ids.includes(c.id))
    return { success: true, deleted: ids.length }
  },

  async bulkAddTag(ids: string[], tag: string) {
    await delay()
    ids.forEach((id) => {
      const contact = contacts.find((c) => c.id === id)
      if (contact && !contact.tags.includes(tag)) {
        contact.tags.push(tag)
      }
    })
    return { success: true }
  },

  async bulkRemoveTag(ids: string[], tag: string) {
    await delay()
    ids.forEach((id) => {
      const contact = contacts.find((c) => c.id === id)
      if (contact) {
        contact.tags = contact.tags.filter((t) => t !== tag)
      }
    })
    return { success: true }
  },

  async bulkUnsubscribe(ids: string[]) {
    await delay()
    ids.forEach((id) => {
      const contact = contacts.find((c) => c.id === id)
      if (contact) {
        contact.unsubscribed_at = new Date().toISOString()
      }
    })
    return { success: true }
  },

  async importContacts(formData: FormData) {
    await delay(500)
    // Simulate importing 3 contacts
    const imported = [
      {
        id: `cont_${uuid()}`,
        email: `imported${Date.now()}@example.com`,
        first_name: "Imported",
        tags: ["imported"],
        unsubscribed_at: null,
        opened_any: false,
        clicked_any: false,
        created_at: new Date().toISOString(),
        opens_count: 0,
        clicks_count: 0,
      },
    ]
    contacts.push(...imported)
    return { imported: imported.length, total: contacts.length }
  },

  async listAudiences() {
    await delay()
    return audiences
  },

  async previewAudience(rules: any) {
    await delay(400)
    // Simple mock: return random count between 1-5
    return { count: Math.floor(Math.random() * 5) + 1 }
  },

  async createAudience(payload: any) {
    await delay()
    const newAudience = {
      id: `aud_${uuid()}`,
      name: payload.name,
      description: payload.description || "",
      rules: payload.rules || {},
      contact_count: Math.floor(Math.random() * 10),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    audiences.push(newAudience)
    return newAudience
  },

  async updateAudience(id: string, payload: any) {
    await delay()
    const audience = audiences.find((a) => a.id === id)
    if (!audience) throw new Error("Audience not found")

    Object.assign(audience, {
      ...payload,
      updated_at: new Date().toISOString(),
    })
    return audience
  },

  async deleteAudience(id: string) {
    await delay()
    audiences = audiences.filter((a) => a.id !== id)
    return { success: true }
  },

  async listSenderEmails() {
    await delay()
    return senderEmails
  },

  async createSenderEmail(payload: any) {
    await delay()
    const domain = payload.address.split("@")[1]
    const newSender = {
      id: `send_${uuid()}`,
      display_name: payload.display_name,
      address: payload.address,
      domain,
      verified: true, // Auto-verify in mock
      created_at: new Date().toISOString(),
    }
    senderEmails.push(newSender)
    return newSender
  },

  async getSettings() {
    await delay()
    return settings
  },

  async updateSettings(payload: any) {
    await delay()
    Object.assign(settings, {
      ...payload,
      updated_at: new Date().toISOString(),
    })
    return settings
  },

  async getCampaignRecipients(id: string) {
    await delay()
    // Generate mock recipients for the campaign
    return contacts.slice(0, 3).map((c, idx) => ({
      id: `recip_${c.id}`,
      campaign_id: id,
      contact_id: c.id,
      email: c.email,
      delivery_status: idx === 0 ? "delivered" : idx === 1 ? "opened" : "clicked",
      opens_count: idx === 0 ? 0 : idx === 1 ? 2 : 3,
      clicks_count: idx === 2 ? 1 : 0,
      last_event_at: new Date(Date.now() - idx * 3600000).toISOString(),
      error_message: null,
    }))
  },

  async getCampaignEvents(id: string) {
    await delay()
    // Generate mock events
    return [
      {
        id: "evt_001",
        campaign_id: id,
        contact_id: "cont_001",
        event_type: "delivered",
        created_at: new Date(Date.now() - 7200000).toISOString(),
        metadata: {},
      },
      {
        id: "evt_002",
        campaign_id: id,
        contact_id: "cont_001",
        event_type: "opened",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        metadata: {},
      },
      {
        id: "evt_003",
        campaign_id: id,
        contact_id: "cont_002",
        event_type: "clicked",
        created_at: new Date(Date.now() - 1800000).toISOString(),
        metadata: { link: "https://example.com" },
      },
    ]
  },

  async cancelCampaign(id: string) {
    await delay()
    const campaign = campaigns.find((c) => c.id === id)
    if (!campaign) throw new Error("Campaign not found")

    campaign.status = "cancelled"
    campaign.updated_at = new Date().toISOString()
    return campaign
  },

  async duplicateCampaign(id: string) {
    await delay()
    const campaign = campaigns.find((c) => c.id === id)
    if (!campaign) throw new Error("Campaign not found")

    const duplicate = {
      ...campaign,
      id: `camp_${uuid()}`,
      subject: `${campaign.subject} (Copy)`,
      status: "draft",
      scheduled_at: null,
      sent_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sent_count: 0,
      delivered_count: 0,
      opened_count: 0,
      clicked_count: 0,
      failed_count: 0,
    }
    campaigns.push(duplicate)
    return duplicate
  },

  async resendToFailures(id: string) {
    await delay()
    return { success: true, message: "Resent to failed recipients" }
  },
}
