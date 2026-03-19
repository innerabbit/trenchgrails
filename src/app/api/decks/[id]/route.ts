import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** PUT /api/decks/[id] — update deck name and/or cards */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: deckId } = await params;
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

    // Verify ownership
    const { data: deck } = await admin
      .from('decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', appUser.id)
      .single();

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, card_numbers } = body as { name?: string; card_numbers?: number[] };

    // Update name if provided
    if (name !== undefined) {
      await admin.from('decks').update({ name }).eq('id', deckId);
    }

    // Update cards if provided
    if (card_numbers) {
      if (card_numbers.length < 10 || card_numbers.length > 20) {
        return NextResponse.json({ error: 'Deck must have 10-20 cards' }, { status: 400 });
      }

      // Delete existing cards and re-insert
      await admin.from('deck_cards').delete().eq('deck_id', deckId);

      const cardRows = card_numbers.map((cn, i) => ({
        deck_id: deckId,
        card_number: cn,
        position: i,
      }));

      const { error: cardsErr } = await admin.from('deck_cards').insert(cardRows);
      if (cardsErr) {
        console.error('[decks] Update cards error:', cardsErr);
        return NextResponse.json({ error: 'Failed to update cards' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[decks] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** DELETE /api/decks/[id] — delete a deck */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: deckId } = await params;
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

    // Delete (CASCADE removes deck_cards)
    const { error } = await admin
      .from('decks')
      .delete()
      .eq('id', deckId)
      .eq('user_id', appUser.id);

    if (error) {
      console.error('[decks] Delete error:', error);
      return NextResponse.json({ error: 'Failed to delete deck' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[decks] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
