'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWindowManager } from '@/lib/stores/window-manager';
import { useUserCards } from '@/hooks/use-user-cards';
import { CollectionCard } from '@/components/collection/collection-card';
import { DecksContent } from '@/components/windows/decks-content';

type Tab = 'cards' | 'decks';

export function CollectionContent() {
  const [activeTab, setActiveTab] = useState<Tab>('cards');
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const openWindow = useWindowManager((s) => s.openWindow);
  const { ownedCards, isLoading } = useUserCards();

  const collectionAddress = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS;

  // Not connected
  if (!connected) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="text-5xl mb-4">🃏</div>
        <h2 className="text-[14px] font-bold text-[#003399] mb-2">Your Card Collection</h2>
        <p className="text-[11px] text-[#666] max-w-sm mb-4">
          Connect your Solana wallet to view your cards.
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

  return (
    <div>
      {/* XP-style tabs */}
      <div className="flex border-b border-[#919b9c] mb-3">
        <button
          onClick={() => setActiveTab('cards')}
          className="px-4 py-[5px] text-[11px] font-bold border border-[#919b9c] rounded-t-[3px] -mb-px"
          style={{
            background: activeTab === 'cards' ? '#f5f3ee' : '#d6d2c2',
            borderBottom: activeTab === 'cards' ? '1px solid #f5f3ee' : '1px solid #919b9c',
            color: activeTab === 'cards' ? '#003399' : '#444',
          }}
        >
          My Cards
        </button>
        <button
          onClick={() => setActiveTab('decks')}
          className="px-4 py-[5px] text-[11px] font-bold border border-[#919b9c] rounded-t-[3px] -mb-px ml-1"
          style={{
            background: activeTab === 'decks' ? '#f5f3ee' : '#d6d2c2',
            borderBottom: activeTab === 'decks' ? '1px solid #f5f3ee' : '1px solid #919b9c',
            color: activeTab === 'decks' ? '#003399' : '#444',
          }}
        >
          Build My Deck
        </button>
      </div>

      {activeTab === 'decks' ? (
        <DecksContent ownedCards={ownedCards} cardsLoading={isLoading} />
      ) : (
        <CardsTab
          ownedCards={ownedCards}
          isLoading={isLoading}
          collectionAddress={collectionAddress}
          openShop={() => openWindow('shop')}
        />
      )}
    </div>
  );
}

function CardsTab({
  ownedCards,
  isLoading,
  collectionAddress,
  openShop,
}: {
  ownedCards: ReturnType<typeof useUserCards>['ownedCards'];
  isLoading: boolean;
  collectionAddress: string | undefined;
  openShop: () => void;
}) {
  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-[11px] text-[#666]">Loading cards from blockchain...</span>
      </div>
    );
  }

  // No cards
  if (ownedCards.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="text-5xl mb-4">📦</div>
        <h2 className="text-[14px] font-bold text-[#003399] mb-2">No Cards Yet</h2>
        <p className="text-[11px] text-[#666] max-w-sm mb-4">
          Open a booster pack to start your collection!
        </p>
        <button
          onClick={openShop}
          className="xp-button xp-button-primary px-6 py-[5px] text-[12px] font-bold"
        >
          Visit Shop
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Header stats */}
      <div className="flex items-center justify-between mb-3 text-[11px]">
        <span className="text-[#222] font-bold">
          {ownedCards.length} {ownedCards.length === 1 ? 'card' : 'cards'}
        </span>
        {collectionAddress && (
          <div className="flex items-center gap-3">
            <a
              href={`https://solscan.io/token/${collectionAddress}#transactions`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#003399] hover:underline flex items-center gap-1"
            >
              <img src="/solscan-icon.png" alt="" className="w-3.5 h-3.5" />
              Solscan
            </a>
          </div>
        )}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {ownedCards.map((uc) => (
          <CollectionCard
            key={uc.id}
            card={uc.cards}
          />
        ))}
      </div>
    </>
  );
}
