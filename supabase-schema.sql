-- ================================================
-- AutoMail Supabase Database Schema
-- ================================================
-- This schema supports email campaigns, subscribers, and tracking
-- Run this in your Supabase SQL Editor

-- ================================================
-- 1. CONTACTS TABLE
-- ================================================
-- Stores all contacts/subscribers (synced from SheetDB)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed', 'bounced')),

  -- Metadata
  source TEXT DEFAULT 'sheetdb', -- Where the contact came from
  tags TEXT[], -- Array of tags for segmentation

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT contacts_email_key UNIQUE (email)
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- ================================================
-- 2. AUDIENCES TABLE
-- ================================================
-- Saved audience segments for targeted campaigns
CREATE TABLE IF NOT EXISTS audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- Audience criteria (JSON format for flexibility)
  criteria JSONB DEFAULT '{}',

  -- Type of audience
  type TEXT DEFAULT 'manual' CHECK (type IN ('manual', 'dynamic', 'sheetdb')),

  -- Stats
  contact_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audiences_created_at ON audiences(created_at DESC);

-- ================================================
-- 3. AUDIENCE_CONTACTS TABLE
-- ================================================
-- Many-to-many relationship between audiences and contacts
CREATE TABLE IF NOT EXISTS audience_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_id UUID NOT NULL REFERENCES audiences(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique contact per audience
  CONSTRAINT unique_audience_contact UNIQUE (audience_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_audience_contacts_audience ON audience_contacts(audience_id);
CREATE INDEX IF NOT EXISTS idx_audience_contacts_contact ON audience_contacts(contact_id);

-- ================================================
-- 4. SENDER_EMAILS TABLE
-- ================================================
-- Verified sender email addresses for campaigns
CREATE TABLE IF NOT EXISTS sender_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,

  -- Verification status
  is_verified BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),

  -- Provider info (e.g., Resend domain ID)
  provider_id TEXT,
  provider_metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sender_emails_verified ON sender_emails(is_verified);

-- ================================================
-- 5. CAMPAIGNS TABLE
-- ================================================
-- Email campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Campaign details
  subject TEXT NOT NULL,
  preheader TEXT,
  from_name TEXT,
  from_email TEXT NOT NULL,

  -- Content
  html TEXT NOT NULL,
  text_fallback TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'sending', 'sent', 'failed', 'canceled')),

  -- Audience
  audience_id UUID REFERENCES audiences(id) ON DELETE SET NULL,
  audience_type TEXT DEFAULT 'all' CHECK (audience_type IN ('all', 'saved', 'sheetdb')),

  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  send_at TIMESTAMPTZ, -- When to actually send (if scheduled)
  sent_at TIMESTAMPTZ, -- When it was actually sent

  -- Stats (cached for performance)
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_at ON campaigns(scheduled_at);

-- ================================================
-- 6. CAMPAIGN_RECIPIENTS TABLE
-- ================================================
-- Individual recipients for each campaign with delivery tracking
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,

  -- Recipient info (stored in case contact is deleted)
  email TEXT NOT NULL,
  name TEXT,

  -- Delivery status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed', 'opened', 'clicked')),

  -- Tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ, -- First open
  clicked_at TIMESTAMPTZ, -- First click
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Counts
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_code TEXT,

  -- Provider info
  provider_message_id TEXT, -- Resend/provider message ID

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact ON campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_email ON campaign_recipients(email);

-- ================================================
-- 7. CAMPAIGN_EVENTS TABLE
-- ================================================
-- Detailed event log for campaign interactions
CREATE TABLE IF NOT EXISTS campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'complained', 'unsubscribed')),

  -- Event data
  email TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET,
  click_url TEXT, -- For click events

  -- Provider data
  provider_event_id TEXT,
  provider_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_recipient ON campaign_events(recipient_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON campaign_events(event_type);
CREATE INDEX IF NOT EXISTS idx_campaign_events_created_at ON campaign_events(created_at DESC);

-- ================================================
-- 8. SETTINGS TABLE
-- ================================================
-- Store application settings and default values
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Default campaign values
  default_book_link TEXT DEFAULT '',
  default_discount_code TEXT DEFAULT '',
  brand_logo_url TEXT DEFAULT '',

  -- Webhook configuration
  webhook_url TEXT DEFAULT '',
  webhook_signing_secret TEXT DEFAULT '',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 9. SYNC_LOG TABLE
-- ================================================
-- Track SheetDB to Supabase synchronization
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sync details
  sync_type TEXT DEFAULT 'sheetdb_to_supabase',
  status TEXT CHECK (status IN ('success', 'failed', 'partial')),

  -- Stats
  total_records INTEGER DEFAULT 0,
  synced_records INTEGER DEFAULT 0,
  failed_records INTEGER DEFAULT 0,
  new_records INTEGER DEFAULT 0,
  updated_records INTEGER DEFAULT 0,

  -- Error info
  error_message TEXT,
  error_details JSONB,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_log_created ON sync_log(started_at DESC);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audiences_updated_at BEFORE UPDATE ON audiences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_recipients_updated_at BEFORE UPDATE ON campaign_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================
-- Enable RLS on all tables for security

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sender_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for authenticated users - adjust based on your needs)
CREATE POLICY "Allow all for authenticated users" ON contacts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON audiences
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON audience_contacts
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON sender_emails
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON campaigns
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON campaign_recipients
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON campaign_events
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON sync_log
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON settings
  FOR ALL USING (auth.role() = 'authenticated');

-- ================================================
-- INITIAL DATA
-- ================================================

-- Create default "All Subscribers" audience (from SheetDB)
INSERT INTO audiences (name, description, type)
VALUES (
  'All Subscribers',
  'All subscribers from SheetDB',
  'sheetdb'
) ON CONFLICT DO NOTHING;

-- ================================================
-- HELPFUL VIEWS
-- ================================================

-- View for campaign statistics
CREATE OR REPLACE VIEW campaign_stats AS
SELECT
  c.id,
  c.subject,
  c.status,
  c.created_at,
  c.sent_at,
  COUNT(DISTINCT cr.id) as total_recipients,
  COUNT(DISTINCT CASE WHEN cr.status = 'delivered' THEN cr.id END) as delivered,
  COUNT(DISTINCT CASE WHEN cr.opened_at IS NOT NULL THEN cr.id END) as unique_opens,
  COUNT(DISTINCT CASE WHEN cr.clicked_at IS NOT NULL THEN cr.id END) as unique_clicks,
  SUM(cr.open_count) as total_opens,
  SUM(cr.click_count) as total_clicks,
  COUNT(DISTINCT CASE WHEN cr.status IN ('bounced', 'failed') THEN cr.id END) as failures
FROM campaigns c
LEFT JOIN campaign_recipients cr ON c.id = cr.campaign_id
GROUP BY c.id, c.subject, c.status, c.created_at, c.sent_at;

-- ================================================
-- COMPLETION
-- ================================================

-- Log schema creation
DO $$
BEGIN
  RAISE NOTICE 'AutoMail database schema created successfully!';
  RAISE NOTICE 'Tables created: contacts, audiences, audience_contacts, sender_emails, campaigns, campaign_recipients, campaign_events, sync_log';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Add your Supabase URL and key to .env.local';
  RAISE NOTICE '2. Run the SheetDB sync to populate contacts';
  RAISE NOTICE '3. Configure Resend for email sending';
END $$;
