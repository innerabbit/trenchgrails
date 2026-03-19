'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { SplineCard, type SplineCardContent } from '@/components/booster/spline-card';
import { XpTabs } from '@/components/xp/xp-tabs';

type Tab = 'generate' | 'gallery';

interface GeneratedCard {
  prompt: string;
  name: string;
  ability: string;
  attack: number;
  defense: number;
  speed: number;
  mana_cost: number;
  rarity: string;
  material: string;
  art_url: string | null;
}

interface GalleryCard extends GeneratedCard {
  id: string;
  created_at: string;
  users?: { wallet_address: string };
}

const MANA_COLORS: Record<string, string> = {
  common: '#888888',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

function cardToSplineContent(card: GeneratedCard): SplineCardContent {
  return {
    title: card.name.toUpperCase(),
    description: card.ability,
    cardNumber: '#???',
    rarity: card.rarity.toUpperCase(),
    stats: `${card.attack} / ${card.defense}`,
    manaCost: String(card.mana_cost),
    material: card.material.toUpperCase(),
    artUrl: card.art_url || undefined,
    manaColorHex: MANA_COLORS[card.rarity] || '#888888',
  };
}

export function GeneratorContent() {
  const [activeTab, setActiveTab] = useState<Tab>('generate');
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  if (!connected) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="text-5xl mb-4">🧪</div>
        <h2 className="text-[14px] font-bold text-[#003399] mb-2">Card Generator</h2>
        <p className="text-[11px] text-[#666] max-w-sm mb-4">
          Connect your wallet to generate custom cards.
        </p>
        <button
          onClick={() => setVisible(true)}
          className="xp-button xp-button-primary px-6 py-[5px] text-[12px] font-bold"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'generate', label: 'Generate', icon: '🧪' },
    { id: 'gallery', label: 'Gallery', icon: '🖼️' },
  ];

  return (
    <XpTabs tabs={tabs} activeTab={activeTab} onTabChange={(id) => setActiveTab(id as Tab)}>
      {activeTab === 'generate' ? <GenerateTab /> : <GalleryTab />}
    </XpTabs>
  );
}

/* ========== GENERATE TAB ========== */

type GenStatus = 'idle' | 'generating' | 'preview' | 'saving' | 'saved';

function GenerateTab() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<GenStatus>('idle');
  const [card, setCard] = useState<GeneratedCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setStatus('generating');
    setError(null);
    setCard(null);

    try {
      const res = await fetch('/api/cards/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      setCard(data.card);
      setStatus('preview');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStatus('idle');
    }
  };

  const handleSave = async () => {
    if (!card) return;
    setStatus('saving');
    setError(null);

    try {
      const res = await fetch('/api/cards/generate-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', card }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }

      setStatus('saved');
      setTimeout(() => {
        setStatus('idle');
        setCard(null);
        setPrompt('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
      setStatus('preview');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setCard(null);
    setError(null);
  };

  return (
    <div className="space-y-3">
      {/* 3D Card Preview */}
      <div className="flex justify-center">
        <div className="w-[220px] h-[310px] bg-[#1a1a2e] rounded-lg border border-[#333] overflow-hidden relative">
          {card ? (
            <SplineCard
              cardContent={cardToSplineContent(card)}
              style={{ width: 220, height: 310 }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#666]">
              {status === 'generating' ? (
                <div className="text-center">
                  <div className="text-3xl mb-2 animate-spin">🧪</div>
                  <div className="text-[10px]">Synthesizing...</div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="text-3xl mb-2">🃏</div>
                  <div className="text-[10px]">Your card will appear here</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card info (when in preview) */}
      {card && status !== 'idle' && (
        <div className="bg-[#f5f3ee] border border-[#919b9c] rounded p-2 text-center">
          <div className="text-[13px] font-bold text-[#003399]">{card.name}</div>
          <div className="text-[10px] text-[#666] italic mt-0.5">{card.ability}</div>
          <div className="text-[9px] text-[#999] mt-1">
            ATK {card.attack} / DEF {card.defense} / SPD {card.speed} | Mana: {card.mana_cost} | {card.rarity} | {card.material}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}

      {/* Success message */}
      {status === 'saved' && (
        <div className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 text-center">
          Card saved to gallery!
        </div>
      )}

      {/* Prompt input */}
      {(status === 'idle' || status === 'generating') && (
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your character... e.g. 'a cat wizard who codes at night'"
            className="xp-input w-full text-[11px] p-2 resize-none"
            rows={3}
            disabled={status === 'generating'}
            maxLength={500}
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || status === 'generating'}
            className="xp-button xp-button-primary w-full py-[5px] text-[12px] font-bold"
          >
            {status === 'generating' ? '🧪 Synthesizing...' : '🧪 Synthesize Card'}
          </button>
        </div>
      )}

      {/* Preview actions */}
      {status === 'preview' && (
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="xp-button xp-button-primary flex-1 py-[5px] text-[12px] font-bold"
          >
            💾 Save to Gallery
          </button>
          <button
            onClick={handleReset}
            className="xp-button flex-1 py-[5px] text-[12px]"
          >
            🔄 Try Again
          </button>
        </div>
      )}

      {/* Saving state */}
      {status === 'saving' && (
        <button disabled className="xp-button w-full py-[5px] text-[12px]">
          Saving...
        </button>
      )}
    </div>
  );
}

/* ========== GALLERY TAB ========== */

function GalleryTab() {
  const [cards, setCards] = useState<GalleryCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGallery = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cards/generate-custom');
      if (!res.ok) throw new Error('Failed to fetch gallery');
      const data = await res.json();
      setCards(data.cards ?? []);
    } catch (err) {
      console.error('Gallery fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-[11px] text-[#666]">Loading gallery...</span>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="text-4xl mb-3">🖼️</div>
        <h3 className="text-[13px] font-bold text-[#003399] mb-1">Gallery Empty</h3>
        <p className="text-[11px] text-[#666]">No cards generated yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[10px] text-[#999] text-right">{cards.length} cards</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cards.map((card) => (
          <GalleryCardThumbnail key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

function GalleryCardThumbnail({ card }: { card: GalleryCard }) {
  const rarityColor = MANA_COLORS[card.rarity] || '#888';

  return (
    <div className="bg-[#1a1a2e] rounded border border-[#333] overflow-hidden">
      {/* Art */}
      <div className="aspect-[4/3] bg-[#0d0d1a] relative">
        {card.art_url ? (
          <img
            src={card.art_url}
            alt={card.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[#444] text-2xl">🃏</div>
        )}
        {/* Rarity badge */}
        <div
          className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold text-white"
          style={{ backgroundColor: rarityColor }}
        >
          {card.rarity.toUpperCase()}
        </div>
      </div>
      {/* Info */}
      <div className="p-1.5">
        <div className="text-[10px] font-bold text-white truncate">{card.name}</div>
        <div className="text-[8px] text-[#888] truncate italic">{card.ability}</div>
        <div className="flex justify-between mt-1 text-[8px] text-[#666]">
          <span>⚔️{card.attack} 🛡️{card.defense} 💨{card.speed}</span>
          <span>💎{card.mana_cost}</span>
        </div>
        {card.users?.wallet_address && (
          <div className="text-[7px] text-[#555] mt-0.5 truncate">
            by {card.users.wallet_address.slice(0, 4)}...{card.users.wallet_address.slice(-4)}
          </div>
        )}
      </div>
    </div>
  );
}
