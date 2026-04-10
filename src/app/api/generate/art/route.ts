import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createAdminClient } from '@/lib/supabase/admin';

// ── POST /api/generate/art ──────────────────────────────
// Generate card art via Gemini and optionally save to Supabase Storage

export const maxDuration = 300; // 5 min — Gemini image gen is slow

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function POST(request: NextRequest) {
  const { cardId, prompt, cardData, testOnly } = await request.json();

  if (!prompt) {
    return NextResponse.json(
      { error: 'prompt is required' },
      { status: 400 }
    );
  }

  // ── 0. Load base style prompt from Supabase ──────────────
  const supabaseForPrompts = createAdminClient();
  let baseStylePrompt = '';
  try {
    const { data: baseRow } = await supabaseForPrompts
      .from('prompts')
      .select('content')
      .eq('slug', 'image_style')
      .single();
    if (baseRow?.content) {
      baseStylePrompt = baseRow.content;
    } else {
      // Fallback to 'base' prompt if 'image_style' doesn't exist
      const { data: fallbackRow } = await supabaseForPrompts
        .from('prompts')
        .select('content')
        .eq('slug', 'base')
        .single();
      if (fallbackRow?.content) baseStylePrompt = fallbackRow.content;
    }
  } catch {
    // No prompts table — continue without base prompt
  }

  // Load reference images for this card type
  let refImageParts: any[] = [];
  try {
    const cardType = cardData?.card_type || '';
    const shape = cardData?.shape || '';
    // Try specific slug first (e.g. land_circle), then generic (e.g. land)
    const slugsToTry = cardType === 'land' && shape
      ? [`land_${shape}`, 'land']
      : [cardType];

    for (const refSlug of slugsToTry) {
      const { data: refRows } = await supabaseForPrompts
        .from('prompt_refs')
        .select('image_path')
        .eq('slug', refSlug)
        .order('sort_order');

      if (refRows && refRows.length > 0) {
        for (const row of refRows) {
          try {
            const { data: fileData } = await supabaseForPrompts.storage
              .from('ref-images')
              .download(row.image_path);
            if (fileData) {
              const buffer = Buffer.from(await fileData.arrayBuffer());
              const base64 = buffer.toString('base64');
              const mime = row.image_path.endsWith('.jpg') || row.image_path.endsWith('.jpeg')
                ? 'image/jpeg' : 'image/png';
              refImageParts.push({
                inlineData: { mimeType: mime, data: base64 }
              });
            }
          } catch {}
        }
        break; // Use the first slug that has refs
      }
    }
  } catch {}

  // Load card-specific reference image (ref_image_path on the card itself)
  if (cardData?.ref_image_path) {
    const cardRefPath = cardData.ref_image_path;
    try {
      const { data: fileData } = await supabaseForPrompts.storage
        .from('ref-images')
        .download(cardRefPath);
      if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const base64 = buffer.toString('base64');
        const mime = cardRefPath.endsWith('.jpg') || cardRefPath.endsWith('.jpeg')
          ? 'image/jpeg' : 'image/png';
        refImageParts.push({
          inlineData: { mimeType: mime, data: base64 }
        });
      }
    } catch {}
  }

  const fullPrompt = baseStylePrompt
    ? `${baseStylePrompt}\n\nNow generate an image for this card:\n\n${prompt}`
    : prompt;

  // ── 1. Resolve card in DB (before Gemini, so we can use card's ref image) ──
  const supabase = createAdminClient();
  let card: Record<string, any> | undefined;

  if (cardId?.startsWith('local-') && cardData) {
    // Local card — insert into DB so we can save art
    const {
      id: _localId,
      created_at: _ca,
      updated_at: _ua,
      generated_at: _ga,
      approved_at: _aa,
      finalized_at: _fa,
      ...insertData
    } = cardData;

    const { data: created, error: createError } = await supabase
      .from('cards')
      .upsert(
        { ...insertData, gen_status: 'generating' },
        { onConflict: 'card_number' }
      )
      .select()
      .single();

    if (createError || !created) {
      return NextResponse.json(
        { error: `Failed to create card: ${createError?.message ?? 'unknown'}` },
        { status: 500 }
      );
    }
    card = created;
  } else if (cardId) {
    const { data: found, error: cardError } = await supabase
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (cardError || !found) {
      return NextResponse.json(
        { error: `Card not found: ${cardError?.message ?? 'unknown'}` },
        { status: 404 }
      );
    }
    card = found;
  } else if (!testOnly) {
    return NextResponse.json(
      { error: 'cardId or cardData is required' },
      { status: 400 }
    );
  }

  // Also check card from DB for ref_image_path (if not already in cardData)
  if (!cardData?.ref_image_path && card?.ref_image_path) {
    try {
      const { data: fileData } = await supabaseForPrompts.storage
        .from('ref-images')
        .download(card.ref_image_path);
      if (fileData) {
        const buf = Buffer.from(await fileData.arrayBuffer());
        const b64 = buf.toString('base64');
        const m = card.ref_image_path.endsWith('.jpg') || card.ref_image_path.endsWith('.jpeg')
          ? 'image/jpeg' : 'image/png';
        refImageParts.push({
          inlineData: { mimeType: m, data: b64 }
        });
      }
    } catch {}
  }

  // ── 2. Call Gemini API (always — this is the core) ──────
  let imageBase64: string;
  let mimeType: string;

  try {
    // Retry up to 3 times — Gemini image gen is flaky with 500s
    let response: any;
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const contentParts: any[] = [];
        // Add reference images first
        if (refImageParts.length > 0) {
          contentParts.push({ text: 'Here are reference images for the art style:' });
          contentParts.push(...refImageParts);
          contentParts.push({ text: `\n\nNow generate a NEW image in this style:\n\n${fullPrompt}` });
        } else {
          contentParts.push({ text: fullPrompt });
        }

        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: [{ role: 'user', parts: contentParts }],
          config: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '4:3' },
          },
        });
        break; // success
      } catch (retryErr: any) {
        lastError = retryErr;
        const msg = retryErr?.message ?? '';
        // Only retry on 500/503 internal errors
        if (msg.includes('500') || msg.includes('INTERNAL') || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('fetch failed')) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1))); // backoff
          continue;
        }
        throw retryErr; // non-retryable error
      }
    }
    if (!response) throw lastError;

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      return NextResponse.json(
        { error: 'no_image_in_response', details: 'Gemini returned no parts' },
        { status: 502 }
      );
    }

    const imagePart = parts.find((p: any) => p.inlineData);
    if (!imagePart?.inlineData?.data) {
      // Check if response was blocked
      const textPart = parts.find((p: any) => p.text);
      return NextResponse.json(
        {
          error: 'no_image_in_response',
          details: textPart?.text ?? 'No image data in response',
        },
        { status: 502 }
      );
    }

    imageBase64 = imagePart.inlineData.data;
    mimeType = imagePart.inlineData.mimeType ?? 'image/png';
  } catch (err: any) {
    // Handle Gemini API errors
    const message = err?.message ?? String(err);

    if (message.includes('SAFETY') || message.includes('blocked')) {
      return NextResponse.json(
        { error: 'blocked_by_safety', details: message },
        { status: 422 }
      );
    }
    if (message.includes('429') || message.includes('RATE') || message.includes('quota')) {
      return NextResponse.json(
        { error: 'rate_limited', details: message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'gemini_error', details: message },
      { status: 502 }
    );
  }

  // ── Test-only mode: return image without touching DB ────
  if (testOnly) {
    return NextResponse.json({
      success: true,
      testOnly: true,
      card: cardData ?? null,
      filePath: null,
      imageBase64: `data:${mimeType};base64,${imageBase64}`,
    });
  }

  // ── Ensure card was resolved (needed for storage/DB update) ──
  if (!card) {
    return NextResponse.json(
      { error: 'cardId or cardData is required' },
      { status: 400 }
    );
  }

  // ── 3. Upload to Supabase Storage ──────────────────────
  const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
  const namePart = (card.name || `${card.shape}_${card.material}_${card.background}`).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const fileName = `${String(card.card_number).padStart(3, '0')}_${namePart}.${ext}`;
  const filePath = fileName;

  const buffer = Buffer.from(imageBase64, 'base64');

  // Ensure bucket exists (idempotent)
  await supabase.storage.createBucket('raw-arts', { public: true }).catch(() => {});

  const { error: uploadError } = await supabase.storage
    .from('raw-arts')
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: true, // overwrite if re-generating
    });

  if (uploadError) {
    return NextResponse.json(
      { error: 'upload_failed', details: uploadError.message },
      { status: 500 }
    );
  }

  // ── 4. Update card in DB ───────────────────────────────
  const { data: updatedCard, error: updateError } = await supabase
    .from('cards')
    .update({
      raw_art_path: filePath,
      art_prompt: fullPrompt,
      gen_status: 'generated',
      generated_at: new Date().toISOString(),
    })
    .eq('id', card.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: 'db_update_failed', details: updateError.message },
      { status: 500 }
    );
  }

  // ── 5. Return result with base64 preview ───────────────
  return NextResponse.json({
    success: true,
    card: updatedCard,
    filePath,
    imageBase64: `data:${mimeType};base64,${imageBase64}`,
  });
}
