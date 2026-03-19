'use client';

import { useWindowManager } from '@/lib/stores/window-manager';

const STEPS = [
  {
    icon: '⚡',
    title: 'HOLD',
    desc: 'Hold $TRENCHGRAILS tokens to unlock free mints',
    color: '#d4a830',
  },
  {
    icon: '📦',
    title: 'COLLECT',
    desc: 'Open booster packs. Each pack = 3 NFT cards',
    color: '#3b82f6',
  },
  {
    icon: '⚔️',
    title: 'BATTLE',
    desc: 'Build your deck. Climb the leaderboard',
    color: '#ef4444',
  },
];

export function OnboardingContent() {
  const openWindow = useWindowManager((s) => s.openWindow);
  const closeWindow = useWindowManager((s) => s.closeWindow);

  const goToShop = () => {
    closeWindow('onboarding');
    openWindow('shop');
  };

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #0a0a12 0%, #141428 100%)',
        margin: -12,
        padding: '28px 24px 20px',
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}
    >
      {/* Title banner */}
      <div
        style={{
          textAlign: 'center',
          animation: 'mtg-fade-in 0.4s ease-out',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 900,
            letterSpacing: 5,
            color: '#d4a830',
            textShadow: '0 0 12px rgba(212,168,48,0.4), 0 2px 4px rgba(0,0,0,0.6)',
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}
        >
          TRENCH GRAILS
        </h1>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 10,
            color: '#7a7a8e',
            fontStyle: 'italic',
            letterSpacing: 1,
          }}
        >
          Collectible Card Game on Solana
        </p>
        {/* Gold divider */}
        <div
          style={{
            width: 120,
            height: 1,
            background: 'linear-gradient(90deg, transparent, #c4a032, transparent)',
            margin: '14px auto 0',
          }}
        />
      </div>

      {/* Step cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          width: '100%',
          maxWidth: 460,
        }}
      >
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="mtg-step-card"
            style={{
              border: `1px solid ${step.color}33`,
              background: `linear-gradient(180deg, ${step.color}08 0%, ${step.color}03 100%)`,
              borderRadius: 2,
              padding: '16px 10px 14px',
              textAlign: 'center',
              transition: 'box-shadow 0.2s, border-color 0.2s',
              animation: `mtg-fade-in 0.4s ease-out ${0.15 + i * 0.15}s both`,
              cursor: 'default',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = `0 0 12px ${step.color}22, inset 0 0 20px ${step.color}08`;
              e.currentTarget.style.borderColor = `${step.color}66`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderColor = `${step.color}33`;
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{step.icon}</div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: step.color,
                letterSpacing: 2,
                marginBottom: 6,
                textShadow: `0 0 8px ${step.color}33`,
              }}
            >
              {step.title}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#9a9ab0',
                lineHeight: 1.4,
              }}
            >
              {step.desc}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 4,
          animation: 'mtg-fade-in 0.4s ease-out 0.7s both',
        }}
      >
        <button
          onClick={goToShop}
          className="mtg-cta-button"
          style={{
            background: 'linear-gradient(180deg, #c4a032 0%, #8a6e1a 100%)',
            color: '#fff',
            border: '1px solid #d4a830',
            borderRadius: 2,
            padding: '7px 22px',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            cursor: 'pointer',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
            boxShadow: '0 0 8px rgba(212,168,48,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
            transition: 'box-shadow 0.2s, transform 0.1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 16px rgba(212,168,48,0.4), inset 0 1px 0 rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 8px rgba(212,168,48,0.2), inset 0 1px 0 rgba(255,255,255,0.15)';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.97)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          ⚔️ Enter the Arena
        </button>
        <button
          onClick={() => closeWindow('onboarding')}
          style={{
            background: 'none',
            border: 'none',
            color: '#555568',
            fontSize: 11,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#8a8a9e'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#555568'; }}
        >
          Skip
        </button>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes mtg-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 500px) {
          .mtg-step-card {
            grid-column: span 3 !important;
          }
        }
      `}</style>
    </div>
  );
}
