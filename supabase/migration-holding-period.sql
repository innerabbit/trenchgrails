-- ═══════════════════════════════════════════════════════════════
-- Holding period: anti-abuse mechanism
-- Wallet must hold minimum balance for N minutes before minting.
-- Prevents SOL shuttle attack (transfer → mint → transfer → repeat).
-- ═══════════════════════════════════════════════════════════════

-- Add holding period columns to existing mint_cooldowns table
ALTER TABLE mint_cooldowns
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snapshot_balance BIGINT;

-- ═══════════════════════════════════════════════════════════════
-- Record that a wallet was first seen with sufficient balance.
-- Called from status API when wallet has enough SOL.
-- ON CONFLICT: if wallet already tracked, don't overwrite.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION record_wallet_seen(
  p_wallet TEXT,
  p_balance BIGINT
) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql AS $$
DECLARE v_first_seen TIMESTAMPTZ;
BEGIN
  -- Try to insert new record
  INSERT INTO mint_cooldowns (wallet_address, last_mint_at, total_mints, first_seen_at, snapshot_balance)
  VALUES (p_wallet, '1970-01-01'::TIMESTAMPTZ, 0, NOW(), p_balance)
  ON CONFLICT (wallet_address) DO UPDATE
    SET first_seen_at = COALESCE(mint_cooldowns.first_seen_at, NOW()),
        snapshot_balance = COALESCE(mint_cooldowns.snapshot_balance, p_balance)
    WHERE mint_cooldowns.first_seen_at IS NULL
  RETURNING first_seen_at INTO v_first_seen;

  -- If no insert/update happened, just read existing value
  IF v_first_seen IS NULL THEN
    SELECT first_seen_at INTO v_first_seen
    FROM mint_cooldowns
    WHERE wallet_address = p_wallet;
  END IF;

  RETURN v_first_seen;
END; $$;

-- ═══════════════════════════════════════════════════════════════
-- Reset holding period (called when balance drops below threshold)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reset_holding_period(
  p_wallet TEXT
) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE mint_cooldowns
  SET first_seen_at = NULL, snapshot_balance = NULL
  WHERE wallet_address = p_wallet;
END; $$;

-- ═══════════════════════════════════════════════════════════════
-- Updated try_claim_mint: now also checks holding period.
-- Wallet must have first_seen_at older than holding_minutes.
-- After successful mint, resets first_seen_at (new holding period starts).
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION try_claim_mint(
  p_wallet TEXT,
  p_cooldown_minutes INT DEFAULT 30,
  p_holding_minutes INT DEFAULT 30
) RETURNS BOOLEAN
LANGUAGE plpgsql AS $$
DECLARE v_ok BOOLEAN;
BEGIN
  UPDATE mint_cooldowns
  SET last_mint_at = NOW(),
      total_mints = total_mints + 1,
      first_seen_at = NULL,       -- Reset holding period after mint
      snapshot_balance = NULL
  WHERE wallet_address = p_wallet
    AND last_mint_at < NOW() - (p_cooldown_minutes || ' minutes')::INTERVAL
    AND first_seen_at IS NOT NULL
    AND first_seen_at < NOW() - (p_holding_minutes || ' minutes')::INTERVAL
  RETURNING TRUE INTO v_ok;

  RETURN COALESCE(v_ok, FALSE);
END; $$;
