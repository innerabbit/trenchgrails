import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/cards — List all cards with optional filters
export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  let query = supabase.from('cards').select('*');

  // Apply filters
  const wave = searchParams.get('wave');
  if (wave) query = query.eq('wave', Number(wave));

  const status = searchParams.get('status');
  if (status) query = query.eq('gen_status', status);

  const rarity = searchParams.get('rarity');
  if (rarity) query = query.eq('rarity_tier', rarity);

  const material = searchParams.get('material');
  if (material) query = query.eq('material', material);

  const shape = searchParams.get('shape');
  if (shape) query = query.eq('shape', shape);

  const background = searchParams.get('background');
  if (background) query = query.eq('background', background);

  // Order — try card_number first, fall back to created_at
  query = query.order('card_number', { ascending: true });

  let { data, error } = await query;

  // If card_number column doesn't exist, retry without ordering by it
  if (error && error.message.includes('card_number')) {
    const retryQuery = supabase.from('cards').select('*').order('created_at', { ascending: true });
    const retry = await retryQuery;
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
