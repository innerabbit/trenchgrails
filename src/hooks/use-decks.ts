'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export interface DeckCard {
  card_number: number;
  position: number;
}

export interface Deck {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  cards: DeckCard[];
}

export function useDecks() {
  const { isAuthenticated } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDecks = useCallback(async () => {
    if (!isAuthenticated) {
      setDecks([]);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/decks');
      if (!res.ok) throw new Error('Failed to fetch decks');
      const data = await res.json();
      setDecks(data.decks ?? []);
    } catch (err) {
      console.error('Failed to fetch decks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const createDeck = useCallback(async (name: string, cardNumbers: number[]): Promise<Deck | null> => {
    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, card_numbers: cardNumbers }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create deck');
      }
      const data = await res.json();
      await fetchDecks();
      return data.deck;
    } catch (err) {
      console.error('Failed to create deck:', err);
      throw err;
    }
  }, [fetchDecks]);

  const updateDeck = useCallback(async (id: string, name?: string, cardNumbers?: number[]) => {
    try {
      const res = await fetch(`/api/decks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, card_numbers: cardNumbers }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update deck');
      }
      await fetchDecks();
    } catch (err) {
      console.error('Failed to update deck:', err);
      throw err;
    }
  }, [fetchDecks]);

  const deleteDeck = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/decks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete deck');
      await fetchDecks();
    } catch (err) {
      console.error('Failed to delete deck:', err);
      throw err;
    }
  }, [fetchDecks]);

  const sendToDungeon = useCallback(async (deckId: string) => {
    try {
      const res = await fetch(`/api/decks/${deckId}/dungeon`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send to dungeon');
      }
      return await res.json();
    } catch (err) {
      console.error('Failed to send to dungeon:', err);
      throw err;
    }
  }, []);

  return { decks, isLoading, createDeck, updateDeck, deleteDeck, sendToDungeon, refetch: fetchDecks };
}
