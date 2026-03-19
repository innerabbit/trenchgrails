import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST /api/upload/video — Upload video for a card
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
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only MP4, WebM and MOV files are allowed' },
      { status: 400 },
    );
  }

  // Max 100MB
  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'File size must be under 100MB' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Generate filename
  const ext = file.type === 'video/mp4' ? 'mp4' : file.type === 'video/webm' ? 'webm' : 'mov';
  const sanitized = (cardName || 'card')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
  const fileName = `videos/${String(cardNumber).padStart(3, '0')}_${sanitized}.${ext}`;

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage (reuse raw-arts bucket, videos/ subfolder)
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
      video_path: fileName,
      updated_at: new Date().toISOString(),
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
