import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'ref-images';

// Auto-create table + bucket on first call
async function ensureSchema(supabase: ReturnType<typeof createAdminClient>) {
  // Create bucket (idempotent)
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  // Check if table exists by trying a select
  const { error } = await supabase.from('prompt_refs').select('id').limit(1);
  if (error?.code === '42P01') {
    // Table doesn't exist — create via raw SQL isn't available through client
    // We'll handle this in the migration endpoint
    return false;
  }
  return true;
}

// GET /api/prompt-refs?slug=hero  — list refs for a slug (or all if no slug)
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  const supabase = createAdminClient();

  const tableExists = await ensureSchema(supabase);
  if (!tableExists) {
    return NextResponse.json({ refs: [], needsMigration: true });
  }

  let query = supabase
    .from('prompt_refs')
    .select('*')
    .order('slug')
    .order('sort_order');

  if (slug) {
    query = query.eq('slug', slug);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add full URLs
  const refs = (data || []).map(ref => ({
    ...ref,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${ref.image_path}`,
  }));

  return NextResponse.json({ refs });
}

// POST /api/prompt-refs  — upload a new reference image
// Body: FormData with "file" (image) + "slug" (string) + optional "label"
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  await ensureSchema(supabase);

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const slug = formData.get('slug') as string;
  const label = (formData.get('label') as string) || '';

  if (!file || !slug) {
    return NextResponse.json({ error: 'file and slug are required' }, { status: 400 });
  }

  // Upload to storage
  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${slug}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Get current max sort_order for this slug
  const { data: existing } = await supabase
    .from('prompt_refs')
    .select('sort_order')
    .eq('slug', slug)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  // Insert record
  const { data: ref, error: insertError } = await supabase
    .from('prompt_refs')
    .insert({ slug, image_path: fileName, label, sort_order: nextOrder })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    ref: {
      ...ref,
      url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`,
    },
  });
}

// DELETE /api/prompt-refs?id=<uuid>  — delete a reference image
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get the record first to know the file path
  const { data: ref, error: findError } = await supabase
    .from('prompt_refs')
    .select('*')
    .eq('id', id)
    .single();

  if (findError || !ref) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Delete from storage
  await supabase.storage.from(BUCKET).remove([ref.image_path]);

  // Delete record
  const { error: deleteError } = await supabase
    .from('prompt_refs')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
