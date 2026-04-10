-- prompt_refs — reference images for art generation prompts
CREATE TABLE IF NOT EXISTS prompt_refs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,           -- matches prompt slug: 'hero', 'land_circle', etc.
  image_path TEXT NOT NULL,     -- path in ref-images storage bucket
  label TEXT DEFAULT '',        -- optional description
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_refs_slug ON prompt_refs(slug);

-- RLS: allow public read, service_role write
ALTER TABLE prompt_refs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prompt_refs"
  ON prompt_refs FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage prompt_refs"
  ON prompt_refs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
