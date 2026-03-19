import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateAllCardsV2 } from '@/lib/cards/seed-v2';

// All possible columns in the seed data
const ALL_CARD_COLUMNS = [
  'card_number', 'card_type', 'name', 'color', 'rarity_tier',
  'hero_class', 'atk', 'hp', 'mana_cost', 'generic_cost', 'colored_cost',
  'artifact_subtype', 'shape', 'material',
  'perk_1_name', 'perk_1_type', 'perk_1_desc',
  'perk_2_name', 'perk_2_type', 'perk_2_desc',
  'ability', 'gen_status',
];

// Detect which columns PostgREST can actually see
async function detectColumns(supabase: ReturnType<typeof createAdminClient>): Promise<Set<string>> {
  const available = new Set<string>();
  // Try selecting each column individually
  for (const col of ALL_CARD_COLUMNS) {
    const { error } = await supabase.from('cards').select(col).limit(0);
    if (!error) available.add(col);
  }
  return available;
}

export async function POST() {
  const supabase = createAdminClient();

  // Check if v2 cards already exist
  const { count } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true })
    .not('card_type', 'is', null);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Already have ${count} v2 cards. Delete first if you want to reseed.` },
      { status: 409 }
    );
  }

  // Detect available columns
  const availableCols = await detectColumns(supabase);
  const missingCols = ALL_CARD_COLUMNS.filter(c => !availableCols.has(c));

  // Delete old cards
  await supabase.from('user_cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Generate all 125 cards
  const allCards = generateAllCardsV2();

  // Build card objects with only available columns
  function buildRow(card: any) {
    const row: Record<string, any> = {};
    const map: Record<string, any> = {
      card_number: card.card_number,
      card_type: card.card_type,
      name: card.name,
      color: card.color,
      rarity_tier: card.rarity_tier,
      hero_class: card.hero_class || null,
      atk: card.atk ?? null,
      hp: card.hp ?? null,
      mana_cost: card.mana_cost ?? null,
      generic_cost: card.generic_cost ?? null,
      colored_cost: card.colored_cost ?? null,
      artifact_subtype: card.artifact_subtype || null,
      shape: card.shape || null,
      material: card.material || null,
      perk_1_name: card.perk_1_name || null,
      perk_1_type: card.perk_1_type || null,
      perk_1_desc: card.perk_1_desc || null,
      perk_2_name: card.perk_2_name || null,
      perk_2_type: card.perk_2_type || null,
      perk_2_desc: card.perk_2_desc || null,
      ability: card.ability || null,
      gen_status: 'not_started',
    };
    for (const col of availableCols) {
      if (col in map) row[col] = map[col];
    }
    return row;
  }

  // Insert in batches of 25
  const batchSize = 25;
  let inserted = 0;
  const errors: string[] = [];

  for (let i = 0; i < allCards.length; i += batchSize) {
    const batch = allCards.slice(i, i + batchSize).map(buildRow);

    const { error } = await supabase.from('cards').insert(batch);
    if (error) {
      errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  return NextResponse.json({
    inserted,
    total: allCards.length,
    availableColumns: [...availableCols],
    missingColumns: missingCols.length > 0 ? missingCols : undefined,
    errors: errors.length > 0 ? errors : undefined,
    breakdown: {
      lands: allCards.filter(c => c.card_type === 'land').length,
      heroes: allCards.filter(c => c.card_type === 'hero').length,
      artifacts: allCards.filter(c => c.card_type === 'artifact').length,
    },
  });
}

// GET — diagnostic: check which columns are visible
export async function GET() {
  const supabase = createAdminClient();
  const availableCols = await detectColumns(supabase);
  const missingCols = ALL_CARD_COLUMNS.filter(c => !availableCols.has(c));
  return NextResponse.json({
    available: [...availableCols],
    missing: missingCols,
  });
}
