#!/usr/bin/env npx tsx
// ========================================
// Generate 600px-wide WebP thumbnails for all cards
// Run: npx tsx scripts/generate-thumbs.ts
// ========================================

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars. Run with: npx tsx --env-file=.env.local scripts/generate-thumbs.ts');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const THUMB_WIDTH = 600;
const THUMB_QUALITY = 80;
const BUCKET = 'raw-arts';
const THUMB_PREFIX = 'thumbs/';

async function main() {
  // Fetch all cards that have raw art
  const { data: cards, error } = await supabase
    .from('cards')
    .select('id, card_number, name, raw_art_path, thumb_path')
    .not('raw_art_path', 'is', null)
    .order('card_number');

  if (error) {
    console.error('Failed to fetch cards:', error);
    process.exit(1);
  }

  console.log(`Found ${cards.length} cards with raw art`);

  // Filter: only process cards without thumb (or pass --force to redo all)
  const force = process.argv.includes('--force');
  const toProcess = force ? cards : cards.filter((c) => !c.thumb_path);

  if (toProcess.length === 0) {
    console.log('All cards already have thumbnails. Use --force to regenerate.');
    return;
  }

  console.log(`Processing ${toProcess.length} cards...\n`);

  let success = 0;
  let failed = 0;

  for (const card of toProcess) {
    const rawPath = card.raw_art_path!.replace(/^raw-arts\//, '');
    const ext = rawPath.split('.').pop() || 'png';
    const baseName = rawPath.replace(`.${ext}`, '');
    const thumbPath = `${THUMB_PREFIX}${baseName}.webp`;

    try {
      // Download original
      const { data: blob, error: dlErr } = await supabase.storage
        .from(BUCKET)
        .download(rawPath);

      if (dlErr || !blob) {
        console.error(`  [${card.card_number}] Download failed:`, dlErr?.message);
        failed++;
        continue;
      }

      // Resize + compress
      const buffer = Buffer.from(await blob.arrayBuffer());
      const thumb = await sharp(buffer)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: THUMB_QUALITY })
        .toBuffer();

      const originalKB = Math.round(buffer.length / 1024);
      const thumbKB = Math.round(thumb.length / 1024);

      // Upload thumb
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(thumbPath, thumb, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (upErr) {
        console.error(`  [${card.card_number}] Upload failed:`, upErr.message);
        failed++;
        continue;
      }

      // Update card record
      const { error: updateErr } = await supabase
        .from('cards')
        .update({ thumb_path: `${BUCKET}/${thumbPath}` })
        .eq('id', card.id);

      if (updateErr) {
        console.error(`  [${card.card_number}] DB update failed:`, updateErr.message);
        failed++;
        continue;
      }

      console.log(`  ✓ #${String(card.card_number).padStart(3, '0')} — ${originalKB}KB → ${thumbKB}KB (${Math.round((1 - thumbKB / originalKB) * 100)}% smaller)`);
      success++;
    } catch (err) {
      console.error(`  [${card.card_number}] Error:`, err);
      failed++;
    }
  }

  console.log(`\nDone! ${success} thumbnails generated, ${failed} failed.`);
}

main();
