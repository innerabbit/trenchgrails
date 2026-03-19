'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchBoosterPack } from '@/lib/cards/fetch-pack';
import type { BoosterStage, PackCard } from '@/components/three/booster-scene';
import type { RarityTier } from '@/types/cards';
import { MANA_COLORS, RARITY_LABELS } from '@/lib/constants';

// ── Rarity colors ─────────────────────────────────────────────

const RARITY_HEX: Record<RarityTier, string> = {
  common: '#6b7280',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#eab308',
};

// ── Card reveal popup ───────────────────────────────────────────

function CardRevealInfo({ card }: { card: PackCard | null }) {
  if (!card) return null;

  return (
    <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="xp-window p-0" style={{ minWidth: 260 }}>
        <div className="xp-title-bar" style={{ background: RARITY_HEX[card.rarity_tier] }}>
          <div className="flex items-center gap-[6px]">
            <span className="text-sm">{MANA_COLORS[card.mana_color].emoji}</span>
            <span className="xp-title-text uppercase tracking-wider">{card.shape}</span>
          </div>
          <span className="xp-title-text text-[10px]">#{card.card_number}</span>
        </div>
        <div className="p-3 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.2em] px-2 py-0.5"
              style={{
                color: RARITY_HEX[card.rarity_tier],
                border: `1px solid ${RARITY_HEX[card.rarity_tier]}`,
              }}
            >
              {RARITY_LABELS[card.rarity_tier]}
            </span>
            <span className="text-[#666] text-[10px] uppercase tracking-wider">
              {card.material}
            </span>
          </div>
          <div className="flex justify-center gap-3 text-[11px]">
            <span className="text-[#c00]">ATK {card.atk}</span>
            <span className="text-[#36c]">DEF {card.def}</span>
            <span className="text-[#060]">HP {card.hp}</span>
            <span className="text-[#c90]">MANA {card.mana_cost}</span>
          </div>
          {card.ability && (
            <div className="mt-1.5 text-[#639] text-[10px]">
              {card.ability}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stage hint ─────────────────────────────────────────────────

function StageHint({ stage, revealedCount, total }: {
  stage: BoosterStage;
  revealedCount: number;
  total: number;
}) {
  const hints: Record<BoosterStage, string> = {
    idle: 'Click the booster pack to open',
    opening: 'Opening...',
    revealing: `Click to reveal card ${revealedCount + 1} of ${total}`,
    showcase: 'Your cards!',
    done: '',
  };

  if (!hints[stage]) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60]">
      <div className="xp-window p-0">
        <div className="px-4 py-1.5 text-[11px] text-[#222]">
          {hints[stage]}
        </div>
      </div>
    </div>
  );
}

// ── Summary after all revealed ─────────────────────────────────

function PackSummary({ cards, onNewPack, onClose }: {
  cards: PackCard[];
  onNewPack: () => void;
  onClose: () => void;
}) {
  const bestCard = cards.reduce((best, c) => {
    const order: RarityTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    return order.indexOf(c.rarity_tier) > order.indexOf(best.rarity_tier) ? c : best;
  }, cards[0]);

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/20 animate-in fade-in duration-700">
      <div className="xp-window" style={{ maxWidth: 380, width: '90%' }}>
        <div className="xp-title-bar">
          <div className="flex items-center gap-[6px]">
            <span className="text-sm">🎴</span>
            <span className="xp-title-text">Pack Opened!</span>
          </div>
          <div className="flex items-center gap-[2px]">
            <button className="xp-btn-close" aria-label="Close" onClick={onClose}>
              <svg width="8" height="8" viewBox="0 0 8 8"><path d="M0 0L8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          </div>
        </div>
        <div className="xp-body p-4">
          <p className="text-[11px] text-[#666] text-center mb-3">{cards.length} cards revealed</p>

          <div
            className="border p-3 mb-3 text-center"
            style={{ borderColor: RARITY_HEX[bestCard.rarity_tier] }}
          >
            <div className="text-[10px] text-[#888] uppercase tracking-wider mb-1">Best Pull</div>
            <div className="text-xl mb-0.5">{MANA_COLORS[bestCard.mana_color].emoji}</div>
            <div className="text-[13px] font-bold uppercase">{bestCard.shape}</div>
            <div className="text-[11px] font-bold uppercase" style={{ color: RARITY_HEX[bestCard.rarity_tier] }}>
              {RARITY_LABELS[bestCard.rarity_tier]} {bestCard.material}
            </div>
          </div>

          <div className="space-y-1 mb-4">
            {cards.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1" style={{ background: i % 2 === 0 ? '#f0f0f0' : 'transparent' }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{MANA_COLORS[c.mana_color].emoji}</span>
                  <span className="text-[11px] capitalize">{c.shape}</span>
                  <span className="text-[10px] text-[#888] capitalize">{c.material}</span>
                </div>
                <span className="text-[10px] font-bold uppercase" style={{ color: RARITY_HEX[c.rarity_tier] }}>
                  {c.rarity_tier}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={onNewPack} className="xp-button flex-1 text-center">
              Open Another
            </button>
            <button onClick={onClose} className="xp-button flex-1 text-center">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page — transparent overlay on top of XP interface ──────

export default function OpenBoosterPage() {
  const router = useRouter();
  const [SceneComponent, setSceneComponent] = useState<React.ComponentType<any> | null>(null);
  const [packCards, setPackCards] = useState<PackCard[]>([]);
  const [stage, setStage] = useState<BoosterStage>('idle');
  const [revealedCount, setRevealedCount] = useState(0);
  const [lastRevealed, setLastRevealed] = useState<PackCard | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Load 3D scene component + fetch pack data
  useEffect(() => {
    import('@/components/three/booster-scene')
      .then(mod => setSceneComponent(() => mod.BoosterScene))
      .catch(err => console.error('Failed to load 3D scene:', err));

    fetchBoosterPack().then(result => setPackCards(result.cards));
  }, []);

  const handleStageChange = useCallback((newStage: BoosterStage) => {
    setStage(newStage);
    if (newStage === 'showcase') setLastRevealed(null);
  }, []);

  const handleCardReveal = useCallback((card: PackCard, index: number) => {
    setLastRevealed(card);
    setRevealedCount(index + 1);
  }, []);

  const handleComplete = useCallback(() => setShowSummary(true), []);

  const handleNewPack = useCallback(() => {
    fetchBoosterPack().then(result => {
      setPackCards(result.cards);
      setStage('idle');
      setRevealedCount(0);
      setLastRevealed(null);
      setShowSummary(false);
    });
  }, []);

  const handleClose = useCallback(() => router.back(), [router]);

  return (
    <>
      {/* Full-viewport transparent overlay — XP interface visible behind */}
      <div className="fixed inset-0 z-50">
        {/* 3D Canvas fills viewport, transparent background */}
        <div className="w-full h-full">
          {SceneComponent ? (
            <SceneComponent
              cards={packCards}
              onStageChange={handleStageChange}
              onCardReveal={handleCardReveal}
              onComplete={handleComplete}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="xp-window p-0">
                <div className="px-6 py-4 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#316ac5] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] text-[#666]">Loading 3D...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* UI Overlays */}
        <StageHint stage={stage} revealedCount={revealedCount} total={packCards.length} />
        {stage === 'revealing' && lastRevealed && <CardRevealInfo card={lastRevealed} />}
        {showSummary && <PackSummary cards={packCards} onNewPack={handleNewPack} onClose={handleClose} />}

        {/* Close button */}
        {!showSummary && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-[60] xp-button px-3 py-1 text-[11px]"
          >
            Close
          </button>
        )}
      </div>
    </>
  );
}
