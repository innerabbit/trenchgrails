// ========================================
// Fetch booster pack — API first, local fallback
// ========================================

import { generateBoosterPack } from './generate-pack';
import type { SeedCard } from './generate-seed';

export interface BoosterPackResult {
  cards: SeedCard[];
  source: 'api' | 'local';
}

/**
 * Fetch 6 cards for a booster pack.
 * Tries the API first (server-side rarity logic against DB).
 * Falls back to local `generateBoosterPack()` if API is unavailable.
 */
export async function fetchBoosterPack(): Promise<BoosterPackResult> {
  try {
    const res = await fetch('/api/booster/open', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.cards && data.cards.length >= 6) {
        return { cards: data.cards, source: 'api' };
      }
    }
  } catch {
    // API not available — use local generation
  }

  return { cards: generateBoosterPack(), source: 'local' };
}
