-- ========================================
-- SHAPE_CARDS — Database Schema
-- Run this in Supabase SQL Editor
-- ========================================

-- Enum types
CREATE TYPE shape_type AS ENUM (
  'circle', 'square', 'triangle', 'star', 'hexagon',
  'cube', 'cylinder', 'pentagon',
  'diamond', 'torus', 'heart', 'pyramid', 'knot'
);

CREATE TYPE material_type AS ENUM ('flat', '3d', 'chrome', 'gold');

CREATE TYPE background_type AS ENUM (
  'solid_color', 'abstract', 'clothing', 'people', 'buildings'
);

CREATE TYPE rarity_tier AS ENUM ('common', 'uncommon', 'rare', 'epic', 'legendary');

CREATE TYPE mana_color AS ENUM ('red', 'blue', 'green', 'white', 'gold', 'chrome');

CREATE TYPE gen_status AS ENUM (
  'not_started', 'generating', 'generated', 'approved', 'rejected',
  'compositing', 'finalized'
);

-- Cards table
CREATE TABLE cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number INT UNIQUE NOT NULL,

  -- Identity
  shape shape_type NOT NULL,
  material material_type NOT NULL,
  background background_type NOT NULL,
  mana_color mana_color NOT NULL,
  rarity_tier rarity_tier NOT NULL,

  -- Stats
  atk INT NOT NULL CHECK (atk BETWEEN 1 AND 10),
  def INT NOT NULL CHECK (def BETWEEN 0 AND 8),
  hp INT NOT NULL CHECK (hp BETWEEN 1 AND 12),
  mana_cost INT NOT NULL CHECK (mana_cost BETWEEN 1 AND 5),

  -- Ability (Uncommon+)
  ability TEXT,

  -- Rarity math
  base_rarity_pct FLOAT NOT NULL,
  background_multiplier FLOAT NOT NULL,
  final_rarity_pct FLOAT GENERATED ALWAYS AS (base_rarity_pct * background_multiplier) STORED,

  -- Generation pipeline
  wave INT NOT NULL CHECK (wave BETWEEN 1 AND 4),
  gen_status gen_status NOT NULL DEFAULT 'not_started',

  -- Art paths (Supabase Storage)
  raw_art_path TEXT,
  processed_card_path TEXT,
  thumb_path TEXT,
  promo_path TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  generated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ,

  UNIQUE(shape, material, background)
);

-- Indexes for common queries
CREATE INDEX idx_cards_wave ON cards(wave);
CREATE INDEX idx_cards_gen_status ON cards(gen_status);
CREATE INDEX idx_cards_rarity_tier ON cards(rarity_tier);
CREATE INDEX idx_cards_shape ON cards(shape);
CREATE INDEX idx_cards_material ON cards(material);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ========================================
-- Storage Buckets (run in Supabase dashboard or via API)
-- ========================================
-- Create these buckets manually in Supabase Storage:
--   1. raw-arts      (public: false)
--   2. processed-cards (public: true)
--   3. card-thumbs   (public: true)
--   4. card-frames   (public: false)

-- RLS Policies (permissive for admin, restrict later)
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON cards
  FOR ALL USING (true) WITH CHECK (true);
