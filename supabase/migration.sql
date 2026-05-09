-- A/B Testing: events table
-- Run in: Supabase Dashboard → SQL Editor

CREATE TABLE events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID NOT NULL,
  variant     VARCHAR(1) NOT NULL CHECK (variant IN ('A', 'B')),
  event_type  VARCHAR(50) NOT NULL,
  element     VARCHAR(100),
  page        VARCHAR(50) NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX idx_events_variant   ON events(variant);
CREATE INDEX idx_events_session   ON events(session_id);
CREATE INDEX idx_events_type      ON events(event_type);

-- Required explicit grants (Supabase policy from May 2026)
GRANT INSERT ON public.events TO anon;
GRANT SELECT ON public.events TO service_role;

-- SUS (System Usability Scale) responses table
CREATE TABLE sus_responses (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  variant    VARCHAR(1) NOT NULL CHECK (variant IN ('A', 'B')),
  answers    JSONB NOT NULL,
  sus_score  NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT INSERT ON public.sus_responses TO anon;
GRANT SELECT ON public.sus_responses TO service_role;
