import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    const supabase = createAdminClient();

    // Fetch top 50 from materialized view
    const { data: leaders, error } = await supabase
      .from('leaderboard_mv')
      .select('*')
      .order('score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[leaderboard] Query error:', error);
      return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 });
    }

    // Add rank numbers
    const ranked = (leaders ?? []).map((entry, i) => ({
      rank: i + 1,
      ...entry,
    }));

    // Count total players
    const { count } = await supabase
      .from('leaderboard_mv')
      .select('*', { count: 'exact', head: true });

    // Find user's rank if wallet provided
    let user_rank = null;
    if (wallet) {
      // Check if user is in top 50
      const inTop = ranked.find(
        (e) => e.wallet_address === wallet,
      );
      if (inTop) {
        user_rank = {
          rank: inTop.rank,
          total_cards: inTop.total_cards,
          unique_cards: inTop.unique_cards,
          score: inTop.score,
        };
      } else {
        // User not in top 50 — calculate their rank
        const { data: userRow } = await supabase
          .from('leaderboard_mv')
          .select('*')
          .eq('wallet_address', wallet)
          .single();

        if (userRow) {
          // Count how many players have higher score
          const { count: above } = await supabase
            .from('leaderboard_mv')
            .select('*', { count: 'exact', head: true })
            .gt('score', userRow.score);

          user_rank = {
            rank: (above ?? 0) + 1,
            total_cards: userRow.total_cards,
            unique_cards: userRow.unique_cards,
            score: userRow.score,
          };
        }
      }
    }

    const res = NextResponse.json({
      leaders: ranked,
      user_rank,
      total_players: count ?? 0,
    });

    // CDN cache: 30s fresh, serve stale up to 60s while revalidating
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res;
  } catch (err) {
    console.error('[leaderboard] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
