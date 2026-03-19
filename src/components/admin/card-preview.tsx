'use client';

import type { SeedCard } from '@/lib/cards/generate-seed';
import {
  SHAPES,
  MANA_COLORS,
  RARITY_LABELS,
  ABILITIES,
} from '@/lib/constants';

// ── Rarity-specific frame styles ──────────────────────

const FRAME_STYLES: Record<string, {
  border: string;
  bg: string;
  glow: string;
  nameBar: string;
  statBg: string;
  accent: string;
}> = {
  common: {
    border: 'border-neutral-500',
    bg: 'bg-gradient-to-b from-neutral-800 to-neutral-900',
    glow: '',
    nameBar: 'bg-neutral-700',
    statBg: 'bg-neutral-700/80',
    accent: 'text-neutral-300',
  },
  uncommon: {
    border: 'border-green-600',
    bg: 'bg-gradient-to-b from-green-950 to-neutral-900',
    glow: 'shadow-[0_0_15px_rgba(34,197,94,0.15)]',
    nameBar: 'bg-green-900/80',
    statBg: 'bg-green-900/60',
    accent: 'text-green-400',
  },
  rare: {
    border: 'border-blue-500',
    bg: 'bg-gradient-to-b from-blue-950 to-neutral-900',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
    nameBar: 'bg-blue-900/80',
    statBg: 'bg-blue-900/60',
    accent: 'text-blue-400',
  },
  epic: {
    border: 'border-purple-500',
    bg: 'bg-gradient-to-b from-purple-950 to-neutral-900',
    glow: 'shadow-[0_0_25px_rgba(168,85,247,0.25)]',
    nameBar: 'bg-purple-900/80',
    statBg: 'bg-purple-900/60',
    accent: 'text-purple-400',
  },
  legendary: {
    border: 'border-yellow-500',
    bg: 'bg-gradient-to-b from-yellow-950 via-amber-950 to-neutral-900',
    glow: 'shadow-[0_0_30px_rgba(234,179,8,0.3)]',
    nameBar: 'bg-gradient-to-r from-yellow-900/80 to-amber-900/80',
    statBg: 'bg-yellow-900/60',
    accent: 'text-yellow-400',
  },
};

// ── Mana cost dots ─────────────────────────────────────

function ManaCostDots({ cost, color }: { cost: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: cost }).map((_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-full border border-white/30"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

// ── Main card preview ──────────────────────────────────

interface CardPreviewProps {
  card: SeedCard;
  artUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CardPreview({ card, artUrl, size = 'md', className = '' }: CardPreviewProps) {
  const shapeDef = SHAPES.find((s) => s.shape === card.shape);
  const mana = MANA_COLORS[card.mana_color] || { emoji: '⬜', label: 'Unknown', hex: '#6b7280' };
  const frame = FRAME_STYLES[card.rarity_tier] || FRAME_STYLES.common;
  const ability = ABILITIES.find((a) => a.name === card.ability);

  const sizeClasses = {
    sm: 'w-[180px] h-[252px]',
    md: 'w-[280px] h-[392px]',
    lg: 'w-[360px] h-[504px]',
  };

  const textSizes = {
    sm: { name: 'text-[10px]', stat: 'text-[9px]', statNum: 'text-sm', emoji: 'text-3xl', ability: 'text-[8px]', number: 'text-[7px]', mana: 'w-2 h-2' },
    md: { name: 'text-sm', stat: 'text-xs', statNum: 'text-lg', emoji: 'text-5xl', ability: 'text-[10px]', number: 'text-[9px]', mana: 'w-2.5 h-2.5' },
    lg: { name: 'text-base', stat: 'text-sm', statNum: 'text-xl', emoji: 'text-6xl', ability: 'text-xs', number: 'text-xs', mana: 'w-3 h-3' },
  };

  const t = textSizes[size];

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${frame.bg} ${frame.border} ${frame.glow}
        border-2 rounded-xl overflow-hidden
        flex flex-col relative
        select-none
        ${className}
      `}
    >
      {/* ── Top bar: Name + Mana Cost ─── */}
      <div className={`${frame.nameBar} px-2.5 py-1.5 flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={t.name}>{shapeDef?.emoji}</span>
          <span className={`${t.name} font-bold capitalize text-white truncate`}>
            {card.shape}
          </span>
          <span className={`${t.number} uppercase tracking-wider text-white/40 ml-1`}>
            {card.material}
          </span>
        </div>
        <ManaCostDots cost={card.mana_cost} color={mana.hex} />
      </div>

      {/* ── Art area ─── */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {artUrl ? (
          <img
            src={artUrl}
            alt={`${card.shape} ${card.material}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-800/50 relative">
            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
            />
            <span className={`${t.emoji} opacity-40 select-none relative z-10`}>
              {shapeDef?.emoji}
            </span>
          </div>
        )}

        {/* Rarity badge overlay */}
        <div className={`
          absolute top-1.5 right-1.5
          ${frame.statBg} backdrop-blur-sm
          rounded px-1.5 py-0.5
        `}>
          <span className={`${t.number} font-bold ${frame.accent}`}>
            {RARITY_LABELS[card.rarity_tier]}
          </span>
        </div>

        {/* Card number overlay */}
        <div className="absolute bottom-1.5 left-1.5 bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5">
          <span className={`${t.number} font-mono text-white/60`}>
            #{String(card.card_number).padStart(3, '0')}
          </span>
        </div>
      </div>

      {/* ── Ability bar (if any) ─── */}
      {ability && (
        <div className={`${frame.statBg} px-2.5 py-1.5 border-t border-white/10 shrink-0`}>
          <div className={`${t.ability} leading-tight`}>
            <span className={`font-bold ${frame.accent}`}>{ability.name}</span>
            <span className="text-neutral-400 ml-1">— {ability.description}</span>
          </div>
        </div>
      )}

      {/* ── Bottom stats bar ─── */}
      <div className={`${frame.nameBar} px-2 py-1.5 flex items-center justify-between shrink-0 border-t border-white/10`}>
        <div className="flex items-center gap-2">
          <StatChip label="ATK" value={card.atk} color="text-red-400" size={t} />
          <StatChip label="DEF" value={card.def} color="text-blue-400" size={t} />
          <StatChip label="HP" value={card.hp} color="text-green-400" size={t} />
        </div>
        <div className="flex items-center gap-1">
          <span className={`${t.number} text-white/40`}>{card.background?.replace('_', ' ') ?? ''}</span>
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value, color, size }: {
  label: string;
  value: number;
  color: string;
  size: { stat: string; statNum: string };
}) {
  return (
    <div className="flex items-center gap-0.5">
      <span className={`${size.stat} ${color} font-bold`}>{label}</span>
      <span className={`${size.statNum} font-bold text-white`}>{value}</span>
    </div>
  );
}
