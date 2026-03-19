'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useWindowManager } from '@/lib/stores/window-manager';
import { SplineCard, type SplineCardHandle } from '@/components/booster/spline-card';
import { cardToSplineContent } from '@/components/booster/card-reveal';
import type { CardV2 } from '@/types/cards';

export function OnboardingContent() {
  const openWindow = useWindowManager((s) => s.openWindow);
  const closeWindow = useWindowManager((s) => s.closeWindow);
  const [randomCard, setRandomCard] = useState<CardV2 | null>(null);
  const [allCards, setAllCards] = useState<CardV2[]>([]);
  const cardRef = useRef<SplineCardHandle>(null);

  useEffect(() => {
    fetch('/api/cards')
      .then(r => r.json())
      .then((cards: CardV2[]) => {
        const withArt = cards?.filter(c => c.raw_art_path);
        if (withArt?.length) {
          setAllCards(withArt);
          setRandomCard(withArt[Math.floor(Math.random() * withArt.length)]);
        }
      })
      .catch(() => {});
  }, []);

  const shuffleCard = () => {
    if (allCards.length < 2) return;
    let next: CardV2;
    do {
      next = allCards[Math.floor(Math.random() * allCards.length)];
    } while (next.id === randomCard?.id);
    setRandomCard(next);
  };

  const cardContent = useMemo(
    () => randomCard ? cardToSplineContent(randomCard as any) : undefined,
    [randomCard],
  );

  const goToShop = () => {
    closeWindow('onboarding');
    openWindow('shop');
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Left panel — 3D card + random button */}
      <div className="shrink-0 flex flex-col items-center" style={{ width: 240 }}>
        <div
          className="w-full rounded-sm overflow-hidden flex items-center justify-center"
          style={{ minHeight: 340 }}
        >
          {cardContent ? (
            <SplineCard
              key={randomCard?.id}
              ref={cardRef}
              cardContent={cardContent}
              style={{ width: '100%', height: 340 }}
              onLoad={() => {
                setTimeout(() => cardRef.current?.triggerFlip(), 600);
              }}
            />
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center text-center p-5"
              style={{
                background: 'linear-gradient(180deg, #1a5aaf 0%, #2b6cc4 30%, #3a80d8 100%)',
                color: 'white',
                minHeight: 280,
              }}
            >
              <div className="text-5xl mb-3">🎴</div>
              <div className="text-lg font-bold" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
                THE SHAPE
              </div>
              <div className="text-2xl font-black tracking-wider" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.3)' }}>
                GAME
              </div>
              <div className="text-[10px] mt-2 opacity-80">NFT Card Game on Solana</div>
            </div>
          )}
        </div>
        {allCards.length > 1 && (
          <button
            onClick={shuffleCard}
            className="xp-button px-3 py-[3px] text-[11px] mt-2 w-full"
          >
            🔀 Random
          </button>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 space-y-5">
        <div>
          <h2 className="text-sm font-bold text-[#003399] mb-1">Welcome to The Shape Game</h2>
          <p className="text-[11px] text-[#444] leading-relaxed">
            NFT card game on Solana. Hold, collect, battle.
          </p>
        </div>

        {/* How it works */}
        <fieldset className="xp-groupbox">
          <legend className="xp-groupbox-legend">How It Works</legend>
          <div className="space-y-3">
            {[
              { step: '1.', icon: '💎', title: 'Hold SOL', desc: 'Get access to free booster packs' },
              { step: '2.', icon: '📦', title: 'Open Boosters', desc: '3 NFT cards in each pack, free' },
              { step: '3.', icon: '⚔️', title: 'Battle', desc: 'Build your deck and fight' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex items-start gap-2 text-[11px]">
                <span className="text-[#003399] font-bold w-4 shrink-0">{step}</span>
                <span className="text-base shrink-0">{icon}</span>
                <div>
                  <span className="font-bold text-[#222]">{title}</span>
                  <span className="text-[#666]"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        {/* CTA */}
        <div className="flex items-center gap-2 pt-2">
          <button
            onClick={goToShop}
            className="xp-button xp-button-primary px-6 py-[5px] text-[12px] font-bold"
          >
            🎴 Free Mint
          </button>
          <button
            onClick={goToShop}
            className="xp-button px-4 py-[5px] text-[12px] text-[#666]"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
