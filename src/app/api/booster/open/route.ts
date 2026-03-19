import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { pickBoosterPack } from '@/lib/nft/pick-booster';
import { randomUUID } from 'crypto';

// ── POST /api/booster/open ──────────────────────────────

export async function POST() {
  const admin = createAdminClient();

  // Check if user is authenticated
  let userId: string | null = null;
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Look up app user
      const { data: appUser } = await admin
        .from('users')
        .select('id')
        .eq('supabase_auth_id', user.id)
        .single();
      userId = appUser?.id ?? null;
    }
  } catch {
    // Not authenticated — continue without saving
  }

  // Try 1: Fetch approved/finalized cards with art
  const { data: readyCards } = await admin
    .from('cards')
    .select('*')
    .in('gen_status', ['approved', 'finalized'])
    .not('raw_art_path', 'is', null);

  let pack: any[];
  let source: string;

  if (readyCards && readyCards.length >= 6) {
    pack = pickBoosterPack(readyCards);
    source = 'approved';
  } else {
    // Try 2: Fallback — use ALL cards in DB
    const { data: allCards, error } = await admin
      .from('cards')
      .select('*')
      .order('card_number');

    if (error || !allCards || allCards.length === 0) {
      return NextResponse.json(
        { error: 'No cards in database. Run seed first.' },
        { status: 500 }
      );
    }

    pack = pickBoosterPack(allCards);
    source = 'all_cards';
  }

  // Save cards to user_cards if authenticated
  let saved = false;
  if (userId) {
    const packId = randomUUID();
    const rows = pack.map((card) => ({
      user_id: userId,
      card_id: card.id,
      source: 'booster',
      pack_id: packId,
      opened_at: new Date().toISOString(),
    }));

    const { error: insertError } = await admin
      .from('user_cards')
      .insert(rows);

    if (!insertError) {
      saved = true;
    }
  }

  return NextResponse.json({ cards: pack, source, saved, userId });
}
