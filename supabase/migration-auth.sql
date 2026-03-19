-- ========================================
-- TRENCH_GRAILS — Auth & Ownership Migration
-- Run this in Supabase SQL Editor
-- ========================================

-- Nonces for wallet sign-in (ephemeral)
CREATE TABLE IF NOT EXISTS auth_nonces (
  wallet_address TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE,
  twitter_id TEXT UNIQUE,
  twitter_handle TEXT,
  supabase_auth_id UUID UNIQUE,
  free_pack_claimed BOOLEAN NOT NULL DEFAULT false,
  free_pack_claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_twitter ON users(twitter_id);
CREATE INDEX IF NOT EXISTS idx_users_auth ON users(supabase_auth_id);

-- Card ownership
CREATE TABLE IF NOT EXISTS user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES cards(id),
  source TEXT NOT NULL DEFAULT 'booster',
  pack_id UUID,
  opened_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_card ON user_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_pack ON user_cards(pack_id);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_nonces ENABLE ROW LEVEL SECURITY;

-- Users: authenticated users read own row
CREATE POLICY "Users read own" ON users
  FOR SELECT USING (supabase_auth_id = auth.uid());

-- User_cards: users read own cards
CREATE POLICY "Users read own cards" ON user_cards
  FOR SELECT USING (
    user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid())
  );

-- Auth nonces: service role only (no public access)
-- No policies needed — admin client bypasses RLS

-- Updated_at trigger for users
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Atomic free pack claim (prevents race conditions)
CREATE OR REPLACE FUNCTION claim_free_pack(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  already_claimed BOOLEAN;
BEGIN
  SELECT free_pack_claimed INTO already_claimed
  FROM users WHERE id = p_user_id FOR UPDATE;

  IF already_claimed THEN
    RETURN false;
  END IF;

  UPDATE users SET
    free_pack_claimed = true,
    free_pack_claimed_at = now(),
    updated_at = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;
