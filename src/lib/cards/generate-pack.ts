// ========================================
// Generate a random booster pack (6 cards)
// ========================================

import { generateAllCards, type SeedCard } from './generate-seed';
import type { RarityTier } from '@/types/cards';

const RARITY_ORDER: RarityTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function generateBoosterPack(): SeedCard[] {
  const allCards = generateAllCards();

  // Group cards by rarity
  const byRarity: Record<RarityTier, SeedCard[]> = {
    common: [], uncommon: [], rare: [], epic: [], legendary: [],
  };
  for (const c of allCards) {
    byRarity[c.rarity_tier].push(c);
  }

  const pack: SeedCard[] = [];
  const usedIndices = new Set<number>();

  // Guaranteed: at least 1 rare or better
  const rarePool = [...byRarity.rare, ...byRarity.epic, ...byRarity.legendary];
  const guaranteed = rarePool[Math.floor(Math.random() * rarePool.length)];
  pack.push(guaranteed);
  usedIndices.add(guaranteed.card_number);

  // Fill remaining 5 slots with weighted distribution
  const rarityWeights: Record<RarityTier, number> = {
    common: 55,
    uncommon: 25,
    rare: 12,
    epic: 6,
    legendary: 2,
  };

  while (pack.length < 6) {
    const rarity = weightedPick(RARITY_ORDER, RARITY_ORDER.map(r => rarityWeights[r]));
    const pool = byRarity[rarity].filter(c => !usedIndices.has(c.card_number));

    if (pool.length === 0) continue;

    const card = pool[Math.floor(Math.random() * pool.length)];
    pack.push(card);
    usedIndices.add(card.card_number);
  }

  // Sort: commons first, legendaries last (for dramatic reveal)
  pack.sort((a, b) => {
    return RARITY_ORDER.indexOf(a.rarity_tier) - RARITY_ORDER.indexOf(b.rarity_tier);
  });

  return pack;
}
