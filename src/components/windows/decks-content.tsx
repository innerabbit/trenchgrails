'use client';

import { useState, useMemo } from 'react';
import { useDecks, type Deck } from '@/hooks/use-decks';
import { CollectionCard } from '@/components/collection/collection-card';
import type { OwnedCardDetails } from '@/hooks/use-user-cards';

interface OwnedCard {
  id: string;
  card_number: number;
  assetId: string;
  cards: OwnedCardDetails;
}

interface DecksContentProps {
  ownedCards: OwnedCard[];
  cardsLoading: boolean;
}

export function DecksContent({ ownedCards, cardsLoading }: DecksContentProps) {
  const { decks, isLoading, createDeck, updateDeck, deleteDeck, sendToDungeon } = useDecks();
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  if (isLoading || cardsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-[11px] text-[#666]">Loading decks...</span>
      </div>
    );
  }

  // Edit mode
  if (editingDeck || isCreating) {
    return (
      <DeckEditor
        deck={editingDeck}
        ownedCards={ownedCards}
        otherDecks={decks.filter((d) => d.id !== editingDeck?.id)}
        onSave={async (name, cardNumbers) => {
          if (editingDeck) {
            await updateDeck(editingDeck.id, name, cardNumbers);
          } else {
            await createDeck(name, cardNumbers);
          }
          setEditingDeck(null);
          setIsCreating(false);
        }}
        onCancel={() => {
          setEditingDeck(null);
          setIsCreating(false);
        }}
      />
    );
  }

  // List mode
  return (
    <DeckList
      decks={decks}
      ownedCards={ownedCards}
      onEdit={(d) => setEditingDeck(d)}
      onDelete={deleteDeck}
      onDungeon={sendToDungeon}
      onCreate={() => setIsCreating(true)}
    />
  );
}

/* ========== DECK LIST ========== */

function DeckList({
  decks,
  ownedCards,
  onEdit,
  onDelete,
  onDungeon,
  onCreate,
}: {
  decks: Deck[];
  ownedCards: OwnedCard[];
  onEdit: (d: Deck) => void;
  onDelete: (id: string) => Promise<void>;
  onDungeon: (id: string) => Promise<unknown>;
  onCreate: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [dungeonSent, setDungeonSent] = useState<string | null>(null);

  // Build card details lookup
  const cardDetailsMap = useMemo(() => {
    const map = new Map<number, OwnedCardDetails>();
    for (const oc of ownedCards) {
      map.set(oc.card_number, oc.cards);
    }
    return map;
  }, [ownedCards]);

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <span className="text-5xl mb-4">📋</span>
        <h2 className="text-[14px] font-bold text-[#003399] mb-2">No Decks Yet</h2>
        <p className="text-[11px] text-[#666] max-w-sm mb-4">
          Build a deck of 10-20 cards and send it to the dungeon!
        </p>
        <button
          onClick={onCreate}
          className="xp-button xp-button-primary px-6 py-[5px] text-[12px] font-bold"
        >
          + Create Deck
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {decks.map((deck) => (
        <fieldset key={deck.id} className="xp-groupbox">
          <legend className="xp-groupbox-legend">{deck.name}</legend>
          <div className="space-y-2">
            {/* Mini card thumbnails */}
            <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
              {deck.cards.slice(0, 8).map((dc, i) => {
                const details = cardDetailsMap.get(dc.card_number);
                if (!details) return (
                  <div key={i} className="aspect-[5/7] bg-[#1a1a2e] rounded border border-[#333] flex items-center justify-center text-[8px] text-[#666]">
                    #{dc.card_number}
                  </div>
                );
                return (
                  <CollectionCard key={i} card={details} size="sm" />
                );
              })}
              {deck.cards.length > 8 && (
                <div className="aspect-[5/7] bg-[#f0f0f0] rounded border border-[#919b9c] flex items-center justify-center text-[10px] text-[#666] font-bold">
                  +{deck.cards.length - 8}
                </div>
              )}
            </div>

            <div className="text-[10px] text-[#666] text-center">
              {deck.cards.length}/20 cards
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onEdit(deck)}
                className="xp-button flex-1 py-[3px] text-[11px]"
              >
                Edit
              </button>

              {confirmDelete === deck.id ? (
                <div className="flex gap-1 flex-1">
                  <button
                    onClick={async () => {
                      await onDelete(deck.id);
                      setConfirmDelete(null);
                    }}
                    className="xp-button flex-1 py-[3px] text-[11px] text-red-600 font-bold"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="xp-button flex-1 py-[3px] text-[11px]"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(deck.id)}
                  className="xp-button flex-1 py-[3px] text-[11px]"
                >
                  Delete
                </button>
              )}

              <button
                onClick={async () => {
                  await onDungeon(deck.id);
                  setDungeonSent(deck.id);
                  setTimeout(() => setDungeonSent(null), 3000);
                }}
                className="xp-button xp-button-primary flex-1 py-[3px] text-[11px] font-bold"
                disabled={dungeonSent === deck.id}
              >
                {dungeonSent === deck.id ? '⚔️ Sent!' : '⚔️ Dungeon'}
              </button>
            </div>
          </div>
        </fieldset>
      ))}

      <button
        onClick={onCreate}
        className="xp-button w-full py-[5px] text-[11px] font-bold"
      >
        + New Deck
      </button>
    </div>
  );
}

/* ========== DECK EDITOR ========== */

