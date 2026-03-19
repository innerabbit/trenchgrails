'use client';

import { useState, useEffect } from 'react';
import { SplineCard } from './spline-card';

export type PackPhase = 'entering' | 'idle' | 'shaking' | 'tearing' | 'done';

interface HoloPackProps {
  phase: PackPhase;
  onClick?: () => void;
}

export function HoloPack({ phase, onClick }: HoloPackProps) {
  const [entered, setEntered] = useState(false);
  const [splineReady, setSplineReady] = useState(false);

  // Trigger enter animation after mount
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const isClickable = phase === 'idle';

  if (phase === 'done') return null;

  return (
    <div className="relative" style={{ perspective: 1000 }}>
      <div
        className={`relative w-[260px] h-[370px] mx-auto ${
          phase === 'shaking' ? 'animate-pack-shake' : ''
        }`}
        style={{
          cursor: isClickable ? 'pointer' : 'default',
          transform: entered
            ? `${phase === 'tearing' ? 'scale(1.05)' : 'scale(1)'}`
            : 'translateY(-200px) scale(0.6) rotateZ(-15deg)',
          opacity: entered ? 1 : 0,
          transition: phase === 'idle'
            ? 'transform 0.15s ease-out, opacity 0.5s ease-out'
            : 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease-out',
        }}
        onClick={isClickable ? onClick : undefined}
      >
        {/* Spline 3D holographic card background */}
        <SplineCard
          className="w-full h-full"
          onLoad={() => setSplineReady(true)}
        />

        {/* Pack branding overlay */}
        <div
          className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-end pb-6"
          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}
        >
          <div className="text-white text-lg font-bold tracking-[0.3em]">TRENCH</div>
          <div className="text-white text-lg font-bold tracking-[0.3em]">GRAILS</div>
          <div className="text-white/40 text-[8px] tracking-[0.2em] mt-1">BOOSTER PACK &bull; 6 CARDS</div>
        </div>

        {/* Tear line */}
        <div
          className={`absolute top-[52px] left-0 right-0 h-[2px] z-20 ${phase === 'tearing' ? 'animate-tear-glow' : ''}`}
          style={{
            background: phase === 'tearing'
              ? 'linear-gradient(90deg, transparent 5%, rgba(255,170,0,0.8) 20%, rgba(255,255,255,0.9) 50%, rgba(255,170,0,0.8) 80%, transparent 95%)'
              : 'transparent',
          }}
        />

        {/* Top flap tears off */}
        {phase === 'tearing' && (
          <div
            className="absolute top-0 left-0 right-0 h-[54px] rounded-t-xl overflow-hidden animate-flap-tear z-20"
            style={{
              background: 'linear-gradient(135deg, #0a0318, #1a0a2e)',
              transformOrigin: 'bottom center',
              boxShadow: '0 0 30px rgba(255, 170, 0, 0.4)',
            }}
          />
        )}

        {/* Light burst from opening */}
        {phase === 'tearing' && (
          <div
            className="absolute top-[40px] left-1/2 -translate-x-1/2 w-full h-40 pointer-events-none animate-light-burst z-20"
            style={{
              background: 'radial-gradient(ellipse at center top, rgba(255,200,50,0.8) 0%, rgba(255,150,0,0.3) 40%, transparent 70%)',
            }}
          />
        )}

        {/* Idle floating */}
        {phase === 'idle' && (
          <div className="absolute inset-0 pointer-events-none animate-float" />
        )}
      </div>
    </div>
  );
}
