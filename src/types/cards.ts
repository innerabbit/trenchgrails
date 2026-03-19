// ========================================
// TRENCH_GRAILS v2 — Core Types
// ========================================

// ── Legacy types (kept for backward compat) ──────────
export type ShapeType =
  | 'circle' | 'square' | 'triangle' | 'star' | 'hexagon'
  | 'cube' | 'cylinder' | 'pentagon'
  | 'diamond' | 'torus' | 'heart' | 'pyramid' | 'knot';

export type MaterialType = 'flat' | 'gradient' | '3d' | 'chrome' | 'gold';

export type BackgroundType = 'solid_color' | 'abstract' | 'clothing' | 'people' | 'buildings';

export type GenStatus =
  | 'not_started' | 'generating' | 'generated'
  | 'approved' | 'rejected'
  | 'compositing' | 'finalized';

// ── V2 Card System Types ─────────────────────────────

export type CardType = 'land' | 'hero' | 'artifact';

export type CardColor = 'yellow' | 'blue' | 'black' | 'red' | 'green' | 'white';

export type HeroClass = 'preacher' | 'hacker' | 'gangster' | 'artist' | 'athlete';

export type ArtifactSubtype = 'equipment' | 'consumable';

export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ManaColor = 'red' | 'blue' | 'green' | 'white' | 'gold' | 'chrome';

export type PerkType = 'trigger' | 'passive';

export interface Perk {
  name: string;
  type: PerkType;
  description: string;
}

export type AbilityName =
  | 'Burn' | 'Shield' | 'Heal' | 'Grow'
  | 'Counter' | 'Drain' | 'Combo' | 'Overload';

export interface CardAbility {
  name: AbilityName;
  description: string;
  manaColor: ManaColor;
  minRarity: RarityTier;
}

// ── V2 Card Interface ────────────────────────────────

export interface CardV2 {
  id: string;
  card_number: number;

  // V2 Identity
  card_type: CardType;
  name: string;
  color: CardColor;
  rarity_tier: RarityTier;

  // Hero-specific
  hero_class: HeroClass | null;
  atk: number | null;
  hp: number | null;
  mana_cost: number | null;
  generic_cost: number | null;
  colored_cost: number | null;

  // Artifact-specific
  artifact_subtype: ArtifactSubtype | null;

  // Land-specific
  shape: ShapeType | null;
  material: MaterialType | null;

  // Perks (heroes)
  perk_1_name: string | null;
  perk_1_type: string | null;
  perk_1_desc: string | null;
  perk_2_name: string | null;
  perk_2_type: string | null;
  perk_2_desc: string | null;

  // Art generation
  art_description: string | null;
  art_prompt: string | null;
  flavor_text: string | null;

  // Legacy (nullable)
  ability: string | null;
  def: number | null;
  background: BackgroundType | null;
  mana_color: ManaColor | null;

  // Pipeline
  gen_status: GenStatus;

  // Art paths
  raw_art_path: string | null;
  processed_card_path: string | null;
  thumb_path: string | null;
  promo_path: string | null;
  video_path: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  generated_at: string | null;
  approved_at: string | null;
  finalized_at: string | null;
}

// Legacy Card type — kept for existing code that uses it
export interface Card {
  id: string;
  card_number: number;
  shape: ShapeType;
  material: MaterialType;
  background: BackgroundType;
  mana_color: ManaColor;
  rarity_tier: RarityTier;
  atk: number;
  def: number;
  hp: number;
  mana_cost: number;
  ability: string | null;
  base_rarity_pct: number;
  background_multiplier: number;
  final_rarity_pct: number;
  wave: number;
  gen_status: GenStatus;
  raw_art_path: string | null;
  processed_card_path: string | null;
  thumb_path: string | null;
  promo_path: string | null;
  created_at: string;
  updated_at: string;
  generated_at: string | null;
  approved_at: string | null;
  finalized_at: string | null;
}

export interface CardRow {
  id: string;
  card_number: number;
  shape: ShapeType;
  material: MaterialType;
  background: BackgroundType;
  mana_color: ManaColor;
  rarity_tier: RarityTier;
  wave: number;
  gen_status: GenStatus;
  thumb_path: string | null;
  raw_art_path: string | null;
  atk: number;
  def: number;
  hp: number;
  mana_cost: number;
  ability: string | null;
  final_rarity_pct: number;
}

// ── Leaderboard ──────────────────────────────────────
export interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  twitter_handle: string | null;
  total_cards: number;
  unique_cards: number;
  legendaries: number;
  epics: number;
  rares: number;
  score: number;
}
