-- ========================================
-- SHAPE_CARDS v2 — Card System Migration
-- Run in Supabase SQL Editor
-- ========================================

-- Delete all old cards (clean slate)
DELETE FROM user_cards;
DELETE FROM cards;

-- Make old columns nullable (they won't be used for v2 cards)
ALTER TABLE cards ALTER COLUMN shape DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN material DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN background DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN mana_color DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN def DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN base_rarity_pct DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN background_multiplier DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN wave DROP NOT NULL;

-- Drop old constraints that conflict
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_atk_check;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_def_check;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_hp_check;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_mana_cost_check;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_wave_check;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_shape_material_background_key;

-- Make atk/hp/mana_cost nullable too (lands don't have combat stats)
ALTER TABLE cards ALTER COLUMN atk DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN hp DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN mana_cost DROP NOT NULL;
ALTER TABLE cards ALTER COLUMN rarity_tier DROP NOT NULL;

-- Add new v2 columns
ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_type TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS hero_class TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS artifact_subtype TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS perk_1_name TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS perk_1_type TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS perk_1_desc TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS perk_2_name TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS perk_2_type TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS perk_2_desc TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS art_description TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS art_prompt TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS flavor_text TEXT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS generic_cost INT;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS colored_cost INT;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_cards_card_type ON cards(card_type);
CREATE INDEX IF NOT EXISTS idx_cards_color ON cards(color);
CREATE INDEX IF NOT EXISTS idx_cards_hero_class ON cards(hero_class);
CREATE INDEX IF NOT EXISTS idx_cards_name ON cards(name);
