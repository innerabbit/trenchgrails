import { randomInt } from 'crypto';
import type { RarityTier } from '@/types/cards';
import { CARDS_PER_PACK } from './config';

// ── Rarity distribution ────────────────────────────────

export const RARITY_ORDER: RarityTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

const RARITY_WEIGHTS: Record<RarityTier, number> = {
  common: 55,
  uncommon: 25,
  rare: 12,
  epic: 6,
  legendary: 2,
};

/** Cryptographically secure weighted random pick */
function secureWeightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = randomInt(total);
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/** Cryptographically secure random index */
function secureRandomIndex(length: number): number {
  return randomInt(length);
}

// ── Pick booster pack ──────────────────────────────────

export interface BoosterCard {
  id: string;
  card_number: number;
  rarity_tier: RarityTier;
  [key: string]: any;
}

/**
 * Pick cards for a booster pack using weighted rarity distribution.
 * Uses crypto.randomInt() for unpredictable server-side RNG.
 * Guarantees at least 1 rare-or-better card.
 */
export function pickBoosterPack(pool: BoosterCard[], packSize = CARDS_PER_PACK): BoosterCard[] {
  const byRarity: Record<RarityTier, BoosterCard[]> = {
    common: [], uncommon: [], rare: [], epic: [], legendary: [],
  };
  for (const c of pool) {
    if (byRarity[c.rarity_tier]) byRarity[c.rarity_tier].push(c);
  }

  const pack: BoosterCard[] = [];
  const usedIds = new Set<string>();

  // Guaranteed: at least 1 rare or better
  const rarePool = [...byRarity.rare, ...byRarity.epic, ...byRarity.legendary];
  if (rarePool.length > 0) {
    const guaranteed = rarePool[secureRandomIndex(rarePool.length)];
    pack.push(guaranteed);
    usedIds.add(guaranteed.id);
  }

  // Fill remaining slots (safety valve: max 100 iterations)
  let iterations = 0;
  while (pack.length < packSize && iterations < 100) {
    iterations++;
    const rarity = secureWeightedPick(RARITY_ORDER, RARITY_ORDER.map(r => RARITY_WEIGHTS[r]));
    const candidates = byRarity[rarity].filter(c => !usedIds.has(c.id));
    if (candidates.length === 0) continue;

    const card = candidates[secureRandomIndex(candidates.length)];
    pack.push(card);
    usedIds.add(card.id);
  }

  // If still short, fill from any available card
  if (pack.length < packSize) {
    const allRemaining = pool.filter(c => !usedIds.has(c.id));
    while (pack.length < packSize && allRemaining.length > 0) {
      const card = allRemaining.splice(secureRandomIndex(allRemaining.length), 1)[0];
      pack.push(card);
      usedIds.add(card.id);
    }
  }

  // Sort: commons first, legendaries last
  pack.sort((a, b) =>
    RARITY_ORDER.indexOf(a.rarity_tier) - RARITY_ORDER.indexOf(b.rarity_tier)
  );

  return pack;
}
