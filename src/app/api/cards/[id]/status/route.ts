import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// PATCH /api/cards/[id]/status — Update card fields (status, description, name, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { gen_status, art_description, name } = body;

  const supabase = createAdminClient();
  const update: Record<string, unknown> = {};

  // Status update
  if (gen_status) {
    const validStatuses = [
      'not_started', 'generating', 'generated',
      'approved', 'rejected', 'compositing', 'finalized',
    ];
    if (!validStatuses.includes(gen_status)) {
      return NextResponse.json({ error: 'Invalid gen_status' }, { status: 400 });
    }
    update.gen_status = gen_status;
    if (gen_status === 'generated') update.generated_at = new Date().toISOString();
    if (gen_status === 'approved') update.approved_at = new Date().toISOString();
    if (gen_status === 'finalized') update.finalized_at = new Date().toISOString();
  }

  // Direct field updates
  if (typeof art_description === 'string') update.art_description = art_description;
  if (typeof name === 'string') update.name = name;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('cards')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
