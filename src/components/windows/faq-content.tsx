'use client';

import { useState } from 'react';

interface SectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid #d4d0c8',
          padding: '6px 4px',
          cursor: 'pointer',
          fontFamily: 'Tahoma, sans-serif',
          fontSize: 12,
          fontWeight: 700,
          color: '#003399',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 10, width: 12, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && (
        <div style={{ padding: '6px 8px 8px 16px', fontSize: 11, lineHeight: 1.5 }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function FaqContent() {
  return (
    <div style={{
      fontFamily: 'Tahoma, sans-serif',
      fontSize: 11,
      color: '#000',
      background: '#fff',
      height: '100%',
      overflow: 'auto',
    }}>
      {/* Header bar — XP Help style */}
      <div style={{
        background: 'linear-gradient(180deg, #6b89c4 0%, #3a5da0 100%)',
        padding: '6px 10px',
        color: '#fff',
        fontSize: 13,
        fontWeight: 700,
        borderBottom: '1px solid #2a4080',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ fontSize: 16 }}>?</span>
        THE SHAPE GAME — FAQ
      </div>

      <div style={{ padding: '4px 6px' }}>
        <Section title="🃏 What is The Shape Game?" defaultOpen>
          <p style={{ margin: 0 }}>
            A collectible card game on Solana. Collect shape cards, build decks, climb the leaderboard and earn real rewards.
          </p>
        </Section>

        <Section title="🎁 How do I get cards?" defaultOpen>
          <p style={{ margin: 0 }}>
            Hold 1M <strong>$SHAPEGAME</strong> tokens in your wallet → you unlock free mint. Connect your wallet on the site, hit mint, get a random card.
          </p>
        </Section>

        <Section title="👛 What do I need to start?" defaultOpen>
          <p style={{ margin: 0 }}>
            A Solana wallet (Phantom, Backpack, etc.) and 1M <strong>$SHAPEGAME</strong> tokens.
          </p>
        </Section>

        <Section title="💸 How much does minting cost?">
          <p style={{ margin: 0 }}>
            Free. You just pay the Solana network fee (~0.005 SOL).
          </p>
        </Section>

        <Section title="🔷 How many cards are there?">
          <p style={{ margin: 0 }}>
            125 unique cards. Different shapes, materials (Flat, 3D, Chrome, Gold) and mana colors.
          </p>
        </Section>

        <Section title="🃏 What can I do with my cards?">
          <p style={{ margin: 0 }}>
            Build a deck of 12 cards. The stronger your deck, the higher you rank on the leaderboard.
          </p>
        </Section>

        <Section title="💰 How do I earn?">
          <p style={{ margin: 0 }}>
            10% of all trading commissions are automatically used to buy back <strong>$SHAPEGAME</strong> via the agent mode on pump.fun. More volume = more buybacks = price go up.
          </p>
        </Section>

        <Section title="🏆 What is the leaderboard?">
          <p style={{ margin: 0 }}>
            A ranking of the best collectors and players. Top players get rewards.
          </p>
        </Section>

        <Section title="🎮 Is there a game on the site?">
          <p style={{ margin: 0 }}>
            Yes — there&apos;s a platformer you can play right on the site while you wait for your next free mint.
          </p>
        </Section>

        <Section title="🪙 Where is the token?">
          <p style={{ margin: 0 }}>
            <strong>$SHAPEGAME</strong> is on Solana, launched on pump.fun.
          </p>
        </Section>

        <Section title="⚔️ What are raids?">
          <p style={{ margin: 0 }}>
            Community raids on Twitter/X. Participate, engage, earn points toward the leaderboard.
          </p>
        </Section>

        <Section title="🔮 What's coming next?">
          <p style={{ margin: 0 }}>
            Card battles (1v1), leaderboard rewards, more raid mechanics.
          </p>
        </Section>

        <div style={{
          textAlign: 'center',
          padding: '8px 0 12px',
          color: '#999',
          fontSize: 10,
        }}>
          theshapegame.app — Built on Solana
        </div>
      </div>
    </div>
  );
}
