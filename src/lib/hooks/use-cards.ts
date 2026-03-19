'use client';

import { useEffect, useState, useCallback } from 'react';
import { generateAllCards, type SeedCard } from '@/lib/cards/generate-seed';
import type { Card } from '@/types/cards';

// ── Map SeedCard → Card for consistent typing ──────────

function seedToCard(seed: SeedCard): Card {
  return {
    ...seed,
    id: `local-${seed.card_number}`,
    final_rarity_pct: seed.base_rarity_pct * seed.background_multiplier,
    gen_status: seed.gen_status as Card['gen_status'],
    raw_art_path: null,
    processed_card_path: null,
    thumb_path: null,
    promo_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    generated_at: null,
    approved_at: null,
    finalized_at: null,
  };
}

// ── Hook ────────────────────────────────────────────────

interface UseCardsResult {
  cards: Card[];
  loading: boolean;
  source: 'api' | 'local';
  error: string | null;
  refetch: () => void;
}

/**
 * Fetches cards from the API with fallback to local generation.
 * Always returns Card[] (full type with id, timestamps, art paths).
 * When API is unavailable, maps SeedCard → Card with synthetic local-* ids.
 */
export function useCards(): UseCardsResult {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'api' | 'local'>('local');
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/cards');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCards(data as Card[]);
          setSource('api');
          setLoading(false);
          return;
        }
      }
    } catch {
      // API not available, use local fallback
    }

    // Fallback to local generation
    setCards(generateAllCards().map(seedToCard));
    setSource('local');
    setError('Using local data (DB not available)');
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  return { cards, loading, source, error, refetch: fetchCards };
}
