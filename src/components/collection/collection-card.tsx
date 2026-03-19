'use client';

import { useRef, useState, useCallback } from 'react';
import { RARITY_LABELS } from '@/lib/constants';
import { ManaCostDisplay } from '@/components/ui/mana-orb';
import type { CardColor } from '@/types/cards';
import type { OwnedCardDetails } from '@/hooks/use-user-cards';

interface CollectionCardProps {
  card: OwnedCardDetails;
  onClick?: () => void;
  size?: 'sm' | 'md';
  badge?: string;
  dimmed?: boolean;
}

const RARITY_GLOW: Record<string, string> = {
  common: 'rgba(120,120,120,0.2)',
  uncommon: 'rgba(34,197,94,0.3)',
  rare: 'rgba(59,130,246,0.35)',
  epic: 'rgba(168,85,247,0.4)',
  legendary: 'rgba(234,179,8,0.5)',
};

const RARITY_BORDER_HEX: Record<string, string> = {
  common: '#555',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#eab308',
};

/** Build art proxy URL from any path field */
function artProxyUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const clean = path.replace(/^raw-arts\//, '');
  return `/api/art-proxy?path=${encodeURIComponent(clean)}`;
}

/** Derive display fields matching the Spline card layout */
function cardDisplayFields(card: OwnedCardDetails) {
  // v2 card with name
  if (card.card_type && card.name) {
    const typeLabel = card.card_type === 'hero'
      ? (card.hero_class || 'hero').toUpperCase()
      : card.card_type === 'land'
        ? (card.shape || 'land').toUpperCase()
        : 'ARTIFACT';

    return {
      title: card.name,
      description: card.perk_1_name
        ? `${card.perk_1_name}: ${card.perk_1_desc || ''}`
        : card.perk_1_desc || card.ability || '',
      stats: card.card_type === 'hero' ? `${card.atk} / ${card.hp}` : '',
      typeLabel,
    };
  }

  // Legacy land card
  return {
    title: card.shape,
    description: card.ability || '',
    stats: '',
    typeLabel: card.material.toUpperCase(),
  };
}

export function CollectionCard({ card, onClick, size = 'md', badge, dimmed }: CollectionCardProps) {
  const compact = size === 'sm';
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [shimmerPos, setShimmerPos] = useState({ x: 50, y: 50 });

  const artSrc = artProxyUrl(card.thumb_path || card.processed_card_path || card.raw_art_path);
  const display = cardDisplayFields(card);
  const borderColor = RARITY_BORDER_HEX[card.rarity_tier] || '#555';
  const glowColor = RARITY_GLOW[card.rarity_tier] || 'rgba(120,120,120,0.2)';

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (y - 0.5) * -16, y: (x - 0.5) * 16 });
    setShimmerPos({ x: x * 100, y: y * 100 });
  }, []);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  const rarity = RARITY_LABELS[card.rarity_tier as keyof typeof RARITY_LABELS] || card.rarity_tier;
  const cardNum = `#${String(card.card_number).padStart(3, '0')}`;

  return (
    <div
      className="cursor-pointer"
      style={{ perspective: '800px' }}
      onClick={onClick}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative rounded-xl overflow-hidden select-none"
        style={{
          width: '100%',
          aspectRatio: '5 / 7',
          background: '#0d0d1a',
          border: `2px solid ${borderColor}`,
          boxShadow: isHovered
            ? `0 12px 40px ${glowColor}, 0 0 20px ${glowColor}`
            : `0 2px 10px rgba(0,0,0,0.5)`,
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.05 : 1})`,
          transition: isHovered
            ? 'box-shadow 0.3s ease'
            : 'transform 0.5s ease, box-shadow 0.3s ease',
          transformStyle: 'preserve-3d',
          willChange: 'transform',
        }}
      >
        {/* Holographic shimmer */}
        {isHovered && (
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: `radial-gradient(circle at ${shimmerPos.x}% ${shimmerPos.y}%, rgba(255,255,255,0.12) 0%, transparent 50%)`,
              mixBlendMode: 'overlay',
            }}
          />
        )}

        {/* Rainbow holo for epic/legendary */}
        {(card.rarity_tier === 'epic' || card.rarity_tier === 'legendary') && isHovered && (
          <div
            className="absolute inset-0 pointer-events-none z-10 opacity-25"
            style={{
              background: `linear-gradient(${shimmerPos.x * 3.6}deg,
                rgba(255,0,0,0.3), rgba(255,165,0,0.3), rgba(255,255,0,0.3),
                rgba(0,255,0,0.3), rgba(0,0,255,0.3), rgba(128,0,255,0.3))`,
              mixBlendMode: 'color-dodge',
            }}
          />
        )}

        {/* Card art (full bleed) */}
        {artSrc && (
          <img
            src={artSrc}
            alt={display.title}
            className="absolute inset-0 w-full h-full object-cover z-0"
            loading="lazy"
          />
        )}

        {/* Mana cost — top right */}
        {card.mana_cost > 0 && (
          <div className="absolute top-1.5 right-1.5 z-20">
            <ManaCostDisplay
              color={(card.color as CardColor) || 'white'}
              coloredCost={card.colored_cost}
              genericCost={card.generic_cost}
              totalCost={card.mana_cost}
              size={18}
            />
          </div>
        )}

        {/* Rarity + number — top left */}
        <div
          className="absolute top-0 left-0 right-8 z-20 px-2.5 py-2"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: borderColor }}>
              {rarity}
            </span>
            <span className="text-[8px] font-mono text-white/40 ml-auto">
              {cardNum}
            </span>
          </div>
        </div>

        {/* Badge overlay (e.g. "x2") */}
        {badge && (
          <div className="absolute top-1 left-1 z-30 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
            {badge}
          </div>
        )}

        {/* Dimmed overlay */}
        {dimmed && (
          <div className="absolute inset-0 z-30 bg-black/60 rounded-xl" />
        )}

        {/* Bottom content — matches Spline card layout */}
        <div
          className={`absolute bottom-0 inset-x-0 z-20 px-2.5 pt-8 ${compact ? 'pb-1.5' : 'pb-2.5'}`}
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)' }}
        >
          {/* Title */}
          <div className="text-[12px] font-bold text-white uppercase tracking-wide truncate">
            {display.title}
          </div>

          {/* Type label */}
          <div className="text-[8px] uppercase tracking-[0.2em] mt-0.5" style={{ color: borderColor }}>
            {display.typeLabel}
          </div>

          {/* Stats (ATK / HP) — only for heroes */}
          {display.stats && (
            <div className="text-[10px] font-bold text-white/80 mt-1">
              {display.stats}
            </div>
          )}

          {/* Perk/ability — hidden in compact mode */}
          {!compact && display.description && (
            <div className="text-[8px] text-white/50 mt-1 line-clamp-2 leading-tight">
              {display.description}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
