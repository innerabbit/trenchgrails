'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { SplineBooster, type SplineBoosterHandle } from './spline-booster';
import { CardReveal, type CardData } from './card-reveal';
import { PackParticles } from './particles';
import { fetchBoosterPack } from '@/lib/cards/fetch-pack';
import type { SplineCardHandle } from './spline-card';

type OverlayStage = 'pack' | 'revealing';

interface BoosterOverlayProps {
  onClose: () => void;
  preloadedCards?: CardData[];
  txSignatures?: string[];
}

export function BoosterOverlay({ onClose, preloadedCards, txSignatures }: BoosterOverlayProps) {
  const [cards, setCards] = useState<CardData[]>(preloadedCards ?? []);
  const [packLoading, setPackLoading] = useState(!preloadedCards);
  const [stage, setStage] = useState<OverlayStage>('pack');
  const [boosterReady, setBoosterReady] = useState(false);
  const [boosterOpening, setBoosterOpening] = useState(false);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [showParticles, setShowParticles] = useState(false);
  const [visible, setVisible] = useState(false);
  const revealAllTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cardRefs = useRef<(SplineCardHandle | null)[]>([]);
  const boosterRef = useRef<SplineBoosterHandle>(null);

  // Derived state
  const allRevealed = revealed.length >= cards.length && cards.length > 0;

  // Fetch booster pack from API (fallback to local) — skip if preloaded
  useEffect(() => {
    if (preloadedCards) return;
    fetchBoosterPack().then(result => {
      setCards(result.cards);
      setPackLoading(false);
    });
  }, [preloadedCards]);

  // Fade in overlay
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Cleanup stagger timers
  useEffect(() => {
    return () => revealAllTimers.current.forEach(clearTimeout);
  }, []);

  const handlePackClick = useCallback(() => {
    if (!boosterReady || boosterOpening || packLoading) return;
    setBoosterOpening(true);
    setShowParticles(true);
    boosterRef.current?.triggerOpen();
  }, [boosterReady, boosterOpening, packLoading]);

  const handleBoosterAnimationEnd = useCallback(() => {
    setStage('revealing');
  }, []);

  const handleCardClick = useCallback((index: number) => {
    setRevealed(prev => {
      if (prev.includes(index)) return prev;
      return [...prev, index];
    });
    cardRefs.current[index]?.triggerFlip();
  }, []);

  const handleRevealAll = useCallback(() => {
    const unrevealed = cards
      .map((_, i) => i)
      .filter(i => !revealed.includes(i));

    unrevealed.forEach((cardIndex, i) => {
      const timer = setTimeout(() => {
        setRevealed(prev => {
          if (prev.includes(cardIndex)) return prev;
          return [...prev, cardIndex];
        });
        cardRefs.current[cardIndex]?.triggerFlip();
      }, i * 250);
      revealAllTimers.current.push(timer);
    });
  }, [cards, revealed]);

  // ── Hint text (pack stage only) ─────────────────────────────────

  const hintText =
    packLoading ? 'Loading pack...' :
    stage === 'pack' && boosterReady && !boosterOpening ? 'Click the pack to open' :
    stage === 'pack' && boosterOpening ? 'Opening...' :
    null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm">

      {/* Particles */}
      <PackParticles active={showParticles} />

      {/* Close X — top right */}
      <button
          onClick={onClose}
          className="absolute top-3 right-3 z-[60] w-8 h-8 flex items-center justify-center rounded-sm"
          aria-label="Close"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <svg width="14" height="14" viewBox="0 0 8 8"><path d="M0 0L8 8M8 0L0 8" stroke="white" strokeWidth="1.5"/></svg>
      </button>

      {/* Booster Pack + centered hint */}
      {stage === 'pack' && (
        <div className="absolute inset-0 flex items-center justify-center z-[52]">
          <div
            className="relative"
            style={{
              width: '80vw',
              height: '80vh',
              maxWidth: 600,
              maxHeight: 700,
              cursor: boosterReady && !boosterOpening ? 'pointer' : 'default',
            }}
          >
            <SplineBooster
              ref={boosterRef}
              className="w-full h-full"
              onLoad={() => setBoosterReady(true)}
              onClick={handlePackClick}
              animationDuration={3000}
              onAnimationEnd={handleBoosterAnimationEnd}
            />
            {/* Large hint centered on the pack */}
            {hintText && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-[55]"
                style={{
                  opacity: visible ? 1 : 0,
                  transition: 'opacity 0.3s ease-out',
                }}
              >
                <div className="text-white text-center">
                  <div className="text-xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{hintText}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cards — 6 Spline 3D cards */}
      {stage === 'revealing' && (
        <div className="absolute inset-0 z-[52] flex items-center justify-center pt-10 pb-16">
          <div
            className="grid grid-cols-3 gap-0 place-items-center"
            style={{
              '--card-w': 'min(calc((100vw - 4px) / 3), calc((100vh - 120px) / 2 * 5 / 7))',
            } as React.CSSProperties}
          >
            {cards.map((card, i) => (
              <CardReveal
                key={i}
                ref={(handle) => { cardRefs.current[i] = handle; }}
                card={card}
                index={i}
                revealed={revealed.includes(i)}
                onClick={() => handleCardClick(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar — Claim after all revealed */}
      {stage === 'revealing' && allRevealed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-1.5">
          <button
            onClick={onClose}
            className="xp-button xp-button-primary px-8 py-2 text-[13px] font-bold whitespace-nowrap"
          >
            Claim
          </button>
          {txSignatures?.[0] && (
            <a
              href={`https://solscan.io/tx/${txSignatures[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-white/60 hover:text-white/90 transition-colors"
            >
              Proof: {txSignatures[0].slice(0, 8)}...{txSignatures[0].slice(-8)} ↗
            </a>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}

