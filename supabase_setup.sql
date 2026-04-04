-- SUPABASE SETUP SQL
-- Run these in your Supabase SQL Editor

-- 1. Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    lead_data JSONB,
    scores JSONB,
    total_score INT
);

-- 2. Config Table
CREATE TABLE IF NOT EXISTS public.config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    data JSONB
);

-- 3. Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Submissions
DROP POLICY IF EXISTS "Public can insert submissions" ON public.submissions;
CREATE POLICY "Public can insert submissions" ON public.submissions
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view submissions" ON public.submissions;
CREATE POLICY "Admins can view submissions" ON public.submissions
FOR SELECT TO authenticated USING (true);

-- 5. Policies for Config
DROP POLICY IF EXISTS "Public can read config" ON public.config;
CREATE POLICY "Public can read config" ON public.config
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update config" ON public.config;
CREATE POLICY "Admins can update config" ON public.config
FOR ALL TO authenticated USING (true);

-- ─────────────────────────────────────────────
-- 6. GTM Leads Table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gtm_leads (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    -- Contact
    fname           TEXT        NOT NULL DEFAULT '',
    lname           TEXT        NOT NULL DEFAULT '',
    email           TEXT        NOT NULL DEFAULT '',
    phone           TEXT,
    company         TEXT,
    website         TEXT,

    -- Business context
    industry        TEXT,
    business_type   TEXT,
    stage           TEXT,
    team_size       TEXT,
    revenue         TEXT,
    lead_volume     TEXT,
    timeline        TEXT,

    -- Diagnostic data
    answers         JSONB,          -- raw per-question scores  { p0: 5, p1: 3, ... }
    pillar_scores   JSONB,          -- pillar percentages       { positioning: 75, website: 60, ... }
    total_score     INT,
    maturity_level  TEXT,
    goals           JSONB,          -- array of goal strings

    -- CRM
    status          TEXT        NOT NULL DEFAULT 'new'
                                CHECK (status IN ('new','contacted','in_conversation','won','lost')),
    admin_notes     TEXT,

    -- GTM Review Booking
    is_booked       BOOLEAN     NOT NULL DEFAULT false,
    booking_info    JSONB,          -- { time: ISO string, message: text }
    booking_status  TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (booking_status IN ('pending','completed'))
);

-- ─────────────────────────────────────────────
-- 7. Migration — ensure columns exist if table
--    already existed from an older version
-- ─────────────────────────────────────────────
ALTER TABLE public.gtm_leads ADD COLUMN IF NOT EXISTS is_booked      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.gtm_leads ADD COLUMN IF NOT EXISTS booking_info   JSONB;
ALTER TABLE public.gtm_leads ADD COLUMN IF NOT EXISTS booking_status TEXT    NOT NULL DEFAULT 'pending';

-- Add the CHECK constraint only if it doesn't exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'gtm_leads_booking_status_check'
      AND conrelid = 'public.gtm_leads'::regclass
  ) THEN
    ALTER TABLE public.gtm_leads
      ADD CONSTRAINT gtm_leads_booking_status_check
      CHECK (booking_status IN ('pending','completed'));
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 8. Indexes for GTM Leads
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS gtm_leads_created_at_idx   ON public.gtm_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS gtm_leads_status_idx       ON public.gtm_leads (status);
CREATE INDEX IF NOT EXISTS gtm_leads_total_score_idx  ON public.gtm_leads (total_score);
CREATE INDEX IF NOT EXISTS gtm_leads_email_idx        ON public.gtm_leads (email);
CREATE INDEX IF NOT EXISTS gtm_leads_is_booked_idx    ON public.gtm_leads (is_booked);

-- ─────────────────────────────────────────────
-- 9. RLS for GTM Leads
-- ─────────────────────────────────────────────
ALTER TABLE public.gtm_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (diagnostic is public-facing)
DROP POLICY IF EXISTS "Public can insert gtm_leads" ON public.gtm_leads;
CREATE POLICY "Public can insert gtm_leads" ON public.gtm_leads
FOR INSERT WITH CHECK (true);

-- Only authenticated admin can read
DROP POLICY IF EXISTS "Admins can select gtm_leads" ON public.gtm_leads;
CREATE POLICY "Admins can select gtm_leads" ON public.gtm_leads
FOR SELECT TO authenticated USING (true);

-- Only authenticated admin can update (status, admin_notes)
DROP POLICY IF EXISTS "Admins can update gtm_leads" ON public.gtm_leads;
CREATE POLICY "Admins can update gtm_leads" ON public.gtm_leads
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────
-- 10. Enable Realtime
-- ─────────────────────────────────────────────
-- This allows the Admin Dashboard to receive live updates when a new lead is added
ALTER PUBLICATION supabase_realtime ADD TABLE public.gtm_leads;

-- ── 11. Fix for Status Change Notifications ──
-- This ensures payload.old contains all data so the dashboard can tell 
-- if is_booked actually changed, or just a status changed.
ALTER TABLE public.gtm_leads REPLICA IDENTITY FULL;
