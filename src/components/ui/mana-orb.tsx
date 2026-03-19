'use client';

import type { CardColor } from '@/types/cards';

/**
 * Flat mana orb icon — colored by card color.
 * Renders as an inline SVG gem/crystal with gradient.
 */

const COLOR_DEFS: Record<CardColor, { light: string; mid: string; dark: string; glow: string }> = {
  yellow: { light: '#fde047', mid: '#eab308', dark: '#a16207', glow: '#fef08a' },
  blue:   { light: '#93c5fd', mid: '#3b82f6', dark: '#1e40af', glow: '#bfdbfe' },
  black:  { light: '#a78bfa', mid: '#7c3aed', dark: '#3b0764', glow: '#c4b5fd' },
  red:    { light: '#fca5a5', mid: '#ef4444', dark: '#991b1b', glow: '#fecaca' },
  green:  { light: '#86efac', mid: '#22c55e', dark: '#166534', glow: '#bbf7d0' },
  white:  { light: '#f1f5f9', mid: '#cbd5e1', dark: '#64748b', glow: '#ffffff' },
};

interface ManaOrbProps {
  color: CardColor;
  size?: number;
  className?: string;
}

export function ManaOrb({ color, size = 24, className }: ManaOrbProps) {
  const c = COLOR_DEFS[color] || COLOR_DEFS.blue;
  const id = `mana-${color}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        <radialGradient id={`${id}-grad`} cx="40%" cy="35%" r="55%">
          <stop offset="0%" stopColor={c.glow} />
          <stop offset="40%" stopColor={c.light} />
          <stop offset="80%" stopColor={c.mid} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
        <radialGradient id={`${id}-shine`} cx="35%" cy="30%" r="30%">
          <stop offset="0%" stopColor="white" stopOpacity="0.7" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Shadow */}
      <ellipse cx="12" cy="20" rx="6" ry="2" fill="rgba(0,0,0,0.15)" />
      {/* Main gem body — diamond/crystal shape */}
      <path
        d="M12 2 L20 10 L12 22 L4 10 Z"
        fill={`url(#${id}-grad)`}
        stroke={c.dark}
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
      {/* Shine highlight */}
      <path
        d="M12 2 L20 10 L12 22 L4 10 Z"
        fill={`url(#${id}-shine)`}
      />
      {/* Edge facets */}
      <path
        d="M12 2 L12 22 M4 10 L20 10"
        stroke={c.glow}
        strokeWidth="0.4"
        strokeOpacity="0.4"
        fill="none"
      />
    </svg>
  );
}

/** Mana cost display — shows colored gems + generic cost number */
interface ManaCostDisplayProps {
  color: CardColor;
  coloredCost?: number | null;
  genericCost?: number | null;
  totalCost?: number | null;
  size?: number;
  className?: string;
}

export function ManaCostDisplay({
  color,
  coloredCost,
  genericCost,
  totalCost,
  size = 16,
  className,
}: ManaCostDisplayProps) {
  // If we have colored + generic breakdown, show them separately
  const colored = coloredCost ?? 0;
  const generic = genericCost ?? 0;
  const total = totalCost ?? (colored + generic);

  if (total <= 0) return null;

  return (
    <div className={`flex items-center gap-0.5 ${className || ''}`}>
      {/* Generic cost (gray circle with number) */}
      {generic > 0 && (
        <div
          className="rounded-full flex items-center justify-center font-bold text-white"
          style={{
            width: size,
            height: size,
            fontSize: size * 0.55,
            background: 'rgba(100,100,120,0.85)',
          }}
        >
          {generic}
        </div>
      )}
      {/* Colored mana gems */}
      {Array.from({ length: Math.min(colored || total, 5) }).map((_, i) => (
        <ManaOrb key={i} color={color} size={size} />
      ))}
    </div>
  );
}
