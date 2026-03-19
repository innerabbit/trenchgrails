import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH /api/cards/batch — Batch update card statuses
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { ids, gen_status } = body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
  }

  if (!gen_status) {
    return NextResponse.json({ error: 'gen_status is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const update: Record<string, unknown> = { gen_status };
  if (gen_status === 'approved') update.approved_at = new Date().toISOString();
  if (gen_status === 'finalized') update.finalized_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('cards')
    .update(update)
    .in('id', ids)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length || 0 });
}
