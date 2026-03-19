'use client';

import { forwardRef, useMemo } from 'react';
import { SplineCard, type SplineCardContent, type SplineCardHandle } from './spline-card';
import type { RarityTier, ManaColor, ShapeType, MaterialType, CardType, BackgroundType, CardColor } from '@/types/cards';
import { RARITY_LABELS, CARD_COLORS, MANA_COLORS } from '@/lib/constants';

/** Same-origin proxy URL for card art (avoids WebGL CORS issues with Supabase Storage) */
function fullArtUrl(path: string | null | undefined, cacheBust?: number): string | undefined {
  if (!path) return undefined;
  const clean = path.replace(/^raw-arts\//, '');
  const url = `/api/art-proxy?path=${encodeURIComponent(clean)}`;
  return cacheBust ? `${url}&v=${cacheBust}` : url;
}

// ── Types ──────────────────────────────────────────────────────

export interface CardData {
  // v2 fields (preferred)
  card_type?: CardType;
  name?: string | null;
  hero_class?: string | null;
  perk_1_name?: string | null;
  perk_1_desc?: string | null;
  color?: string | null;
  // Legacy fields (fallback)
  shape: ShapeType;
  material: MaterialType;
  background: BackgroundType;
  mana_color: ManaColor;
  rarity_tier: RarityTier;
  atk: number;
  def: number;
  hp: number;
  mana_cost: number;
  ability: string | null;
  card_number: number;
  raw_art_path?: string | null;
  thumb_path?: string | null;
  artVersion?: number;
}

interface CardRevealProps {
  card: CardData;
  index: number;
  revealed: boolean;
  onClick?: () => void;
}

// ── Helpers ─────────────────────────────────────────────────────

/** Build SplineCardContent from card data, preferring v2 fields */
export function cardToSplineContent(card: CardData): SplineCardContent {
  // v2 card: use name, perk desc, atk/hp
  if (card.card_type && card.name) {
    const typeLabel = card.card_type === 'hero'
      ? (card.hero_class || 'hero').toUpperCase()
      : card.card_type === 'land'
        ? (card.shape || 'land').toUpperCase()
        : 'ARTIFACT';

    // Resolve mana orb color from card color
    const colorHex = card.color && CARD_COLORS[card.color as CardColor]
      ? CARD_COLORS[card.color as CardColor].hex
      : '#3b82f6'; // default blue

    return {
      title: card.name.toUpperCase(),
      description: card.perk_1_name
        ? `${card.perk_1_name}: ${card.perk_1_desc || ''}`
        : card.perk_1_desc || card.ability || '',
      cardNumber: `#${String(card.card_number).padStart(3, '0')}`,
      rarity: (RARITY_LABELS[card.rarity_tier] || 'COMMON').toUpperCase(),
      stats: card.card_type === 'hero' ? `${card.atk} / ${card.hp}` : '',
      manaCost: String(card.mana_cost ?? 0),
      material: typeLabel,
      artUrl: fullArtUrl(card.thumb_path || card.raw_art_path, card.artVersion),
      manaColorHex: colorHex,
    };
  }

  // Legacy card: use shape/material/ability/def
  const legacyHex = card.mana_color && MANA_COLORS[card.mana_color]
    ? MANA_COLORS[card.mana_color].hex
    : '#3b82f6';

  return {
    title: card.shape.toUpperCase(),
    description: card.ability || '',
    cardNumber: `#${String(card.card_number).padStart(3, '0')}`,
    rarity: (RARITY_LABELS[card.rarity_tier] || 'COMMON').toUpperCase(),
    stats: `${card.atk} / ${card.def}`,
    manaCost: String(card.mana_cost),
    material: card.material.toUpperCase(),
    artUrl: fullArtUrl(card.thumb_path || card.raw_art_path, card.artVersion) || `/art-${card.shape}.png`,
    manaColorHex: legacyHex,
  };
}

// ── Card Component ─────────────────────────────────────────────
// Pure 3D — no CSS flip. Spline scene handles its own back/front and flip animation.
// Parent calls ref.triggerFlip() to emit mouseDown event to Spline.

export const CardReveal = forwardRef<SplineCardHandle, CardRevealProps>(
  function CardReveal({ card, index, revealed, onClick }, ref) {
    // Memoize to prevent unnecessary re-fires of SplineCard's content effect
    const cardContent = useMemo<SplineCardContent>(() => cardToSplineContent(card), [card]);

    return (
      <div
        className="relative"
        style={{
          width: 'var(--card-w)',
          aspectRatio: '5 / 7',
          cursor: !revealed ? 'pointer' : 'default',
        }}
        onClick={!revealed ? onClick : undefined}
      >
        <SplineCard
          ref={ref}
          className="w-full h-full pointer-events-none"
          cardContent={cardContent}
          flipObjectName="Card"
        />
      </div>
    );
  }
);
