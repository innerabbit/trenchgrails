import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const maxDuration = 300; // 5 min — Gemini image gen is slow

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── GET /api/cards/generate-custom — public gallery ─────
export async function GET() {
  try {
    const admin = createAdminClient();
    const { data: cards, error } = await admin
      .from('generated_cards')
      .select('*, users!inner(wallet_address)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ cards: cards ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST /api/cards/generate-custom ─────────────────────
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  // Auth check
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: appUser } = await admin
    .from('users')
    .select('id')
    .eq('supabase_auth_id', user.id)
    .single();

  if (!appUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (action === 'generate') {
    return handleGenerate(body.prompt, admin);
  } else if (action === 'save') {
    return handleSave(body.card, appUser.id, admin);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// ── Generate card data + art ────────────────────────────

async function handleGenerate(userPrompt: string, admin: ReturnType<typeof createAdminClient>) {
  if (!userPrompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  // Load generator_base + generator_art prompt templates
  let basePrompt = '';
  let artTemplate = '';
  try {
    const { data: rows } = await admin
      .from('prompts')
      .select('slug, content')
      .in('slug', ['generator_base', 'generator_art']);
    for (const row of rows ?? []) {
      if (row.slug === 'generator_base' && row.content) basePrompt = row.content;
      if (row.slug === 'generator_art' && row.content) artTemplate = row.content;
    }
  } catch { /* continue without templates */ }

  // Build full text prompt with {{prompt}} interpolation
  const textPrompt = basePrompt
    ? basePrompt.replace('{{prompt}}', userPrompt.trim())
    : `Create a trading card character based on: ${userPrompt.trim()}. Return JSON with: name, ability, attack (1-10), defense (1-10), speed (1-10), mana_cost (1-5), rarity (common/rare/epic/legendary), material (flat/holographic/gold). Output ONLY valid JSON.`;

  // ── 1. Generate text (name, ability, stats) via Gemini ──
  let cardData: {
    name: string;
    ability: string;
    attack: number;
    defense: number;
    speed: number;
    mana_cost: number;
    rarity: string;
    material: string;
  };

  try {
    const textResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: textPrompt,
    });

    const rawText = textResponse.text?.trim() || '';
    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse card data', raw: rawText }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    cardData = {
      name: String(parsed.name || 'Unknown').slice(0, 50),
      ability: String(parsed.ability || 'No ability').slice(0, 200),
      attack: clamp(Number(parsed.attack) || rand(1, 10), 1, 10),
      defense: clamp(Number(parsed.defense) || rand(1, 10), 1, 10),
      speed: clamp(Number(parsed.speed) || rand(1, 10), 1, 10),
      mana_cost: clamp(Number(parsed.mana_cost) || rand(1, 5), 1, 5),
      rarity: ['common', 'rare', 'epic', 'legendary'].includes(parsed.rarity) ? parsed.rarity : 'common',
      material: ['flat', 'holographic', 'gold'].includes(parsed.material) ? parsed.material : 'flat',
    };
  } catch (err: any) {
    return NextResponse.json({ error: 'Text generation failed', details: err.message }, { status: 502 });
  }

  // ── 2. Generate art via Gemini image model ──
  let artUrl: string | null = null;
  try {
    const artPrompt = artTemplate
      ? artTemplate.replace(/\{\{prompt\}\}/g, userPrompt.trim()).replace(/\{\{name\}\}/g, cardData.name)
      : `Trading card game character portrait. ${userPrompt.trim()}. The character's name is "${cardData.name}". Style: digital art, vibrant colors, fantasy game card illustration, centered character portrait on transparent/simple background. No text or UI elements.`;

    let response: any;
    let lastError: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: artPrompt,
          config: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '4:3' },
          },
        });
        break;
      } catch (retryErr: any) {
        lastError = retryErr;
        const msg = retryErr?.message ?? '';
        if (msg.includes('500') || msg.includes('INTERNAL') || msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('fetch failed')) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        throw retryErr;
      }
    }
    if (!response) throw lastError;

    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find((p: any) => p.inlineData);

    if (imagePart?.inlineData?.data) {
      const imageBase64 = imagePart.inlineData.data;
      const mimeType = imagePart.inlineData.mimeType ?? 'image/png';
      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : 'png';
      const fileName = `generated/${crypto.randomUUID()}.${ext}`;

      const buffer = Buffer.from(imageBase64, 'base64');
      await admin.storage.createBucket('raw-arts', { public: true }).catch(() => {});

      const { error: uploadError } = await admin.storage
        .from('raw-arts')
        .upload(fileName, buffer, { contentType: mimeType, upsert: true });

      if (!uploadError) {
        const { data: urlData } = admin.storage.from('raw-arts').getPublicUrl(fileName);
        artUrl = urlData.publicUrl;
      }
    }
  } catch (err: any) {
    // Art generation failed — return card without art
    console.error('[generate-custom] Art generation failed:', err.message);
  }

  return NextResponse.json({
    card: { ...cardData, art_url: artUrl, prompt: userPrompt.trim() },
  });
}

// ── Save generated card to gallery ──────────────────────

async function handleSave(
  card: any,
  userId: string,
  admin: ReturnType<typeof createAdminClient>,
) {
  if (!card) {
    return NextResponse.json({ error: 'card data required' }, { status: 400 });
  }

  const { data: saved, error } = await admin
    .from('generated_cards')
    .insert({
      user_id: userId,
      prompt: card.prompt || '',
      name: card.name,
      ability: card.ability,
      attack: card.attack,
      defense: card.defense,
      speed: card.speed,
      mana_cost: card.mana_cost,
      rarity: card.rarity || 'common',
      material: card.material || 'flat',
      art_url: card.art_url,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ card: saved });
}

// ── Helpers ─────────────────────────────────────────────

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
