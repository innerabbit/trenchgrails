'use client';

import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createClient } from '@/lib/supabase/client';

export interface OwnedCardDetails {
  card_number: number;
  card_type: string | null;
  name: string | null;
  shape: string;
  material: string;
  rarity_tier: string;
  mana_color: string;
  color: string | null;
  hero_class: string | null;
  atk: number;
  hp: number;
  mana_cost: number;
  generic_cost: number | null;
  colored_cost: number | null;
  perk_1_name: string | null;
  perk_1_desc: string | null;
  ability: string | null;
  raw_art_path: string | null;
  processed_card_path: string | null;
  thumb_path: string | null;
}

interface OwnedCard {
  id: string;
  card_number: number;
  assetId: string;
  cards: OwnedCardDetails;
}

/**
 * Fetch owned cards — blockchain-verified via DAS API.
 * 1. GET /api/nft/owned?wallet=xxx → card numbers from chain
 * 2. Enrich with card details from Supabase
 */
export function useUserCards() {
  const { publicKey, connected } = useWallet();
  const [ownedCards, setOwnedCards] = useState<OwnedCard[]>([]);
  const [ownedCardNumbers, setOwnedCardNumbers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const fetchCards = useCallback(async () => {
    if (!publicKey) {
      setOwnedCards([]);
      setOwnedCardNumbers(new Set());
      return;
    }

    setIsLoading(true);
    try {
      // Step 1: Get owned card numbers from blockchain (DAS API)
      const wallet = publicKey.toBase58();
      const res = await fetch(`/api/nft/owned?wallet=${wallet}`);
      const data = await res.json();

      if (!res.ok || !data.cards?.length) {
        setOwnedCards([]);
        setOwnedCardNumbers(new Set());
        setIsLoading(false);
        return;
      }

      const chainCards: { cardNumber: number; assetId: string; name: string }[] = data.cards;
      const cardNumbers = chainCards.map((c) => c.cardNumber);

      // Step 2: Enrich with card details from Supabase
      const supabase = createClient();
      const { data: cardDetails, error } = await supabase
        .from('cards')
        .select('card_number, card_type, name, shape, material, rarity_tier, mana_color, color, hero_class, atk, hp, mana_cost, generic_cost, colored_cost, perk_1_name, perk_1_desc, ability, raw_art_path, processed_card_path, thumb_path')
        .in('card_number', cardNumbers);

      if (error) {
        console.error('Failed to fetch card details:', error);
        setIsLoading(false);
        return;
      }

      // Build lookup by card_number
      const detailsMap = new Map<number, OwnedCardDetails>();
      for (const d of cardDetails || []) {
        detailsMap.set(d.card_number, d as OwnedCardDetails);
      }

      // Merge blockchain ownership with Supabase details
      const merged: OwnedCard[] = [];
      for (const cc of chainCards) {
        const details = detailsMap.get(cc.cardNumber);
        if (details) {
          merged.push({
            id: cc.assetId,
            card_number: cc.cardNumber,
            assetId: cc.assetId,
            cards: details,
          });
        }
      }

      setOwnedCards(merged);
      setOwnedCardNumbers(new Set(cardNumbers));
    } catch (err) {
      console.error('Failed to fetch owned cards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchCards();
    } else {
      setOwnedCards([]);
      setOwnedCardNumbers(new Set());
    }
  }, [connected, publicKey, fetchCards]);

  return { ownedCards, ownedCardNumbers, isLoading, refetch: fetchCards };
}
