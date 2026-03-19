import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// ── GET /api/prompts ────────────────────────────────
// Fetch all prompt templates from DB
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .order('slug');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return as slug→content map for easy access
  const map: Record<string, { id: string; label: string; content: string; updated_at: string }> = {};
  for (const p of data ?? []) {
    map[p.slug] = { id: p.id, label: p.label, content: p.content, updated_at: p.updated_at };
  }

  return NextResponse.json({ prompts: map });
}

// ── PUT /api/prompts ────────────────────────────────
// Update a single prompt by slug
export async function PUT(request: NextRequest) {
  const { slug, content, label } = await request.json();

  if (!slug || typeof content !== 'string') {
    return NextResponse.json(
      { error: 'slug and content are required' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // If no label provided, fetch existing row's label (required NOT NULL column)
  let resolvedLabel = label;
  if (!resolvedLabel) {
    const { data: existing } = await supabase
      .from('prompts')
      .select('label')
      .eq('slug', slug)
      .single();
    resolvedLabel = existing?.label || slug;
  }

  // Upsert — works for both existing and new entries
  const { data, error } = await supabase
    .from('prompts')
    .upsert(
      { slug, content, label: resolvedLabel },
      { onConflict: 'slug' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prompt: data });
}
