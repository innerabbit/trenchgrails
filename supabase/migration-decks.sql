-- ========================================
-- SHAPE_CARDS — Decks & Dungeon Migration
-- Run this in Supabase SQL Editor
-- ========================================

-- Decks table
CREATE TABLE IF NOT EXISTS decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Deck',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decks_user ON decks(user_id);

ALTER TABLE decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own decks" ON decks
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
  ) WITH CHECK (
    user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
  );

CREATE TRIGGER decks_updated_at
  BEFORE UPDATE ON decks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Deck cards (which cards are in each deck)
CREATE TABLE IF NOT EXISTS deck_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_number INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deck_cards_deck ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS idx_deck_cards_card ON deck_cards(card_number);

ALTER TABLE deck_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own deck cards" ON deck_cards
  FOR ALL USING (
    deck_id IN (SELECT id FROM decks WHERE user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()))
  ) WITH CHECK (
    deck_id IN (SELECT id FROM decks WHERE user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()))
  );

-- Dungeon runs (placeholder for future battle mechanics)
CREATE TABLE IF NOT EXISTS dungeon_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id),
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dungeon_runs_user ON dungeon_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_runs_deck ON dungeon_runs(deck_id);

ALTER TABLE dungeon_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dungeon runs" ON dungeon_runs
  FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
  ) WITH CHECK (
    user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
  );
