import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** GET /api/decks — list user's decks with card numbers */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: appUser } = await admin
      .from('users')
      .select('id')
      .eq('supabase_auth_id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: decks, error } = await admin
      .from('decks')
      .select('id, name, created_at, updated_at')
      .eq('user_id', appUser.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[decks] List error:', error);
      return NextResponse.json({ error: 'Failed to load decks' }, { status: 500 });
    }

    // Fetch cards for all decks in one query
    const deckIds = (decks ?? []).map((d) => d.id);
    let allCards: { deck_id: string; card_number: number; position: number }[] = [];

    if (deckIds.length > 0) {
      const { data: cards } = await admin
        .from('deck_cards')
        .select('deck_id, card_number, position')
        .in('deck_id', deckIds)
        .order('position', { ascending: true });
      allCards = cards ?? [];
    }

    // Group cards by deck
    const cardsByDeck = new Map<string, { card_number: number; position: number }[]>();
    for (const c of allCards) {
      const list = cardsByDeck.get(c.deck_id) ?? [];
      list.push({ card_number: c.card_number, position: c.position });
      cardsByDeck.set(c.deck_id, list);
    }

    const result = (decks ?? []).map((d) => ({
      ...d,
      cards: cardsByDeck.get(d.id) ?? [],
    }));

    return NextResponse.json({ decks: result });
  } catch (err) {
    console.error('[decks] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** POST /api/decks — create a new deck */
export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { name, card_numbers } = body as { name?: string; card_numbers?: number[] };

    if (!card_numbers || !Array.isArray(card_numbers)) {
      return NextResponse.json({ error: 'card_numbers required' }, { status: 400 });
    }
    if (card_numbers.length < 10 || card_numbers.length > 20) {
      return NextResponse.json({ error: 'Deck must have 10-20 cards' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: appUser } = await admin
      .from('users')
      .select('id')
      .eq('supabase_auth_id', user.id)
      .single();

    if (!appUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create deck
    const { data: deck, error: deckErr } = await admin
      .from('decks')
      .insert({ user_id: appUser.id, name: name || 'New Deck' })
      .select('id, name, created_at, updated_at')
      .single();

    if (deckErr || !deck) {
      console.error('[decks] Create error:', deckErr);
      return NextResponse.json({ error: 'Failed to create deck' }, { status: 500 });
    }

    // Insert cards
    const cardRows = card_numbers.map((cn, i) => ({
      deck_id: deck.id,
      card_number: cn,
      position: i,
    }));

    const { error: cardsErr } = await admin.from('deck_cards').insert(cardRows);
    if (cardsErr) {
      console.error('[decks] Insert cards error:', cardsErr);
      // Clean up the deck
      await admin.from('decks').delete().eq('id', deck.id);
      return NextResponse.json({ error: 'Failed to add cards' }, { status: 500 });
    }

    return NextResponse.json({
      deck: {
        ...deck,
        cards: cardRows.map((r) => ({ card_number: r.card_number, position: r.position })),
      },
    });
  } catch (err) {
    console.error('[decks] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
