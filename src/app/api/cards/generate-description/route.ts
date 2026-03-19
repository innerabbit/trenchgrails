import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createAdminClient } from '@/lib/supabase/admin';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Default context maps (used as fallback if not in DB) ──

const DEFAULT_CLASS_CONTEXT: Record<string, string> = {
  preacher: 'church leaders, gospel, faith community',
  hacker: 'tech underground, computer labs, dial-up era',
  gangster: 'street hustle, corner boys, trap houses',
  artist: 'hip-hop, graffiti, open mics, DJ battles',
  athlete: 'basketball courts, boxing gyms, track meets',
};

const DEFAULT_COLOR_CONTEXT: Record<string, string> = {
  yellow: 'faith, order, churches, gospel',
  blue: 'technology, control, computer labs',
  black: 'street power, hustle, nighttime',
  red: 'art, chaos, creativity, performance',
  green: 'sport, nature, physical force',
  white: 'artifacts, neutral, equipment',
};

const DEFAULT_MATERIAL_CONTEXT: Record<string, string> = {
  flat: 'cheap looking, cardboard cutout, lo-fi',
  gradient: 'slightly better, textured, print quality',
  '3d': 'solid, glossy, catches the flash light',
  chrome: 'shiny metallic, mirror reflections, premium',
  gold: 'luxurious golden gleam, heavy, rare treasure',
};

const DEFAULT_RARITY_SCALE: Record<string, string> = {
  legendary: 'EPIC, larger-than-life composition',
  epic: 'dramatic, powerful presence',
  rare: 'everyday street scene',
  uncommon: 'everyday street scene',
  common: 'everyday street scene',
};

// ── Parse "key: value" format from DB ──

function parseContextMap(text: string, fallback: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    const idx = trimmed.indexOf(':');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim().toLowerCase();
    const val = trimmed.slice(idx + 1).trim();
    if (key && val) map[key] = val;
  }
  return Object.keys(map).length > 0 ? map : fallback;
}

function serializeContextMap(map: Record<string, string>): string {
  return Object.entries(map).map(([k, v]) => `${k}: ${v}`).join('\n');
}

// ── Context lookup with loaded maps ──

type ContextMaps = {
  classCtx: Record<string, string>;
  colorCtx: Record<string, string>;
  materialCtx: Record<string, string>;
  rarityCtx: Record<string, string>;
};

function classContext(cls: string, maps: ContextMaps): string {
  return maps.classCtx[cls] || cls;
}

function colorContext(color: string, maps: ContextMaps): string {
  return maps.colorCtx[color] || color;
}

function materialContext(material: string, maps: ContextMaps): string {
  return maps.materialCtx[material] || material;
}

function rarityScale(tier: string, maps: ContextMaps): string {
  return maps.rarityCtx[tier] || 'everyday street scene';
}

// ── Template interpolation ──────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function buildPromptFromTemplates(
  card: any,
  templates: Record<string, string>,
  maps: ContextMaps,
): string {
  const base = templates['base'] || '';
  const type = card.card_type as string;
  const typeTemplate = templates[type];

  if (!typeTemplate) {
    return `${base}\n\nCard: ${card.name} (${card.card_type}). Describe a scene for this card.`;
  }

  const vars: Record<string, string> = {
    name: card.name || '',
    hero_class: card.hero_class || '',
    class_context: classContext(card.hero_class || '', maps),
    color: card.color || '',
    color_context: colorContext(card.color || '', maps),
    rarity_tier: card.rarity_tier || '',
    rarity_scale: rarityScale(card.rarity_tier || '', maps),
    atk: String(card.atk ?? ''),
    hp: String(card.hp ?? ''),
    perk_1_name: card.perk_1_name || 'none',
    perk_1_desc: card.perk_1_desc || '',
    perk_2_line: card.perk_2_name
      ? `- Perk 2: ${card.perk_2_name} — ${card.perk_2_desc || ''}`
      : '',
    shape: card.shape || '',
    material: card.material || '',
    material_context: materialContext(card.material || '', maps),
    artifact_subtype: card.artifact_subtype || '',
    ability: card.ability || '',
  };

  return `${base}\n\n${interpolate(typeTemplate, vars)}`;
}

// No more hardcoded fallback — all prompts must come from DB

// ── Load context maps from DB or auto-seed defaults ──

