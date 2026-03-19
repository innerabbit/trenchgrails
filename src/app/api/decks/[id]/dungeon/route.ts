import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** POST /api/decks/[id]/dungeon — send deck to dungeon */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // Verify deck ownership
    const { data: deck } = await admin
      .from('decks')
      .select('id')
      .eq('id', deckId)
      .eq('user_id', appUser.id)
      .single();

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 });
    }

    // Create dungeon run
    const { data: run, error } = await admin
      .from('dungeon_runs')
      .insert({
        user_id: appUser.id,
        deck_id: deckId,
        status: 'pending',
      })
      .select('id, status, started_at')
      .single();

    if (error || !run) {
      console.error('[dungeon] Create run error:', error);
      return NextResponse.json({ error: 'Failed to start dungeon run' }, { status: 500 });
    }

    return NextResponse.json({ run });
  } catch (err) {
    console.error('[dungeon] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
