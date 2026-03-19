import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://theshapegame.app';

/**
 * GET /api/nft/metadata/[card_number]
 * Returns Metaplex-standard JSON metadata for a card.
 * Dynamic — always reflects current DB state (art, description, etc).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ card_number: string }> },
) {
  const { card_number } = await params;
  const num = parseInt(card_number, 10);
  if (isNaN(num) || num < 1 || num > 999) {
    return NextResponse.json({ error: 'Invalid card number' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: card, error } = await supabase
    .from('cards')
    .select('*')
    .eq('card_number', num)
    .single();

  if (error || !card) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  // Interactive 3D card page (rendered in iframe on marketplaces)
  const animationUrl = `${APP_URL}/nft/card/${num}`;

  // Build image URL from art path (static fallback for wallets without HTML support)
  let imageUrl = `${APP_URL}/placeholder-card.png`;
  if (card.raw_art_path) {
    const clean = card.raw_art_path.replace(/^raw-arts\//, '');
    imageUrl = `${SUPABASE_URL}/storage/v1/object/public/raw-arts/${clean}`;
  }

  // Build attributes array
  const attributes: { trait_type: string; value: string | number }[] = [];
  if (card.card_type) attributes.push({ trait_type: 'Card Type', value: card.card_type });
  if (card.color) attributes.push({ trait_type: 'Color', value: card.color });
  if (card.rarity_tier) attributes.push({ trait_type: 'Rarity', value: card.rarity_tier });
  if (card.hero_class) attributes.push({ trait_type: 'Class', value: card.hero_class });
  if (card.shape) attributes.push({ trait_type: 'Shape', value: card.shape });
  if (card.material) attributes.push({ trait_type: 'Material', value: card.material });
  if (card.atk != null) attributes.push({ trait_type: 'ATK', value: card.atk });
  if (card.hp != null) attributes.push({ trait_type: 'HP', value: card.hp });
  if (card.mana_cost != null) attributes.push({ trait_type: 'Mana Cost', value: card.mana_cost });
  attributes.push({ trait_type: 'Card Number', value: card.card_number });

  const metadata = {
    name: `${card.name || `Card #${String(num).padStart(3, '0')}`}`,
    symbol: 'SHAPE',
    description: card.art_description || card.flavor_text || `A ${card.rarity_tier || ''} ${card.card_type || ''} card from The Shape Game`.trim(),
    image: imageUrl,
    animation_url: animationUrl,
    external_url: 'https://theshapegame.app',
    attributes,
    properties: {
      files: [
        { uri: imageUrl, type: 'image/png' },
        { uri: animationUrl, type: 'text/html' },
      ],
      category: 'html',
    },
  };

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=300', // 5 min cache
    },
  });
}