async function loadContextMaps(
  supabase: ReturnType<typeof createAdminClient>,
  templates: Record<string, string> | null,
): Promise<ContextMaps> {
  const CTX_SLUGS = {
    ctx_class: { label: 'Context: Hero Classes', defaults: DEFAULT_CLASS_CONTEXT },
    ctx_color: { label: 'Context: Mana Colors', defaults: DEFAULT_COLOR_CONTEXT },
    ctx_material: { label: 'Context: Materials', defaults: DEFAULT_MATERIAL_CONTEXT },
    ctx_rarity: { label: 'Context: Rarity Scale', defaults: DEFAULT_RARITY_SCALE },
  } as const;

  // Auto-seed missing context prompts
  for (const [slug, { label, defaults }] of Object.entries(CTX_SLUGS)) {
    if (!templates || !templates[slug]) {
      try {
        await supabase.from('prompts').upsert({
          slug,
          label,
          content: serializeContextMap(defaults),
        }, { onConflict: 'slug' });
      } catch {
        // Ignore — table might not exist
      }
    }
  }

  return {
    classCtx: templates?.['ctx_class']
      ? parseContextMap(templates['ctx_class'], DEFAULT_CLASS_CONTEXT)
      : DEFAULT_CLASS_CONTEXT,
    colorCtx: templates?.['ctx_color']
      ? parseContextMap(templates['ctx_color'], DEFAULT_COLOR_CONTEXT)
      : DEFAULT_COLOR_CONTEXT,
    materialCtx: templates?.['ctx_material']
      ? parseContextMap(templates['ctx_material'], DEFAULT_MATERIAL_CONTEXT)
      : DEFAULT_MATERIAL_CONTEXT,
    rarityCtx: templates?.['ctx_rarity']
      ? parseContextMap(templates['ctx_rarity'], DEFAULT_RARITY_SCALE)
      : DEFAULT_RARITY_SCALE,
  };
}

// ── POST handler ────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { cardIds, forceRegenerate, previewOnly } = await request.json();

  if (!cardIds || !Array.isArray(cardIds) || cardIds.length === 0) {
    return NextResponse.json({ error: 'cardIds array required' }, { status: 400 });
  }

  if (cardIds.length > 50) {
    return NextResponse.json({ error: 'Max 50 cards per request' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Load prompt templates from DB ──
  let templates: Record<string, string> | null = null;
  try {
    const { data: promptRows } = await supabase
      .from('prompts')
      .select('slug, content');
    if (promptRows && promptRows.length > 0) {
      templates = {};
      for (const row of promptRows) {
        templates[row.slug] = row.content;
      }
    }
  } catch {
    // Table doesn't exist yet — use fallback
  }

  // ── Load context maps (from DB or defaults) ──
  const maps = await loadContextMaps(supabase, templates);

  // Fetch cards
  const { data: cards, error: fetchError } = await supabase
    .from('cards')
    .select('*')
    .in('id', cardIds);

  if (fetchError || !cards) {
    return NextResponse.json({ error: fetchError?.message || 'Cards not found' }, { status: 404 });
  }

  // ── Preview mode: return assembled prompts without calling Gemini ──
  if (previewOnly) {
    const previews = cards.map(card => {
      if (!templates) {
        return {
          cardId: card.id,
          name: card.name,
          fullPrompt: '',
          error: 'No prompt templates found in DB. Save templates in Admin → Prompt Templates first.',
          templateSource: 'none',
        };
      }

      const prompt = buildPromptFromTemplates(card, templates, maps);

      const injectedContext: Record<string, string> = {};
      if (card.hero_class) injectedContext.class_context = classContext(card.hero_class, maps);
      if (card.color) injectedContext.color_context = colorContext(card.color, maps);
      if (card.material) injectedContext.material_context = materialContext(card.material, maps);
      if (card.rarity_tier) injectedContext.rarity_scale = rarityScale(card.rarity_tier, maps);

      return {
        cardId: card.id,
        name: card.name,
        fullPrompt: prompt,
        injectedContext,
        templateSource: 'supabase',
      };
    });
    return NextResponse.json({ previews });
  }

  const results: { cardId: string; name: string; description?: string; error?: string }[] = [];

  for (const card of cards) {
    if (card.art_description && !forceRegenerate) {
      results.push({ cardId: card.id, name: card.name, description: card.art_description });
      continue;
    }

    try {
      if (!templates) {
        results.push({ cardId: card.id, name: card.name, error: 'No prompt templates in DB. Save templates in Admin first.' });
        continue;
      }

      const prompt = buildPromptFromTemplates(card, templates, maps);

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
      });

      const description = response.text?.trim();

      if (!description) {
        results.push({ cardId: card.id, name: card.name, error: 'Empty response from Gemini' });
        continue;
      }

      const { error: updateError } = await supabase
        .from('cards')
        .update({ art_description: description })
        .eq('id', card.id);

      if (updateError) {
        results.push({ cardId: card.id, name: card.name, error: updateError.message });
      } else {
        results.push({ cardId: card.id, name: card.name, description });
      }
    } catch (err: any) {
      results.push({ cardId: card.id, name: card.name, error: err.message || 'Generation failed' });
    }
  }

  return NextResponse.json({
    processed: results.length,
    success: results.filter(r => r.description && !r.error).length,
    failed: results.filter(r => r.error).length,
    results,
  });
}
