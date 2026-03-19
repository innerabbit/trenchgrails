import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/upload/raw-art — Upload raw art for a card (any type)
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const cardId = formData.get('cardId') as string | null;
  const cardNumber = formData.get('cardNumber') as string | null;
  const cardName = formData.get('cardName') as string | null;

  if (!file || !cardId || !cardNumber) {
    return NextResponse.json(
      { error: 'file, cardId, and cardNumber are required' },
      { status: 400 },
    );
  }

  // Validate file type
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return NextResponse.json(
      { error: 'Only PNG, JPEG and WebP files are allowed' },
      { status: 400 },
    );
  }

  // Max 20MB
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File size must be under 20MB' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Generate filename from card number + sanitized name
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const sanitized = (cardName || 'card')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  const fileName = `${String(cardNumber).padStart(3, '0')}_${sanitized}.${ext}`;

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('raw-arts')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 },
    );
  }

  // Update card record
  const { data, error: updateError } = await supabase
    .from('cards')
    .update({
      raw_art_path: fileName,
      gen_status: 'generated',
      generated_at: new Date().toISOString(),
    })
    .eq('id', cardId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: `DB update failed: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    card: data,
    filePath: fileName,
  });
}
