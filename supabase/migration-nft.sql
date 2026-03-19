-- ═══════════════════════════════════════════════════════════════
-- NFT Minting tables and functions
-- ═══════════════════════════════════════════════════════════════

-- Cooldown tracking per wallet (prevents race condition abuse)
CREATE TABLE IF NOT EXISTS mint_cooldowns (
  wallet_address TEXT PRIMARY KEY,
  last_mint_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_mints INTEGER NOT NULL DEFAULT 0
);

-- Record of all NFT mints
CREATE TABLE IF NOT EXISTS nft_mints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  card_id UUID REFERENCES cards(id),
  mint_address TEXT NOT NULL UNIQUE,
  tx_signature TEXT NOT NULL,
  pack_id UUID NOT NULL,
  minted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying user's minted NFTs
CREATE INDEX IF NOT EXISTS idx_nft_mints_user ON nft_mints(user_id);
CREATE INDEX IF NOT EXISTS idx_nft_mints_pack ON nft_mints(pack_id);

-- ═══════════════════════════════════════════════════════════════
-- Atomic cooldown check + claim function
--
-- Prevents race condition: 100 parallel requests → only 1 succeeds.
-- Uses UPDATE...WHERE atomicity (PostgreSQL guarantee).
-- Inspired by Aurory $830K loss from non-atomic cooldown check.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION try_claim_mint(
  p_wallet TEXT,
  p_cooldown_minutes INT DEFAULT 30
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE v_ok BOOLEAN;
BEGIN
  -- Try to update existing row (atomic: only one concurrent UPDATE succeeds)
  UPDATE mint_cooldowns
  SET last_mint_at = NOW(), total_mints = total_mints + 1
  WHERE wallet_address = p_wallet
    AND last_mint_at < NOW() - (p_cooldown_minutes || ' minutes')::INTERVAL
  RETURNING TRUE INTO v_ok;

  IF v_ok IS NULL THEN
    -- New wallet — INSERT with ON CONFLICT DO NOTHING (race-safe)
    INSERT INTO mint_cooldowns (wallet_address, last_mint_at, total_mints)
    VALUES (p_wallet, NOW(), 1)
    ON CONFLICT (wallet_address) DO NOTHING
    RETURNING TRUE INTO v_ok;
  END IF;

  RETURN COALESCE(v_ok, FALSE);
END; $$;