function DeckEditor({
  deck,
  ownedCards,
  otherDecks,
  onSave,
  onCancel,
}: {
  deck: Deck | null;
  ownedCards: OwnedCard[];
  otherDecks: Deck[];
  onSave: (name: string, cardNumbers: number[]) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(deck?.name || 'New Deck');
  const [selectedCards, setSelectedCards] = useState<number[]>(
    deck?.cards.map((c) => c.card_number) || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count how many of each card_number the user owns
  const ownedCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const oc of ownedCards) {
      counts.set(oc.card_number, (counts.get(oc.card_number) || 0) + 1);
    }
    return counts;
  }, [ownedCards]);

  // Count how many of each card_number are in the current deck
  const deckCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const cn of selectedCards) {
      counts.set(cn, (counts.get(cn) || 0) + 1);
    }
    return counts;
  }, [selectedCards]);

  // Count how many of each card_number are locked in OTHER decks
  const usedInOtherDecks = useMemo(() => {
    const counts = new Map<number, number>();
    for (const d of otherDecks) {
      for (const c of d.cards) {
        counts.set(c.card_number, (counts.get(c.card_number) || 0) + 1);
      }
    }
    return counts;
  }, [otherDecks]);

  // Unique cards for the picker
  const uniqueOwned = useMemo(() => {
    const seen = new Set<number>();
    const result: OwnedCard[] = [];
    for (const oc of ownedCards) {
      if (!seen.has(oc.card_number)) {
        seen.add(oc.card_number);
        result.push(oc);
      }
    }
    return result;
  }, [ownedCards]);

  const addCard = (cardNumber: number) => {
    if (selectedCards.length >= 20) return;
    const owned = ownedCounts.get(cardNumber) || 0;
    const inDeck = deckCounts.get(cardNumber) || 0;
    const inOther = usedInOtherDecks.get(cardNumber) || 0;
    // Available = owned minus those already in other decks
    const available = owned - inOther;
    if (inDeck >= available) return;
    setSelectedCards([...selectedCards, cardNumber]);
  };

  const removeCard = (index: number) => {
    setSelectedCards(selectedCards.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (selectedCards.length < 10 || selectedCards.length > 20) {
      setError('Deck must have 10-20 cards');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(name, selectedCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  };

  // Card details lookup
  const cardDetailsMap = useMemo(() => {
    const map = new Map<number, OwnedCardDetails>();
    for (const oc of ownedCards) {
      map.set(oc.card_number, oc.cards);
    }
    return map;
  }, [ownedCards]);

  const canSave = selectedCards.length >= 10 && selectedCards.length <= 20 && !saving;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button onClick={onCancel} className="xp-button px-2 py-[2px] text-[11px]">
          ← Back
        </button>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="xp-input flex-1 text-[12px] font-bold"
          placeholder="Deck name"
        />
        <span className={`text-[12px] font-bold ${selectedCards.length >= 10 ? 'text-green-600' : 'text-[#999]'}`}>
          {selectedCards.length}/20
        </span>
      </div>

      {error && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </div>
      )}

      {/* Deck slots */}
      <fieldset className="xp-groupbox">
        <legend className="xp-groupbox-legend">
          Deck ({selectedCards.length < 10 ? `need ${10 - selectedCards.length} more` : 'ready'})
        </legend>
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-1.5">
          {selectedCards.map((cn, i) => {
            const details = cardDetailsMap.get(cn);
            return (
              <div key={i} className="cursor-pointer" onClick={() => removeCard(i)} title="Click to remove">
                {details ? (
                  <CollectionCard card={details} size="sm" />
                ) : (
                  <div className="aspect-[5/7] bg-[#1a1a2e] rounded border border-[#333] flex items-center justify-center text-[8px] text-[#666]">
                    #{cn}
                  </div>
                )}
              </div>
            );
          })}
          {selectedCards.length < 20 && (
            <div className="aspect-[5/7] border border-dashed border-[#919b9c] bg-[#f5f3ee] flex items-center justify-center text-[#c3c0b6] text-lg rounded">
              +
            </div>
          )}
        </div>
      </fieldset>

      {/* Save / Cancel */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="xp-button xp-button-primary flex-1 py-[5px] text-[12px] font-bold"
        >
          {saving ? 'Saving...' : deck ? 'Save Changes' : 'Create Deck'}
        </button>
        <button
          onClick={onCancel}
          className="xp-button flex-1 py-[5px] text-[12px]"
        >
          Cancel
        </button>
      </div>

      {/* Card picker */}
      <fieldset className="xp-groupbox">
        <legend className="xp-groupbox-legend">Your Cards — tap to add</legend>
        {uniqueOwned.length === 0 ? (
          <div className="text-[11px] text-[#666] text-center py-4">
            No cards owned. Mint some first!
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {uniqueOwned.map((oc) => {
              const owned = ownedCounts.get(oc.card_number) || 0;
              const inDeck = deckCounts.get(oc.card_number) || 0;
              const inOther = usedInOtherDecks.get(oc.card_number) || 0;
              const available = owned - inOther;
              const maxed = inDeck >= available || available <= 0;
              return (
                <div
                  key={oc.card_number}
                  onClick={() => !maxed && addCard(oc.card_number)}
                  className={maxed ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                >
                  <CollectionCard
                    card={oc.cards}
                    size="sm"
                    badge={available > 1 ? `x${available}` : available <= 0 ? '0' : undefined}
                    dimmed={maxed}
                  />
                  {inOther > 0 && available <= 0 && (
                    <div className="text-[9px] text-center text-red-500 font-bold mt-0.5">
                      in other deck
                    </div>
                  )}
                  {inDeck > 0 && (
                    <div className="text-[9px] text-center text-[#003399] font-bold mt-0.5">
                      {inDeck} in deck
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}
