import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateAllCards } from '@/lib/cards/generate-seed';

// POST /api/cards/seed — Seed all 210 cards into the database
export async function POST() {
  const supabase = createAdminClient();

  // Check if cards already exist
  const { count } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true });

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Database already has ${count} cards. Delete them first if you want to reseed.` },
      { status: 409 }
    );
  }

  // Generate all card data
  const cards = generateAllCards();

  // Insert in batches (Supabase limit is ~1000 rows per insert)
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);

    const { error } = await supabase
      .from('cards')
      .insert(batch);

    if (error) {
      return NextResponse.json(
        { error: `Seed failed at batch ${i}: ${error.message}` },
        { status: 500 }
      );
    }

    inserted += batch.length;
  }

  return NextResponse.json({
    success: true,
    inserted,
    total: cards.length,
  });
}
