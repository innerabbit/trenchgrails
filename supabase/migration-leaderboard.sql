-- ═══════════════════════════════════════════════════════════════
-- Leaderboard materialized view
-- Pre-computes per-wallet stats from nft_mints for fast reads.
-- Refresh after each mint via: SELECT refresh_leaderboard();
-- ═══════════════════════════════════════════════════════════════

CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_mv AS
SELECT
  u.wallet_address,
  u.twitter_handle,
  COUNT(DISTINCT nm.card_id)::int AS unique_cards,
  COUNT(nm.id)::int AS total_cards,
  COUNT(*) FILTER (WHERE c.rarity_tier = 'legendary')::int AS legendaries,
  COUNT(*) FILTER (WHERE c.rarity_tier = 'epic')::int AS epics,
  COUNT(*) FILTER (WHERE c.rarity_tier = 'rare')::int AS rares,
  COALESCE(SUM(CASE c.rarity_tier
    WHEN 'common' THEN 10
    WHEN 'uncommon' THEN 25
    WHEN 'rare' THEN 50
    WHEN 'epic' THEN 200
    WHEN 'legendary' THEN 1000
    ELSE 0
  END), 0)::int AS score
FROM nft_mints nm
JOIN users u ON u.id = nm.user_id
JOIN cards c ON c.id = nm.card_id
GROUP BY u.wallet_address, u.twitter_handle;

-- UNIQUE index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX ON leaderboard_mv (wallet_address);
CREATE INDEX ON leaderboard_mv (score DESC);

-- Non-blocking refresh function (CONCURRENTLY = no read lock)
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_mv;
END;
$$;
