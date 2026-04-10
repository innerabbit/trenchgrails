'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { CardV2, CardType, CardColor, RarityTier, HeroClass } from '@/types/cards';
import {
  CARD_COLORS,
  HERO_CLASSES,
  RARITY_LABELS,
  RARITY_COLORS,
} from '@/lib/constants';
import { SplineCard, type SplineCardContent } from '@/components/booster/spline-card';
import { cardToSplineContent } from '@/components/booster/card-reveal';

type FilterStatus = 'all' | 'no-description' | 'no-art' | 'complete';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
function artUrl(path: string | null | undefined, cacheBust?: number): string | null {
  if (!path) return null;
  const base = `${SUPABASE_URL}/storage/v1/object/public/raw-arts/${path.replace(/^raw-arts\//, '')}`;
  return cacheBust ? `${base}?v=${cacheBust}` : base;
}

export default function CardsV2Page() {
  const [cards, setCards] = useState<CardV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<CardV2 | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [colorFilter, setColorFilter] = useState<CardColor | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityTier | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk action state
  const [bulkAction, setBulkAction] = useState<'description' | 'art'>('description');
  const [bulkTarget, setBulkTarget] = useState<'missing' | 'all' | 'filtered' | 'desc-no-art'>('missing');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  // Editing
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [generatingArt, setGeneratingArt] = useState(false);
  const [uploadingArt, setUploadingArt] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [artVersion, setArtVersion] = useState(() => Date.now()); // cache-bust for art images

  const [error, setError] = useState<string | null>(null);

  // Prompt preview
  const [promptPreview, setPromptPreview] = useState<{ fullPrompt: string; injectedContext: Record<string, string>; templateSource: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Prompt templates
  const [promptsOpen, setPromptsOpen] = useState(false);
  const [prompts, setPrompts] = useState<Record<string, { id: string; label: string; content: string; updated_at: string }> | null>(null);
  const [promptDrafts, setPromptDrafts] = useState<Record<string, string>>({});
  const [savingPrompt, setSavingPrompt] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, { id: string; url: string; label: string }[]>>({});

  // Fetch cards
  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cards');
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setCards([]);
      } else {
        const allCards = Array.isArray(data) ? data : (data.cards || []);
        const v2Cards = allCards.filter((c: any) => c.card_type);
        setCards(v2Cards);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to fetch cards');
      setCards([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  // Filtered cards
  const filteredCards = useMemo(() => {
    let result = cards;
    if (typeFilter !== 'all') result = result.filter(c => c.card_type === typeFilter);
    if (colorFilter !== 'all') result = result.filter(c => c.color === colorFilter);
    if (rarityFilter !== 'all') result = result.filter(c => c.rarity_tier === rarityFilter);
    if (statusFilter === 'no-description') result = result.filter(c => !c.art_description);
    if (statusFilter === 'no-art') result = result.filter(c => !c.raw_art_path);
    if (statusFilter === 'complete') result = result.filter(c => c.art_description && c.raw_art_path);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name?.toLowerCase().includes(q) || c.hero_class?.includes(q));
    }
    return result;
  }, [cards, typeFilter, colorFilter, rarityFilter, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => ({
    total: cards.length,
    withDesc: cards.filter(c => c.art_description).length,
    withArt: cards.filter(c => c.raw_art_path).length,
    influencers: cards.filter(c => c.card_type === 'land').length,
    heroes: cards.filter(c => c.card_type === 'hero').length,
    artifacts: cards.filter(c => c.card_type === 'artifact').length,
  }), [cards]);

  // Memoize Spline content so the 3D card only re-renders when card data actually changes
  const splineContent = useMemo(() => {
    if (!selectedCard) return undefined;
    return cardToSplineContent({
      card_type: selectedCard.card_type,
      name: selectedCard.name,
      hero_class: selectedCard.hero_class,
      perk_1_name: selectedCard.perk_1_name,
      perk_1_desc: selectedCard.perk_1_desc,
      color: selectedCard.color,
      shape: selectedCard.shape || ('circle' as any),
      material: selectedCard.material || ('flat' as any),
      background: selectedCard.background || ('default' as any),
      mana_color: selectedCard.mana_color || ('yellow' as any),
      rarity_tier: selectedCard.rarity_tier,
      atk: selectedCard.atk ?? 0,
      def: selectedCard.def ?? 0,
      hp: selectedCard.hp ?? 0,
      mana_cost: selectedCard.mana_cost ?? 0,
      ability: selectedCard.ability,
      card_number: selectedCard.card_number,
      raw_art_path: selectedCard.raw_art_path,
      artVersion,
    });
  }, [selectedCard?.id, selectedCard?.name, selectedCard?.raw_art_path, artVersion]);

  // Generate description for a single card
  const generateDescription = async (cardId: string, force = false) => {
    setGeneratingDesc(true);
    try {
      const res = await fetch('/api/cards/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: [cardId], forceRegenerate: force }),
      });
      const data = await res.json();
      if (data.results?.[0]?.description) {
        toast.success('Description generated');
        const newDesc = data.results[0].description;
        // Update only this card in state — no full refetch
        setCards(prev => prev.map(c =>
          c.id === cardId ? { ...c, art_description: newDesc } : c
        ));
        if (selectedCard?.id === cardId) {
          setSelectedCard(prev => prev ? { ...prev, art_description: newDesc } : null);
        }
      } else {
        toast.error(data.results?.[0]?.error || 'Failed');
      }
    } catch (err) {
      toast.error('Network error');
    }
    setGeneratingDesc(false);
  };

  // Save edited description
  const saveDescription = async (cardId: string, desc: string) => {
    try {
      const res = await fetch('/api/cards/' + cardId + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ art_description: desc }),
      });
      if (res.ok) {
        toast.success('Description saved');
        setEditingDesc(false);
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, art_description: desc } : c));
        if (selectedCard?.id === cardId) {
          setSelectedCard(prev => prev ? { ...prev, art_description: desc } : null);
        }
      } else {
        toast.error('Failed to save description');
      }
    } catch {
      toast.error('Network error saving description');
    }
  };

  // Save edited name
  const saveName = async (cardId: string, newName: string) => {
    try {
      const res = await fetch('/api/cards/' + cardId + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (res.ok) {
        toast.success('Name saved');
        setEditingName(false);
        setCards(prev => prev.map(c => c.id === cardId ? { ...c, name: newName } : c));
        if (selectedCard?.id === cardId) {
          setSelectedCard(prev => prev ? { ...prev, name: newName } : null);
        }
      } else {
        toast.error('Failed to save name');
      }
    } catch {
      toast.error('Network error saving name');
    }
  };

  // Preview full prompt for a card (no Gemini call)
  const previewFullPrompt = async (cardId: string) => {
    setLoadingPreview(true);
    setPromptPreview(null);
    try {
      const res = await fetch('/api/cards/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: [cardId], previewOnly: true }),
      });
      const data = await res.json();
      if (data.previews?.[0]) {
        setPromptPreview(data.previews[0]);
      } else {
        toast.error('Failed to preview prompt');
      }
    } catch {
      toast.error('Network error');
    }
    setLoadingPreview(false);
  };

  // Fetch prompts from DB
  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/prompts');
      const data = await res.json();
      if (data.prompts) {
        setPrompts(data.prompts);
        const drafts: Record<string, string> = {};
        for (const [slug, p] of Object.entries(data.prompts) as [string, any][]) {
          drafts[slug] = p.content;
        }
        // Initialize defaults for entries not yet in DB
        for (const [slug, def] of Object.entries(CTX_DEFAULTS)) {
          if (!drafts[slug]) drafts[slug] = def.content;
        }
        for (const [slug, def] of Object.entries(TEMPLATE_DEFAULTS)) {
          if (!drafts[slug]) drafts[slug] = def.content;
        }
        // Dynamic land type defaults will be applied in render via allTemplateDefaults
        setPromptDrafts(drafts);
      }
    } catch {
      toast.error('Failed to load prompts');
    }
  };

  const fetchRefs = async () => {
    try {
      const res = await fetch('/api/prompt-refs');
      const data = await res.json();
      if (data.refs) {
        const grouped: Record<string, any[]> = {};
        for (const ref of data.refs) {
          if (!grouped[ref.slug]) grouped[ref.slug] = [];
          grouped[ref.slug].push(ref);
        }
        setRefs(grouped);
      }
    } catch {}
  };

  const uploadRef = async (slug: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('slug', slug);
    const res = await fetch('/api/prompt-refs', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.ref) {
      setRefs(prev => ({
        ...prev,
        [slug]: [...(prev[slug] || []), data.ref],
      }));
      toast.success('Reference image uploaded');
    } else {
      toast.error(data.error || 'Upload failed');
    }
  };

  const deleteRef = async (slug: string, refId: string) => {
    const res = await fetch(`/api/prompt-refs?id=${refId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setRefs(prev => ({
        ...prev,
        [slug]: (prev[slug] || []).filter(r => r.id !== refId),
      }));
      toast.success('Reference deleted');
    }
  };

  // Context map defaults & labels
  const CTX_DEFAULTS: Record<string, { label: string; content: string }> = {
    ctx_class: { label: 'Context: Hero Classes', content: 'preacher: church leaders, gospel, faith community\nhacker: tech underground, computer labs, dial-up era\ngangster: street hustle, corner boys, trap houses\nartist: hip-hop, graffiti, open mics, DJ battles\nathlete: basketball courts, boxing gyms, track meets' },
    ctx_color: { label: 'Context: Mana Colors', content: 'yellow: faith, order, churches, gospel\nblue: technology, control, computer labs\nblack: street power, hustle, nighttime\nred: art, chaos, creativity, performance\ngreen: sport, nature, physical force\nwhite: artifacts, neutral, equipment' },
    ctx_material: { label: 'Context: Materials', content: 'flat: cheap looking, cardboard cutout, lo-fi\ngradient: slightly better, textured, print quality\n3d: solid, glossy, catches the flash light\nchrome: shiny metallic, mirror reflections, premium\ngold: luxurious golden gleam, heavy, rare treasure' },
    ctx_rarity: { label: 'Context: Rarity Scale', content: 'legendary: EPIC, larger-than-life composition\nepic: dramatic, powerful presence\nrare: everyday street scene\nuncommon: everyday street scene\ncommon: everyday street scene' },
    land_shapes: { label: '👤 Influencer Types', content: 'circle: ⚪\nhexagon: ⬡\ndiamond: 💎\nstar: ⭐\ntriangle: 🔺' },
    land_materials: { label: '⛏️ Influencer Materials', content: 'flat: common, Flat (2D), 50\ngradient: uncommon, Gradient / Textured, 25\n3d: rare, 3D Rendered, 15\nchrome: epic, Chrome, 7\ngold: legendary, Gold, 3' },
  };

  // Template defaults — shown when not yet saved to DB
  const TEMPLATE_DEFAULTS: Record<string, { label: string; content: string }> = {
    base: { label: 'Base Style Prompt', content: 'You are an art director for a collectible card game set in Detroit, 1996. Everything is shot on VHS / disposable camera aesthetic — grainy, muted colors, harsh flash, lo-fi. The vibe is 90s hip-hop culture, street life, community.\n\nGenerate a vivid, cinematic visual description (2-3 sentences) for this card\'s artwork. The description should be specific enough for an AI image generator to create the art. Focus on composition, lighting, setting, and mood. Detroit \'96 aesthetic is mandatory.' },
    hero: { label: 'Hero Card Template', content: 'HERO CARD:\n- Name: {{name}}\n- Class: {{hero_class}} ({{class_context}})\n- Color: {{color}}\n- Rarity: {{rarity_tier}}\n- ATK: {{atk}}, HP: {{hp}}\n- Perk 1: {{perk_1_name}} — {{perk_1_desc}}\n{{perk_2_line}}\n\nDescribe this character in a Detroit \'96 scene. Include their appearance, clothing, pose, and environment. The character\'s power level should be reflected in the scene scale — {{rarity_scale}}.' },
    land: { label: 'Influencer Card Template (fallback)', content: 'LAND CARD (Mana Source):\n- Name: {{name}}\n- Color: {{color}} ({{color_context}})\n- Shape: {{shape}}\n- Material: {{material}}\n- Rarity: {{rarity_tier}}\n\nDescribe a location that embodies the {{color}} mana color. The {{shape}} shape in {{material}} material should be subtly integrated into the scene. Material quality reflects rarity: {{material_context}}.' },
    land_circle: { label: '⚪ Influencer: Circle', content: 'LAND CARD — CIRCLE:\n- Name: {{name}}\n- Color: {{color}} ({{color_context}})\n- Material: {{material}}\n- Rarity: {{rarity_tier}}\n\nDescribe a location with circular motifs that embodies {{color}} mana. Circles appear as portals, mandalas, arenas, or sacred rings. Material quality: {{material_context}}.' },
    land_hexagon: { label: '⬡ Influencer: Hexagon', content: 'LAND CARD — HEXAGON:\n- Name: {{name}}\n- Color: {{color}} ({{color_context}})\n- Material: {{material}}\n- Rarity: {{rarity_tier}}\n\nDescribe a location with hexagonal patterns that embodies {{color}} mana. Hexagons appear as honeycombs, tiles, crystalline structures, or tech grids. Material quality: {{material_context}}.' },
    land_diamond: { label: '💎 Influencer: Diamond', content: 'LAND CARD — DIAMOND:\n- Name: {{name}}\n- Color: {{color}} ({{color_context}})\n- Material: {{material}}\n- Rarity: {{rarity_tier}}\n\nDescribe a location with diamond shapes that embodies {{color}} mana. Diamonds appear as gems, windows, ornate frames, or crystalline formations. Material quality: {{material_context}}.' },
    land_star: { label: '⭐ Influencer: Star', content: 'LAND CARD — STAR:\n- Name: {{name}}\n- Color: {{color}} ({{color_context}})\n- Material: {{material}}\n- Rarity: {{rarity_tier}}\n\nDescribe a location with star motifs that embodies {{color}} mana. Stars appear as celestial symbols, emblems, badges, or radiant light sources. Material quality: {{material_context}}.' },
    land_triangle: { label: '🔺 Influencer: Triangle', content: 'LAND CARD — TRIANGLE:\n- Name: {{name}}\n- Color: {{color}} ({{color_context}})\n- Material: {{material}}\n- Rarity: {{rarity_tier}}\n\nDescribe a location with triangular forms that embodies {{color}} mana. Triangles appear as pyramids, rooftops, arrows, mountain peaks, or ritual symbols. Material quality: {{material_context}}.' },
    artifact: { label: 'Artifact Card Template', content: 'ARTIFACT CARD (Weapon/Equipment):\n- Name: {{name}}\n- Type: {{artifact_subtype}}\n- Rarity: {{rarity_tier}}\n- Effect: {{ability}}\n\nDescribe this item in a Detroit \'96 context. Show the {{name}} as if photographed on a table, in someone\'s hands, or in use on the street. The item\'s power should match its rarity: {{rarity_scale}}.' },
    image_style: { label: 'Image Style Prompt', content: '' },
    generator_base: { label: '🎨 Generator Base (Custom Cards)', content: 'You generate trading card characters for a collectible card game. The user will describe who they want.\n\nBased on the user prompt below, create a character card. Give it a funny gangsta street name, a meme-worthy ability, and random stats.\n\nUser prompt: {{prompt}}\n\nReturn ONLY valid JSON with these fields:\n- name: a funny gangsta/street nickname (max 50 chars)\n- ability: a humorous meme ability description (max 200 chars)\n- attack: 1-10\n- defense: 1-10\n- speed: 1-10\n- mana_cost: 1-5\n- rarity: common/rare/epic/legendary\n- material: flat/holographic/gold' },
    generator_art: { label: '🖼️ Generator Art Style (Custom Cards)', content: 'Trading card game character portrait. {{prompt}}. The character\'s name is "{{name}}". Style: digital art, vibrant colors, fantasy game card illustration, centered character portrait on transparent/simple background. No text or UI elements.' },
  };

  // Dynamic land shape slugs — derived from land_shapes context map
  const parsedLandShapes = useMemo(() => {
    const src = promptDrafts['land_shapes'] || CTX_DEFAULTS?.['land_shapes']?.content || '';
    return src
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#') && !line.startsWith('//'))
      .map(line => {
        const idx = line.indexOf(':');
        if (idx === -1) return null;
        const key = line.slice(0, idx).trim().toLowerCase().replace(/\s+/g, '_');
        const emoji = line.slice(idx + 1).trim();
        return key ? { slug: `land_${key}`, label: `${emoji} Influencer: ${key.charAt(0).toUpperCase() + key.slice(1)}`, key } : null;
      })
      .filter(Boolean) as { slug: string; label: string; key: string }[];
  }, [promptDrafts['land_shapes']]);

  // All template slugs with dynamic land types
  const templateSlugs = useMemo(() => [
    'image_style', 'base', 'hero', 'land',
    ...parsedLandShapes.map(d => d.slug),
    'artifact', 'generator_base', 'generator_art',
  ], [parsedLandShapes]);

  // Dynamic defaults for land templates not in TEMPLATE_DEFAULTS
  const allTemplateDefaults = useMemo(() => {
    const dynamic: Record<string, { label: string; content: string }> = { ...TEMPLATE_DEFAULTS };
    for (const d of parsedLandShapes) {
      if (!dynamic[d.slug]) {
        dynamic[d.slug] = {
          label: d.label,
          content: `LAND CARD — ${d.key.toUpperCase()}:\n- Name: {{name}}\n- Color: {{color}} ({{color_context}})\n- Material: {{material}}\n- Rarity: {{rarity_tier}}\n\nDescribe a location with ${d.key} motifs that embodies {{color}} mana. Material quality: {{material_context}}.`,
        };
      }
    }
    return dynamic;
  }, [parsedLandShapes]);

  // Save a single prompt
  const savePrompt = async (slug: string) => {
    setSavingPrompt(slug);
    try {
      const res = await fetch('/api/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, content: promptDrafts[slug], ...(CTX_DEFAULTS[slug] ? { label: CTX_DEFAULTS[slug].label } : allTemplateDefaults[slug] ? { label: allTemplateDefaults[slug].label } : {}) }),
      });
      const data = await res.json();
      if (data.prompt) {
        toast.success(`Prompt "${slug}" saved`);
        setPrompts(prev => ({
          ...prev,
          [slug]: {
            id: data.prompt.id,
            label: data.prompt.label || slug,
            content: promptDrafts[slug],
            updated_at: data.prompt.updated_at,
          },
        }));
      } else {
        toast.error(data.error || 'Save failed');
      }
    } catch {
      toast.error('Network error saving prompt');
    }
    setSavingPrompt(null);
  };

  // Bulk generate descriptions
  const runBulkAction = async () => {
    let targetCards = filteredCards;
    if (bulkTarget === 'missing') {
      targetCards = targetCards.filter(c => !c.art_description);
    } else if (bulkTarget === 'desc-no-art') {
      targetCards = targetCards.filter(c => c.art_description && !c.raw_art_path);
    }
    if (targetCards.length === 0) {
      toast.info('No cards to process');
      return;
    }

    setBulkProcessing(true);
    setBulkProgress({ done: 0, total: targetCards.length });

    // Process in batches of 5
    const batchSize = 5;
    let failedCount = 0;
    for (let i = 0; i < targetCards.length; i += batchSize) {
      const batch = targetCards.slice(i, i + batchSize);
      try {
        const res = await fetch('/api/cards/generate-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardIds: batch.map(c => c.id),
            forceRegenerate: bulkTarget === 'all',
          }),
        });
        if (!res.ok) failedCount += batch.length;
      } catch {
        failedCount += batch.length;
      }
      setBulkProgress({ done: Math.min(i + batchSize, targetCards.length), total: targetCards.length });
    }

    setBulkProcessing(false);
    if (failedCount > 0) {
      toast.warning(`Done: ${targetCards.length - failedCount}/${targetCards.length} generated (${failedCount} failed — retry with "Missing only")`);
    } else {
      toast.success(`All ${targetCards.length} descriptions generated`);
    }
    fetchCards();
  };

  // Seed button
  const seedCards = async () => {
    const res = await fetch('/api/cards/seed-v2', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Seeded ${data.inserted} cards`);
      fetchCards();
    } else {
      toast.error(data.error || 'Seed failed');
    }
  };

  // Type icon
  const typeIcon = (t: string) => t === 'land' ? '👤' : t === 'hero' ? '⚔️' : '🔧';
  const typeLabel = (t: string) => t === 'land' ? 'Influencer' : t === 'hero' ? 'Hero' : 'Artifact';

  if (loading) {
    return <div className="text-center py-20 text-neutral-500">Loading cards...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-2 font-medium">Failed to load cards</p>
        <p className="text-neutral-500 text-sm mb-6 max-w-lg mx-auto font-mono">{error}</p>
        <p className="text-neutral-400 text-sm mb-4">Run the v2 migration SQL in Supabase Dashboard first, then seed the cards.</p>
        <button onClick={seedCards} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md text-sm font-medium">
          🌱 Seed 125 Cards
        </button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-neutral-400 mb-4">No v2 cards found. Seed the database first.</p>
        <button onClick={seedCards} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-md text-sm font-medium">
          🌱 Seed 125 Cards
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold">Cards v2</h2>
          <span className="text-sm text-neutral-400">
            {stats.total} total — {stats.influencers} influencers, {stats.heroes} heroes, {stats.artifacts} artifacts
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span>📝 {stats.withDesc}/{stats.total} descriptions</span>
          <span>🎨 {stats.withArt}/{stats.total} art</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 bg-neutral-900 p-3 rounded-lg border border-neutral-800">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className="bg-neutral-800 text-sm rounded px-2 py-1 border border-neutral-700">
          <option value="all">All Types</option>
          <option value="land">👤 Influencers</option>
          <option value="hero">⚔️ Heroes</option>
          <option value="artifact">🔧 Artifacts</option>
        </select>
        <select value={colorFilter} onChange={e => setColorFilter(e.target.value as any)} className="bg-neutral-800 text-sm rounded px-2 py-1 border border-neutral-700">
          <option value="all">All Colors</option>
          {(Object.keys(CARD_COLORS) as CardColor[]).map(c => (
            <option key={c} value={c}>{CARD_COLORS[c].emoji} {CARD_COLORS[c].label}</option>
          ))}
        </select>
        <select value={rarityFilter} onChange={e => setRarityFilter(e.target.value as any)} className="bg-neutral-800 text-sm rounded px-2 py-1 border border-neutral-700">
          <option value="all">All Rarities</option>
          {(['common', 'uncommon', 'rare', 'epic', 'legendary'] as RarityTier[]).map(r => (
            <option key={r} value={r}>{RARITY_LABELS[r]}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-neutral-800 text-sm rounded px-2 py-1 border border-neutral-700">
          <option value="all">All Status</option>
          <option value="no-description">❌ No Description</option>
          <option value="no-art">❌ No Art</option>
          <option value="complete">✅ Complete</option>
        </select>
        <input
          type="text"
          placeholder="Search name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-neutral-800 text-sm rounded px-3 py-1 border border-neutral-700 w-44"
        />
        <span className="text-xs text-neutral-500 ml-auto">{filteredCards.length} cards</span>
      </div>

      {/* Bulk Actions */}
      <details className="bg-neutral-900 p-3 rounded-lg border border-neutral-800">
        <summary className="text-sm font-medium cursor-pointer text-neutral-300">⚡ Bulk Actions</summary>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value as any)} className="bg-neutral-800 text-sm rounded px-2 py-1 border border-neutral-700">
            <option value="description">Generate Descriptions</option>
            <option value="art">Generate Art</option>
          </select>
          <select value={bulkTarget} onChange={e => setBulkTarget(e.target.value as any)} className="bg-neutral-800 text-sm rounded px-2 py-1 border border-neutral-700">
            <option value="missing">Missing only</option>
            <option value="all">All (regenerate)</option>
            <option value="filtered">Current filter ({filteredCards.length})</option>
            <option value="desc-no-art">Has description, no art ({filteredCards.filter(c => c.art_description && !c.raw_art_path).length})</option>
          </select>
          <span className="text-xs text-neutral-400">
            Will process: {bulkTarget === 'missing' ? filteredCards.filter(c => !c.art_description).length : bulkTarget === 'desc-no-art' ? filteredCards.filter(c => c.art_description && !c.raw_art_path).length : filteredCards.length} cards
          </span>
          <button
            onClick={runBulkAction}
            disabled={bulkProcessing}
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 text-white px-4 py-1 rounded text-sm font-medium"
          >
            {bulkProcessing ? `Processing ${bulkProgress.done}/${bulkProgress.total}...` : 'Run'}
          </button>
        </div>
        {bulkProcessing && (
          <div className="mt-2 w-full bg-neutral-800 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all"
              style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
            />
          </div>
        )}
      </details>

      {/* Prompt Templates Editor */}
      <details
        className="bg-neutral-900 p-3 rounded-lg border border-neutral-800"
        open={promptsOpen}
        onToggle={(e) => {
          const open = (e.target as HTMLDetailsElement).open;
          setPromptsOpen(open);
          if (open && !prompts) { fetchPrompts(); fetchRefs(); }
        }}
      >
        <summary className="text-sm font-medium cursor-pointer text-neutral-300">📝 Prompt Templates (Supabase)</summary>

        <div className="mt-3 p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg">
          <h4 className="text-xs font-bold text-blue-400 mb-1">🔗 Pipeline: how prompts are assembled</h4>
          <div className="text-[11px] text-neutral-400 space-y-1 font-mono">
            <div><span className="text-blue-300">1. Description gen:</span> base + type_template(with vars) → Gemini → art_description</div>
            <div><span className="text-blue-300">2. Image gen:</span> image_style + &quot;\n\nNow generate an image:\n\n&quot; + art_description → Gemini Image</div>
          </div>
        </div>

        {!prompts ? (
          <p className="mt-3 text-xs text-neutral-500">Loading prompts...</p>
        ) : (
          <div className="mt-3 space-y-4">
            {/* Context Maps — editable key:value pairs */}
            <div className="border border-amber-800/50 rounded-lg p-3 bg-amber-950/20">
              <h4 className="text-xs font-bold text-amber-400 mb-2">🎛️ Context Maps (injected into {'{{variables}}'})</h4>
              <p className="text-[10px] text-neutral-500 mb-3">
                Format: <code className="text-amber-300">key: value</code> per line. These fill {'{{class_context}}'}, {'{{color_context}}'}, {'{{material_context}}'}, {'{{rarity_scale}}'} in templates.
              </p>
              {(['ctx_class', 'ctx_color', 'ctx_material', 'ctx_rarity', 'land_shapes', 'land_materials'] as const).map(slug => {
                const p = prompts?.[slug];
                const defaults = CTX_DEFAULTS[slug];
                const label = p?.label ?? defaults.label;
                const savedContent = p?.content ?? '';
                const draft = promptDrafts[slug] ?? (savedContent || defaults.content);
                const isNew = !p;
                const changed = isNew || draft !== p.content;
                return (
                  <div key={slug} className="space-y-1 mb-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-amber-400/80">{label}</label>
                      {p ? (
                        <span className="text-[10px] text-neutral-600">
                          updated {new Date(p.updated_at).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600">not saved yet — defaults shown</span>
                      )}
                    </div>
                    <textarea
                      value={draft}
                      onChange={e => setPromptDrafts(prev => ({ ...prev, [slug]: e.target.value }))}
                      rows={slug === 'ctx_rarity' ? 4 : 6}
                      className="w-full bg-neutral-800 text-sm rounded-lg p-3 border border-amber-900/50 font-mono text-neutral-200 resize-y"
                      placeholder={`key: value (one per line)`}
                    />
                    <button
                      onClick={() => savePrompt(slug)}
                      disabled={!changed || savingPrompt === slug}
                      className="bg-green-700 hover:bg-green-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white px-4 py-1 rounded text-xs font-medium"
                    >
                      {savingPrompt === slug ? 'Saving...' : isNew ? 'Save to DB' : changed ? 'Save Changes' : 'No Changes'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Prompt Templates — land types are dynamic from land_shapes */}
            {templateSlugs.map(slug => {
              const p = prompts?.[slug];
              const defaults = allTemplateDefaults[slug];
              const label = p?.label ?? defaults?.label ?? slug;
              const savedContent = p?.content ?? '';
              const draft = promptDrafts[slug] ?? (savedContent || defaults?.content || '');
              const isNew = !p;
              const changed = isNew ? draft !== (defaults?.content || '') : draft !== p.content;
              return (
                <div key={slug} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-neutral-400 uppercase">{label}</label>
                    {p ? (
                      <span className="text-[10px] text-neutral-600">
                        updated {new Date(p.updated_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600">not saved yet — defaults shown</span>
                    )}
                  </div>
                  <textarea
                    value={draft}
                    onChange={e => setPromptDrafts(prev => ({ ...prev, [slug]: e.target.value }))}
                    rows={slug === 'base' ? 6 : 10}
                    className="w-full bg-neutral-800 text-sm rounded-lg p-3 border border-neutral-700 font-mono text-neutral-200 resize-y"
                    placeholder={`${slug} prompt template...`}
                  />
                  {slug === 'image_style' && (
                    <p className="text-[10px] text-neutral-600">
                      Prepended to art_description when generating images. No variables.
                    </p>
                  )}
                  {slug === 'generator_base' && (
                    <p className="text-[10px] text-neutral-600">
                      Used for custom card generation. Variable: {'{{prompt}}'} — user&apos;s input text. Must return JSON with: name, ability, attack, defense, speed, mana_cost, rarity, material.
                    </p>
                  )}
                  {slug === 'generator_art' && (
                    <p className="text-[10px] text-neutral-600">
                      Art image prompt for custom cards. Variables: {'{{prompt}}'} — user&apos;s input, {'{{name}}'} — generated character name.
                    </p>
                  )}
                  {!['base', 'image_style', 'generator_base', 'generator_art'].includes(slug) && (
                    <p className="text-[10px] text-neutral-600">
                      Variables: {'{{name}} {{color}} {{rarity_tier}} {{rarity_scale}}'}{' '}
                      {slug === 'hero' && '{{hero_class}} {{class_context}} {{atk}} {{hp}} {{perk_1_name}} {{perk_1_desc}} {{perk_2_line}}'}
                      {(slug === 'land' || slug.startsWith('land_')) && '{{color_context}} {{shape}} {{material}} {{material_context}}'}
                      {slug === 'artifact' && '{{artifact_subtype}} {{ability}}'}
                    </p>
                  )}
                  <button
                    onClick={() => savePrompt(slug)}
                    disabled={(!changed && !isNew) || savingPrompt === slug}
                    className="bg-green-700 hover:bg-green-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white px-4 py-1 rounded text-xs font-medium"
                  >
                    {savingPrompt === slug ? 'Saving...' : isNew ? 'Save to DB' : changed ? 'Save Changes' : 'No Changes'}
                  </button>
                  {/* Reference Images */}
                  {(slug === 'hero' || slug === 'land' || slug.startsWith('land_') || slug === 'artifact') && (
                    <div className="mt-2 border border-neutral-700 rounded-lg p-2 bg-neutral-900/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-neutral-500 uppercase">Reference Images</span>
                        <label className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-[10px] cursor-pointer">
                          + Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) uploadRef(slug, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                      {(refs[slug] || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {(refs[slug] || []).map(ref => (
                            <div key={ref.id} className="relative group">
                              <img
                                src={ref.url}
                                alt={ref.label || slug}
                                className="w-20 h-20 object-cover rounded border border-neutral-700"
                              />
                              <button
                                onClick={() => deleteRef(slug, ref.id)}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-neutral-600 italic">No reference images yet</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </details>

      {/* Card Grid + Detail Panel */}
      <div className="flex gap-4">
        {/* Card List */}
        <div className={`flex-1 ${selectedCard ? 'max-w-[55%]' : ''}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredCards.map(card => {
              const thumb = artUrl(card.raw_art_path, artVersion);
              return (
                <div
                  key={card.id}
                  onClick={() => {
                    setSelectedCard(card);
                    setEditingDesc(false);
                    setEditingName(false);
                  }}
                  className={`text-left rounded-lg border transition-colors cursor-pointer overflow-hidden ${
                    selectedCard?.id === card.id
                      ? 'border-blue-500 bg-blue-950/30'
                      : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600'
                  }`}
                >
                  {/* Art thumbnail */}
                  {thumb ? (
                    <div className="w-full h-20 bg-neutral-800">
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-4 bg-neutral-800/50" />
                  )}
                  <div className="p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">{typeIcon(card.card_type)}</span>
                          <span className="text-sm font-medium truncate">{card.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-neutral-500">#{String(card.card_number).padStart(3, '0')}</span>
                          <span className="text-[10px]">{CARD_COLORS[card.color]?.emoji}</span>
                          <span className={`text-[10px] px-1.5 py-0 rounded ${RARITY_COLORS[card.rarity_tier]?.bg} ${RARITY_COLORS[card.rarity_tier]?.text}`}>
                            {RARITY_LABELS[card.rarity_tier]}
                          </span>
                          {card.hero_class && (
                            <span className="text-[10px] text-neutral-500 capitalize">{card.hero_class}</span>
                          )}
                        </div>
                        {card.card_type === 'hero' && (
                          <div className="mt-1.5 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] bg-red-900/40 text-red-300 px-1.5 rounded">ATK {card.atk}</span>
                              <span className="text-[10px] bg-green-900/40 text-green-300 px-1.5 rounded">HP {card.hp}</span>
                              <span className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 rounded">Cost {card.mana_cost}</span>
                            </div>
                            {card.perk_1_name && (
                              <div className="text-[10px] text-amber-400 truncate">
                                {card.perk_1_name}{card.perk_2_name ? ` + ${card.perk_2_name}` : ''}
                              </div>
                            )}
                          </div>
                        )}
                        {card.card_type === 'land' && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-neutral-500 capitalize">{card.shape}</span>
                            <span className="text-[10px] text-neutral-600">/</span>
                            <span className="text-[10px] text-neutral-500 capitalize">{card.material}</span>
                          </div>
                        )}
                        {card.card_type === 'artifact' && (
                          <div className="mt-1.5 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-neutral-500 capitalize">{card.artifact_subtype}</span>
                              <span className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 rounded">Cost {card.mana_cost}</span>
                            </div>
                            {card.ability && <div className="text-[10px] text-neutral-400 truncate">{card.ability}</div>}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-[10px]" title={card.art_description ? 'Has description' : 'No description'}>
                          {card.art_description ? '📝' : '⬜'}
                        </span>
                        <span className="text-[10px]" title={card.raw_art_path ? 'Has art' : 'No art'}>
                          {card.raw_art_path ? '🎨' : '⬜'}
                        </span>
                      </div>
                    </div>
                    {/* Quick action buttons */}
                    <div className="flex gap-1 mt-2">
                      {!card.art_description && (
                        <button
                          onClick={(e) => { e.stopPropagation(); generateDescription(card.id); }}
                          className="text-[10px] bg-amber-700 hover:bg-amber-600 text-white px-2 py-0.5 rounded"
                          title="Generate description"
                        >
                          📝 Gen
                        </button>
                      )}
                      {card.art_description && !card.raw_art_path && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCard(card);
                          }}
                          className="text-[10px] bg-purple-700 hover:bg-purple-600 text-white px-2 py-0.5 rounded"
                          title="Generate art"
                        >
                          🎨 Art
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCard(card);
                          setEditingName(true);
                          setNameDraft(card.name || '');
                        }}
                        className="text-[10px] bg-neutral-700 hover:bg-neutral-600 text-neutral-300 px-2 py-0.5 rounded"
                        title="Edit name"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedCard && (
          <div className="w-[45%] sticky top-20 self-start bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3 max-h-[calc(100vh-8rem)] overflow-y-auto">
            {/* Header with editable name */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeIcon(selectedCard.card_type)}</span>
                  {editingName ? (
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        value={nameDraft}
                        onChange={e => setNameDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveName(selectedCard.id, nameDraft);
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                        className="bg-neutral-800 border border-neutral-600 rounded px-2 py-0.5 text-lg font-bold flex-1 min-w-0"
                        autoFocus
                      />
                      <button onClick={() => saveName(selectedCard.id, nameDraft)} className="text-xs bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded">Save</button>
                      <button onClick={() => setEditingName(false)} className="text-xs text-neutral-500 hover:text-neutral-300">✕</button>
                    </div>
                  ) : (
                    <h3
                      className="text-lg font-bold cursor-pointer hover:text-blue-300 transition-colors truncate"
                      onClick={() => { setEditingName(true); setNameDraft(selectedCard.name || ''); }}
                      title="Click to edit name"
                    >
                      {selectedCard.name}
                    </h3>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-neutral-500">#{String(selectedCard.card_number).padStart(3, '0')}</span>
                  <span>{CARD_COLORS[selectedCard.color]?.emoji} {CARD_COLORS[selectedCard.color]?.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${RARITY_COLORS[selectedCard.rarity_tier]?.bg} ${RARITY_COLORS[selectedCard.rarity_tier]?.text}`}>
                    {RARITY_LABELS[selectedCard.rarity_tier]}
                  </span>
                </div>
              </div>
              <button onClick={() => { setSelectedCard(null); setEditingName(false); }} className="text-neutral-500 hover:text-neutral-300 text-lg ml-2 shrink-0">✕</button>
            </div>

            {/* Hero Details */}
            {selectedCard.card_type === 'hero' && (
              <div className="space-y-2">
                <div className="text-sm text-neutral-400 capitalize">
                  Class: <span className="text-neutral-200">{selectedCard.hero_class}</span>
                  {selectedCard.hero_class && HERO_CLASSES[selectedCard.hero_class] && (
                    <span className="text-neutral-500 ml-2">— {HERO_CLASSES[selectedCard.hero_class].description}</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-neutral-800 rounded p-2">
                    <div className="text-[10px] text-neutral-500">ATK</div>
                    <div className="text-lg font-bold text-red-400">{selectedCard.atk}</div>
                  </div>
                  <div className="bg-neutral-800 rounded p-2">
                    <div className="text-[10px] text-neutral-500">HP</div>
                    <div className="text-lg font-bold text-green-400">{selectedCard.hp}</div>
                  </div>
                  <div className="bg-neutral-800 rounded p-2">
                    <div className="text-[10px] text-neutral-500">COST</div>
                    <div className="text-lg font-bold text-blue-400">{selectedCard.mana_cost}</div>
                  </div>
                </div>
                {selectedCard.perk_1_name && (
                  <div className="bg-neutral-800/50 rounded p-2 text-sm">
                    <span className="text-amber-400 font-medium">{selectedCard.perk_1_name}</span>
                    <span className="text-neutral-500 text-xs ml-2">({selectedCard.perk_1_type})</span>
                    <div className="text-neutral-400 text-xs mt-0.5">{selectedCard.perk_1_desc}</div>
                  </div>
                )}
                {selectedCard.perk_2_name && (
                  <div className="bg-neutral-800/50 rounded p-2 text-sm">
                    <span className="text-amber-400 font-medium">{selectedCard.perk_2_name}</span>
                    <span className="text-neutral-500 text-xs ml-2">({selectedCard.perk_2_type})</span>
                    <div className="text-neutral-400 text-xs mt-0.5">{selectedCard.perk_2_desc}</div>
                  </div>
                )}
              </div>
            )}

            {/* Influencer Details */}
            {selectedCard.card_type === 'land' && (
              <div className="space-y-2">
                <div className="text-sm text-neutral-400">
                  Shape: <span className="text-neutral-200 capitalize">{selectedCard.shape}</span> —
                  Material: <span className="text-neutral-200 capitalize">{selectedCard.material}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-neutral-800 rounded p-2">
                    <div className="text-[10px] text-neutral-500">MANA</div>
                    <div className="text-lg">{CARD_COLORS[selectedCard.color]?.emoji} +1</div>
                  </div>
                  <div className="bg-neutral-800 rounded p-2">
                    <div className="text-[10px] text-neutral-500">RARITY</div>
                    <div className={`text-sm font-bold ${RARITY_COLORS[selectedCard.rarity_tier]?.text}`}>
                      {RARITY_LABELS[selectedCard.rarity_tier]}
                    </div>
                  </div>
                </div>
                {selectedCard.ability && (
                  <div className="bg-neutral-800/50 rounded p-2 text-sm text-neutral-300">
                    {selectedCard.ability}
                  </div>
                )}
              </div>
            )}

            {/* Artifact Details */}
            {selectedCard.card_type === 'artifact' && (
              <div className="space-y-2">
                <div className="text-sm text-neutral-400">
                  Type: <span className="text-neutral-200 capitalize">{selectedCard.artifact_subtype}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-neutral-800 rounded p-2">
                    <div className="text-[10px] text-neutral-500">COST</div>
                    <div className="text-lg font-bold text-blue-400">{selectedCard.mana_cost} ⚪</div>
                  </div>
                  <div className="bg-neutral-800 rounded p-2">
                    <div className="text-[10px] text-neutral-500">RARITY</div>
                    <div className={`text-sm font-bold ${RARITY_COLORS[selectedCard.rarity_tier]?.text}`}>
                      {RARITY_LABELS[selectedCard.rarity_tier]}
                    </div>
                  </div>
                </div>
                {selectedCard.ability && (
                  <div className="bg-neutral-800/50 rounded p-2 text-sm text-neutral-300">
                    {selectedCard.ability}
                  </div>
                )}
              </div>
            )}

            {/* Card Reference Image */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-400">Reference Image</span>
                <label className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-[10px] cursor-pointer">
                  {(selectedCard as any).ref_image_path ? 'Replace' : '+ Upload Ref'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !selectedCard) return;
                      e.target.value = '';

                      const supabaseUrl = SUPABASE_URL;
                      const ext = file.name.split('.').pop() || 'png';
                      const fileName = `card-refs/${selectedCard.id}_${Date.now()}.${ext}`;

                      const formData = new FormData();
                      formData.append('file', file);
                      formData.append('slug', `card_${selectedCard.id}`);

                      // Upload directly to storage via the prompt-refs API pattern
                      const res = await fetch('/api/prompt-refs', {
                        method: 'POST',
                        body: formData,
                      });
                      const data = await res.json();

                      if (data.ref) {
                        // Update card's ref_image_path in DB
                        const updateRes = await fetch(`/api/cards/${selectedCard.id}/status`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ref_image_path: data.ref.image_path }),
                        });

                        if (updateRes.ok) {
                          setSelectedCard({ ...selectedCard, ref_image_path: data.ref.image_path } as any);
                          setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, ref_image_path: data.ref.image_path } as any : c));
                          toast.success('Reference image uploaded');
                        }
                      } else {
                        toast.error(data.error || 'Upload failed');
                      }
                    }}
                  />
                </label>
              </div>
              {(selectedCard as any).ref_image_path ? (
                <div className="relative group inline-block">
                  <img
                    src={`${SUPABASE_URL}/storage/v1/object/public/ref-images/${(selectedCard as any).ref_image_path}`}
                    alt="Card reference"
                    className="w-32 h-32 object-cover rounded border border-neutral-700"
                  />
                  <button
                    onClick={async () => {
                      // Remove ref
                      const res = await fetch(`/api/cards/${selectedCard.id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ref_image_path: null }),
                      });
                      if (res.ok) {
                        setSelectedCard({ ...selectedCard, ref_image_path: null } as any);
                        setCards(prev => prev.map(c => c.id === selectedCard.id ? { ...c, ref_image_path: null } as any : c));
                        toast.success('Reference removed');
                      }
                    }}
                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <p className="text-[10px] text-neutral-600 italic">No reference image — upload one for better art generation</p>
              )}
            </div>

            {/* Art + 3D Preview Row */}
            <div className="flex gap-3">
              {/* Art image (if exists) */}
              {selectedCard.raw_art_path && (
                <div className="flex-1 bg-neutral-800 rounded-lg overflow-hidden">
                  <img
                    key={`art-${selectedCard.id}-${artVersion}`}
                    src={artUrl(selectedCard.raw_art_path, artVersion)!}
                    alt={selectedCard.name || ''}
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
              )}
              {/* 3D Card Preview — compact */}
              <div className="bg-neutral-800 rounded-lg overflow-hidden shrink-0" style={{ width: '120px', aspectRatio: '5/7' }}>
                <SplineCard
                  key="admin-detail-card"
                  className="w-full h-full"
                  cardContent={splineContent}
                />
              </div>
            </div>

            {/* Art Description (text prompt for image generation) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-neutral-300">
                  Art Description <span className="text-[10px] text-neutral-600 font-normal ml-1">text prompt for image gen</span>
                </h4>
                <div className="flex gap-1">
                  {selectedCard.art_description && !editingDesc && (
                    <>
                      <button
                        onClick={() => { setEditingDesc(true); setDescDraft(selectedCard.art_description || ''); }}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => saveDescription(selectedCard.id, '')}
                        className="text-xs text-red-400 hover:text-red-300"
                        title="Clear description"
                      >
                        Clear
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => generateDescription(selectedCard.id, !!selectedCard.art_description)}
                    disabled={generatingDesc}
                    className="text-xs bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 text-white px-2 py-0.5 rounded"
                  >
                    {generatingDesc ? 'Generating...' : selectedCard.art_description ? 'Regen Description' : 'Generate Description'}
                  </button>
                </div>
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded p-2 text-sm text-neutral-200 min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveDescription(selectedCard.id, descDraft)}
                      className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingDesc(false)} className="text-xs text-neutral-400 hover:text-neutral-200">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-400 bg-neutral-800/50 rounded p-2 min-h-[40px] max-h-[120px] overflow-y-auto">
                  {selectedCard.art_description || <span className="italic text-neutral-600">No description yet. Click Generate.</span>}
                </div>
              )}
            </div>

            {/* Preview Full Prompt — shows exactly what goes to Gemini */}
            <div className="space-y-1">
              <button
                onClick={() => previewFullPrompt(selectedCard.id)}
                disabled={loadingPreview}
                className="text-xs bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-800 text-neutral-300 px-3 py-1 rounded"
              >
                {loadingPreview ? 'Loading...' : '🔍 Preview Full Prompt (what Gemini sees)'}
              </button>
              {promptPreview && (
                <div className="bg-neutral-950 border border-neutral-700 rounded-lg p-3 space-y-2 max-h-[400px] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400">Full Description Prompt</span>
                    <span className="text-[10px] text-neutral-600">source: {promptPreview.templateSource}</span>
                  </div>
                  <pre className="text-[11px] text-neutral-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {promptPreview.fullPrompt}
                  </pre>
                  {Object.keys(promptPreview.injectedContext).length > 0 && (
                    <div className="border-t border-neutral-800 pt-2">
                      <span className="text-[10px] font-bold text-red-400">Injected context (hardcoded in code):</span>
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(promptPreview.injectedContext).map(([k, v]) => (
                          <div key={k} className="text-[10px] font-mono">
                            <span className="text-neutral-500">{`{{${k}}}`}</span> → <span className="text-neutral-300">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => setPromptPreview(null)} className="text-[10px] text-neutral-600 hover:text-neutral-400">Close</button>
                </div>
              )}
            </div>

            {/* Generate Art + Upload Photo */}
            <div className="flex gap-2">
              {selectedCard.art_description && (
                <button
                  className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-neutral-700 text-white py-2 rounded text-sm font-medium"
                  disabled={generatingArt || uploadingArt}
                  onClick={async () => {
                    setGeneratingArt(true);
                    try {
                      const res = await fetch('/api/generate/art', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          cardId: selectedCard.id,
                          prompt: selectedCard.art_description,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        toast.success('Art generated!');
                        const updatedCard = data.card as CardV2;
                        setCards(prev => prev.map(c =>
                          c.id === selectedCard.id ? { ...c, ...updatedCard } : c
                        ));
                        setArtVersion(Date.now());
                        setSelectedCard(prev => prev
                          ? { ...prev, raw_art_path: data.filePath, art_prompt: data.card?.art_prompt }
                          : null
                        );
                      } else {
                        toast.error(data.error || 'Art generation failed');
                      }
                    } catch (err) {
                      toast.error('Network error generating art');
                    }
                    setGeneratingArt(false);
                  }}
                >
                  {generatingArt ? 'Generating...' : selectedCard.raw_art_path ? '🎨 Regen Art' : '🎨 Generate Art'}
                </button>
              )}
              {/* Upload custom photo */}
              <label
                className={`flex-1 text-center py-2 rounded text-sm font-medium cursor-pointer transition-colors ${
                  uploadingArt
                    ? 'bg-neutral-700 text-neutral-400 cursor-wait'
                    : 'bg-teal-600 hover:bg-teal-500 text-white'
                }`}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingArt || generatingArt}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedCard) return;
                    e.target.value = ''; // reset input
                    setUploadingArt(true);
                    try {
                      const fd = new FormData();
                      fd.append('file', file);
                      fd.append('cardId', selectedCard.id);
                      fd.append('cardNumber', String(selectedCard.card_number));
                      fd.append('cardName', selectedCard.name || 'card');
                      const res = await fetch('/api/upload/raw-art', { method: 'POST', body: fd });
                      const data = await res.json();
                      if (data.success) {
                        toast.success('Photo uploaded!');
                        setCards(prev => prev.map(c =>
                          c.id === selectedCard.id ? { ...c, ...data.card } : c
                        ));
                        setArtVersion(Date.now());
                        setSelectedCard(prev => prev ? { ...prev, raw_art_path: data.filePath } : null);
                      } else {
                        toast.error(data.error || 'Upload failed');
                      }
                    } catch {
                      toast.error('Network error uploading photo');
                    }
                    setUploadingArt(false);
                  }}
                />
                {uploadingArt ? 'Uploading...' : '📷 Upload Photo'}
              </label>
            </div>

            {/* Upload Video */}
            <div className="flex gap-2">
              <label
                className={`flex-1 text-center py-2 rounded text-sm font-medium cursor-pointer transition-colors ${
                  uploadingVideo
                    ? 'bg-neutral-700 text-neutral-400 cursor-wait'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  disabled={uploadingVideo}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedCard) return;
                    e.target.value = '';
                    setUploadingVideo(true);
                    try {
                      const fd = new FormData();
                      fd.append('file', file);
                      fd.append('cardId', selectedCard.id);
                      fd.append('cardNumber', String(selectedCard.card_number));
                      fd.append('cardName', selectedCard.name || 'card');
                      const res = await fetch('/api/upload/video', { method: 'POST', body: fd });
                      const data = await res.json();
                      if (data.success) {
                        toast.success('Video uploaded!');
                        setCards(prev => prev.map(c =>
                          c.id === selectedCard.id ? { ...c, ...data.card } : c
                        ));
                        setSelectedCard(prev => prev ? { ...prev, video_path: data.filePath } : null);
                      } else {
                        toast.error(data.error || 'Video upload failed');
                      }
                    } catch {
                      toast.error('Network error uploading video');
                    }
                    setUploadingVideo(false);
                  }}
                />
                {uploadingVideo ? 'Uploading...' : selectedCard.video_path ? '🎬 Replace Video' : '🎬 Upload Video'}
              </label>
              {selectedCard.video_path && (
                <span className="text-xs text-green-400 self-center">✓ has video</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
