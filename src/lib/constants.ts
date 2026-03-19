// ========================================
// SHAPE_CARDS — Constants & Game Data
// ========================================

import type {
  ShapeType, MaterialType, BackgroundType,
  RarityTier, ManaColor, CardAbility
} from '@/types/cards';

// ── Shape definitions ──────────────────────────────────

export interface ShapeDefinition {
  shape: ShapeType;
  emoji: string;
  manaColor: ManaColor;
  category: 'basic' | 'advanced' | 'exotic';
  availableMaterials: MaterialType[];
}

export const SHAPES: ShapeDefinition[] = [
  // Basic (5) — all 4 materials
  { shape: 'circle',   emoji: '⚪', manaColor: 'blue',  category: 'basic',    availableMaterials: ['flat', '3d', 'chrome', 'gold'] },
  { shape: 'square',   emoji: '🟦', manaColor: 'white', category: 'basic',    availableMaterials: ['flat', '3d', 'chrome', 'gold'] },
  { shape: 'triangle', emoji: '🔺', manaColor: 'red',   category: 'basic',    availableMaterials: ['flat', '3d', 'chrome', 'gold'] },
  { shape: 'star',     emoji: '⭐', manaColor: 'red',   category: 'basic',    availableMaterials: ['flat', '3d', 'chrome', 'gold'] },
  { shape: 'hexagon',  emoji: '⬡',  manaColor: 'green', category: 'basic',    availableMaterials: ['flat', '3d', 'chrome', 'gold'] },

  // Advanced (3) — flat + 3d + chrome, no gold
  { shape: 'cube',     emoji: '🟧', manaColor: 'green', category: 'advanced', availableMaterials: ['flat', '3d', 'chrome'] },
  { shape: 'cylinder', emoji: '🟢', manaColor: 'green', category: 'advanced', availableMaterials: ['flat', '3d', 'chrome'] },
  { shape: 'pentagon', emoji: '⬟',  manaColor: 'white', category: 'advanced', availableMaterials: ['flat', '3d', 'chrome'] },

  // Exotic (5) — no flat, start from 3d or chrome
  { shape: 'diamond',  emoji: '💎', manaColor: 'gold',  category: 'exotic',   availableMaterials: ['3d', 'chrome', 'gold'] },
  { shape: 'torus',    emoji: '🍩', manaColor: 'blue',  category: 'exotic',   availableMaterials: ['3d', 'chrome', 'gold'] },
  { shape: 'heart',    emoji: '❤️', manaColor: 'gold',  category: 'exotic',   availableMaterials: ['3d', 'chrome', 'gold'] },
  { shape: 'pyramid',  emoji: '🔻', manaColor: 'red',   category: 'exotic',   availableMaterials: ['3d', 'chrome'] },
  { shape: 'knot',     emoji: '🪢', manaColor: 'blue',  category: 'exotic',   availableMaterials: ['chrome', 'gold'] },
];

// ── Material → Rarity mapping ──────────────────────────

export const MATERIAL_TO_RARITY: Record<MaterialType, RarityTier> = {
  flat: 'common',
  gradient: 'uncommon',
  '3d': 'rare',
  chrome: 'epic',
  gold: 'legendary',
};

// ── Base rarity percentages ────────────────────────────

// Key: "shape_material" → base rarity %
export const BASE_RARITY_PCT: Record<string, number> = {
  // Basic shapes
  circle_flat: 12, circle_3d: 2, circle_chrome: 0.4, circle_gold: 0.08,
  square_flat: 12, square_3d: 2, square_chrome: 0.4, square_gold: 0.08,
  triangle_flat: 12, triangle_3d: 2, triangle_chrome: 0.4, triangle_gold: 0.08,
  star_flat: 5, star_3d: 1.5, star_chrome: 0.3, star_gold: 0.06,
  hexagon_flat: 5, hexagon_3d: 1.5, hexagon_chrome: 0.3, hexagon_gold: 0.06,

  // Advanced shapes
  cube_flat: 4, cube_3d: 1, cube_chrome: 0.2,
  cylinder_flat: 4, cylinder_3d: 1, cylinder_chrome: 0.2,
  pentagon_flat: 4, pentagon_3d: 1, pentagon_chrome: 0.2,

  // Exotic shapes
  diamond_3d: 1, diamond_chrome: 0.2, diamond_gold: 0.04,
  torus_3d: 0.8, torus_chrome: 0.15, torus_gold: 0.04,
  heart_3d: 0.8, heart_chrome: 0.15, heart_gold: 0.04,
  pyramid_3d: 0.5, pyramid_chrome: 0.1,
  knot_chrome: 0.08, knot_gold: 0.03,
};

// ── Background definitions ─────────────────────────────

export interface BackgroundDefinition {
  type: BackgroundType;
  label: string;
  multiplier: number;
  description: string;
}

export const BACKGROUNDS: BackgroundDefinition[] = [
  { type: 'solid_color', label: 'Solid Color',   multiplier: 1.0,  description: 'Solid color background, most common' },
  { type: 'abstract',    label: 'Abstract Scene', multiplier: 0.8,  description: 'Geometric patterns, shape in environment' },
  { type: 'clothing',    label: 'Clothing',       multiplier: 0.5,  description: 'Fragment of clothing/accessory with shape' },
  { type: 'people',      label: 'People + Shape', multiplier: 0.3,  description: 'Person holding shape towards camera' },
  { type: 'buildings',   label: 'Buildings',      multiplier: 0.15, description: 'Architecture / installation of shapes' },
];

export const BACKGROUND_MULTIPLIERS: Record<BackgroundType, number> = {
  solid_color: 1.0,
  abstract: 0.8,
  clothing: 0.5,
  people: 0.3,
  buildings: 0.15,
};

// ── Rarity colors ──────────────────────────────────────

export const RARITY_COLORS: Record<RarityTier, { bg: string; text: string; border: string }> = {
  common:    { bg: 'bg-neutral-700',   text: 'text-neutral-300',  border: 'border-neutral-500' },
  uncommon:  { bg: 'bg-green-900/50',  text: 'text-green-400',    border: 'border-green-600' },
  rare:      { bg: 'bg-blue-900/50',   text: 'text-blue-400',     border: 'border-blue-600' },
  epic:      { bg: 'bg-purple-900/50', text: 'text-purple-400',   border: 'border-purple-600' },
  legendary: { bg: 'bg-yellow-900/50', text: 'text-yellow-400',   border: 'border-yellow-600' },
};

export const RARITY_LABELS: Record<RarityTier, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

// ── Mana colors ────────────────────────────────────────

export const MANA_COLORS: Record<ManaColor, { emoji: string; label: string; hex: string }> = {
  red:    { emoji: '🔴', label: 'Red',    hex: '#ef4444' },
  blue:   { emoji: '🔵', label: 'Blue',   hex: '#3b82f6' },
  green:  { emoji: '🟢', label: 'Green',  hex: '#22c55e' },
  white:  { emoji: '⚪', label: 'White',  hex: '#e5e7eb' },
  gold:   { emoji: '🟡', label: 'Gold',   hex: '#eab308' },
  chrome: { emoji: '🪞', label: 'Chrome', hex: '#94a3b8' },
};

// ── Abilities ──────────────────────────────────────────

export const ABILITIES: CardAbility[] = [
  { name: 'Burn',     description: '+2 damage to target directly',           manaColor: 'red',   minRarity: 'uncommon' },
  { name: 'Shield',   description: '+3 DEF for one turn',                   manaColor: 'white', minRarity: 'uncommon' },
  { name: 'Heal',     description: 'Restore 3 HP to an ally',              manaColor: 'white', minRarity: 'uncommon' },
  { name: 'Grow',     description: '+1 ATK / +1 HP permanently',           manaColor: 'green', minRarity: 'rare' },
  { name: 'Counter',  description: 'Cancel an enemy ability',              manaColor: 'blue',  minRarity: 'rare' },
  { name: 'Drain',    description: 'Damage dealt = healing to self',       manaColor: 'blue',  minRarity: 'epic' },
  { name: 'Combo',    description: 'If 2+ Gold cards on field: x2 ATK',    manaColor: 'gold',  minRarity: 'epic' },
  { name: 'Overload', description: 'Hit all enemy cards',                   manaColor: 'red',   minRarity: 'legendary' },
];

// ── Generation Waves ───────────────────────────────────

export const WAVES = {
  1: { label: 'Wave 1 — Flat × Solid Color', description: '8 arts: all Flat shapes on solid background' },
  2: { label: 'Wave 2 — Flat × Other BGs', description: '32 arts: 8 Flat shapes × 4 backgrounds' },
  3: { label: 'Wave 3 — 3D × All BGs', description: '55 arts: 11 3D shapes × 5 backgrounds' },
  4: { label: 'Wave 4 — Chrome + Gold × All BGs', description: '100 arts: Chrome (60) + Gold (40)' },
} as const;

// ── Gen Status labels ──────────────────────────────────

export const GEN_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  not_started: { label: 'Not Started', color: 'bg-gray-200 text-gray-700' },
  generating:  { label: 'Generating',  color: 'bg-yellow-200 text-yellow-800' },
  generated:   { label: 'Generated',   color: 'bg-blue-200 text-blue-800' },
  approved:    { label: 'Approved',    color: 'bg-green-200 text-green-800' },
  rejected:    { label: 'Rejected',    color: 'bg-red-200 text-red-800' },
  compositing: { label: 'Compositing', color: 'bg-purple-200 text-purple-800' },
  finalized:   { label: 'Finalized',   color: 'bg-emerald-200 text-emerald-800' },
};

// ── Stat ranges by rarity ──────────────────────────────

export const STAT_RANGES: Record<RarityTier, { totalMin: number; totalMax: number }> = {
  common:    { totalMin: 8,  totalMax: 12 },
  uncommon:  { totalMin: 10, totalMax: 15 },
  rare:      { totalMin: 13, totalMax: 18 },
  epic:      { totalMin: 17, totalMax: 23 },
  legendary: { totalMin: 20, totalMax: 28 },
};

// ── Card dimensions ────────────────────────────────────

export const CARD_SIZES = {
  full: { width: 2048, height: 2048 },
  thumb: { width: 512, height: 512 },
} as const;

// ── Booster pack ───────────────────────────────────────

export const BOOSTER_PACK = {
  cardsPerPack: 6,
  guaranteedRareOrBetter: 1,
  distribution: {
    common: 0.58,
    rare: 0.14,
    epic: 0.03,
    legendary: 0.005,
  },
} as const;

// ========================================
// V2 — Card System Constants
// ========================================

import type {
  CardColor, HeroClass, ArtifactSubtype, PerkType, Perk,
} from '@/types/cards';

// ── Card Colors (v2) ──────────────────────────────────

export const CARD_COLORS: Record<CardColor, { emoji: string; label: string; hex: string; archetype: string; role: string }> = {
  yellow: { emoji: '🟡', label: 'Yellow', hex: '#eab308', archetype: 'Faith / Order', role: 'Defense, healing, buffs' },
  blue:   { emoji: '🔵', label: 'Blue',   hex: '#3b82f6', archetype: 'Tech / Control', role: 'Control, manipulation' },
  black:  { emoji: '⚫', label: 'Black',  hex: '#1f2937', archetype: 'Street / Power', role: 'Damage, sacrifice, debuffs' },
  red:    { emoji: '🔴', label: 'Red',    hex: '#ef4444', archetype: 'Art / Chaos', role: 'Aggression, AoE, chaos' },
  green:  { emoji: '🟢', label: 'Green',  hex: '#22c55e', archetype: 'Sport / Force', role: 'Big stats, growth' },
  white:  { emoji: '⚪', label: 'White',  hex: '#e5e7eb', archetype: 'Artifacts / Weapons', role: 'Colorless weapons and equipment' },
};

// ── Hero Classes ──────────────────────────────────────

export const HERO_CLASSES: Record<HeroClass, { color: CardColor; label: string; description: string }> = {
  preacher:  { color: 'yellow', label: 'Preachers', description: 'Pastors, preachers, church leaders' },
  hacker:    { color: 'blue',   label: 'Hackers',   description: 'Hackers, engineers, tech geeks' },
  gangster:  { color: 'black',  label: 'Gangsters', description: 'Gangsters, dealers, shooters' },
  artist:    { color: 'red',    label: 'Artists',   description: 'Rappers, graffiti artists, DJs, MCs' },
  athlete:   { color: 'green',  label: 'Athletes',  description: 'Basketball players, boxers, runners' },
};

// ── Land Shapes (v2 — 5 only) ─────────────────────────

export const LAND_SHAPES: { shape: string; emoji: string }[] = [
  { shape: 'circle',   emoji: '⚪' },
  { shape: 'hexagon',  emoji: '⬡' },
  { shape: 'diamond',  emoji: '💎' },
  { shape: 'star',     emoji: '⭐' },
  { shape: 'triangle', emoji: '🔺' },
];

// ── Land Materials → Rarity ───────────────────────────

export const LAND_MATERIALS: { material: string; rarity: RarityTier; label: string; dropRate: number }[] = [
  { material: 'flat',     rarity: 'common',    label: 'Flat (2D)',          dropRate: 50 },
  { material: 'gradient', rarity: 'uncommon',  label: 'Gradient / Textured', dropRate: 25 },
  { material: '3d',       rarity: 'rare',      label: '3D Rendered',        dropRate: 15 },
  { material: 'chrome',   rarity: 'epic',      label: 'Chrome',             dropRate: 7 },
  { material: 'gold',     rarity: 'legendary', label: 'Gold',               dropRate: 3 },
];

// ── Dual Land Color Pairs ─────────────────────────────

export const DUAL_LAND_PAIRS: [CardColor, CardColor][] = [
  ['yellow', 'blue'],
  ['black', 'red'],
  ['green', 'yellow'],
  ['blue', 'black'],
  ['red', 'green'],
];

// ── All 41 Perks ──────────────────────────────────────

export interface PerkDef {
  name: string;
  type: PerkType;
  description: string;
  color: CardColor;
}

export const ALL_PERKS: PerkDef[] = [
  // Yellow — Preachers
  { name: 'Sermon',       type: 'trigger',  description: 'On enter: +1 HP to all allies', color: 'yellow' },
  { name: 'Blessing',     type: 'passive',  description: 'Nearby allies gain +1 HP', color: 'yellow' },
  { name: 'Choir Shield', type: 'trigger',  description: 'On enter: gives Shield 2 to one ally', color: 'yellow' },
  { name: 'Resurrection', type: 'trigger',  description: 'On death: return 1 Common ally from graveyard', color: 'yellow' },
  { name: 'Congregation', type: 'passive',  description: 'If 3+ Yellow heroes on field — all get +0/+1', color: 'yellow' },
  { name: 'Forgiveness',  type: 'trigger',  description: 'Remove a debuff from one ally', color: 'yellow' },
  { name: 'Sunday Peace', type: 'trigger',  description: 'Prevent one enemy from attacking for 1 turn', color: 'yellow' },
  { name: 'Gospel',       type: 'passive',  description: '+1 ATK if your HP is higher than opponent\'s', color: 'yellow' },

  // Blue — Hackers
  { name: 'Intercept',  type: 'trigger',  description: 'On enter: disable one enemy perk for 1 turn', color: 'blue' },
  { name: 'Firewall',   type: 'passive',  description: 'Cannot be targeted by enemy perks', color: 'blue' },
  { name: 'Data Steal', type: 'trigger',  description: 'On enter: draw 1 extra card', color: 'blue' },
  { name: 'Overclock',  type: 'trigger',  description: 'On enter: +2 ATK to one ally until end of turn', color: 'blue' },
  { name: 'Backdoor',   type: 'passive',  description: 'Can attack directly, ignoring one defender', color: 'blue' },
  { name: 'Virus',      type: 'trigger',  description: 'On enter: -1 ATK to a random enemy', color: 'blue' },
  { name: 'Reboot',     type: 'trigger',  description: 'Return one hero (yours or enemy\'s) to hand. +2 mana if enemy', color: 'blue' },
  { name: 'Network',    type: 'passive',  description: 'If 2+ Blue allies on field — draw 1 extra card at turn start', color: 'blue' },

  // Black — Gangsters
  { name: 'Drive-By',     type: 'trigger',  description: 'On enter: deal 2 damage to a random enemy', color: 'black' },
  { name: 'Intimidate',   type: 'passive',  description: 'Enemies with lower ATK cannot block', color: 'black' },
  { name: 'Blood Money',  type: 'trigger',  description: 'Kill your ally — gain +2 mana of any color', color: 'black' },
  { name: 'Double Tap',   type: 'passive',  description: 'Deals base ATK twice (bonuses apply once)', color: 'black' },
  { name: 'Shakedown',    type: 'trigger',  description: 'On enter: opponent discards 1 card (once per turn)', color: 'black' },
  { name: 'Bulletproof',  type: 'passive',  description: 'First damage taken each turn is ignored', color: 'black' },
  { name: 'Snitch',       type: 'trigger',  description: 'On death: deal 1 damage to all enemies', color: 'black' },
  { name: 'Kingpin',      type: 'passive',  description: '+1 ATK per dead hero (yours and enemy\'s), max +3', color: 'black' },

  // Red — Artists
  { name: 'Freestyle',   type: 'trigger',  description: 'On enter: deal 1 damage to each enemy', color: 'red' },
  { name: 'Hype',        type: 'passive',  description: '+2 ATK on turns when you play 2+ cards', color: 'red' },
  { name: 'Mixtape',     type: 'trigger',  description: 'On enter: draw 2 cards, discard 1', color: 'red' },
  { name: 'Tag',         type: 'trigger',  description: 'On enter: mark an enemy — it takes +1 damage from all sources', color: 'red' },
  { name: 'Encore',      type: 'trigger',  description: 'On death: return to hand (once per game)', color: 'red' },
  { name: 'Beat Drop',   type: 'trigger',  description: 'On enter: all heroes (yours and enemy\'s) take 1 damage', color: 'red' },
  { name: 'Flow State',  type: 'passive',  description: 'Haste — can attack on the turn it enters', color: 'red' },
  { name: 'Cypher',      type: 'passive',  description: 'If another Red ally is present — both get +1 ATK', color: 'red' },
  { name: 'Diss Track',  type: 'trigger',  description: 'On enter: 2 damage directly to the opponent player', color: 'red' },

  // Green — Athletes
  { name: 'Slam Dunk',   type: 'trigger',  description: 'On enter: deal damage equal to own ATK to one enemy', color: 'green' },
  { name: 'Endurance',   type: 'passive',  description: '+1 HP at the start of each turn', color: 'green' },
  { name: 'Coach',       type: 'passive',  description: 'All Green allies get +1/+0', color: 'green' },
  { name: 'Sprint',      type: 'trigger',  description: 'On enter: +2 ATK until end of turn', color: 'green' },
  { name: 'Iron Jaw',    type: 'passive',  description: 'Takes max 3 damage per hit', color: 'green' },
  { name: 'Teamwork',    type: 'passive',  description: '+1/+1 if 2+ Green heroes on field', color: 'green' },
  { name: 'Second Wind', type: 'trigger',  description: 'When dropping to 1 HP: fully restore health (once)', color: 'green' },
  { name: 'MVP',         type: 'passive',  description: 'If only hero on your field — +3/+3. Disabled permanently if a second hero appears', color: 'green' },
];

// ── Artifacts (10) ────────────────────────────────────

export interface ArtifactDef {
  name: string;
  subtype: ArtifactSubtype;
  rarity: RarityTier;
  effect: string;
  genericCost: number;
}

export const ARTIFACTS: ArtifactDef[] = [
  { name: 'Switchblade',  subtype: 'equipment',   rarity: 'common',    effect: '+1 ATK to equipped hero', genericCost: 1 },
  { name: 'Bandana',      subtype: 'equipment',   rarity: 'common',    effect: '+1 HP to equipped hero', genericCost: 1 },
  { name: 'Glock',        subtype: 'consumable',  rarity: 'uncommon',  effect: 'On enter: 2 damage to a random enemy hero', genericCost: 2 },
  { name: 'Boombox',      subtype: 'equipment',   rarity: 'uncommon',  effect: 'All allies +0/+1 while on field', genericCost: 2 },
  { name: 'Kevlar Vest',  subtype: 'equipment',   rarity: 'rare',      effect: 'Equipped hero: incoming damage -1 (min 1)', genericCost: 3 },
  { name: 'Chains',       subtype: 'consumable',  rarity: 'rare',      effect: 'On enter: one enemy can\'t attack for 1 turn', genericCost: 3 },
  { name: 'Molotov',      subtype: 'consumable',  rarity: 'epic',      effect: 'On enter: 2 damage to all enemy heroes', genericCost: 4 },
  { name: 'Gold Chain',   subtype: 'equipment',   rarity: 'epic',      effect: 'At turn start: +1 mana of any color', genericCost: 4 },
  { name: 'Sawed-Off',    subtype: 'equipment',   rarity: 'legendary', effect: 'Equipped hero deals base ATK twice', genericCost: 5 },
  { name: 'Crown',        subtype: 'equipment',   rarity: 'legendary', effect: '+2/+2, cannot be targeted by enemy perks', genericCost: 5 },
];

// ── Hero stat ranges by rarity (ATK + HP only, no DEF) ──

export const HERO_STAT_RANGES: Record<RarityTier, { atkMin: number; atkMax: number; hpMin: number; hpMax: number; perks: number }> = {
  common:    { atkMin: 1, atkMax: 2, hpMin: 1, hpMax: 3, perks: 1 },
  uncommon:  { atkMin: 2, atkMax: 3, hpMin: 2, hpMax: 4, perks: 1 },
  rare:      { atkMin: 3, atkMax: 4, hpMin: 3, hpMax: 5, perks: 2 },
  epic:      { atkMin: 4, atkMax: 5, hpMin: 4, hpMax: 6, perks: 2 },
  legendary: { atkMin: 5, atkMax: 6, hpMin: 5, hpMax: 7, perks: 2 },
};

// ── Hero mana costs by rarity ─────────────────────────

export const HERO_MANA_COSTS: Record<RarityTier, { generic: number; colored: number }> = {
  common:    { generic: 0, colored: 1 },
  uncommon:  { generic: 1, colored: 1 },
  rare:      { generic: 1, colored: 2 },
  epic:      { generic: 2, colored: 2 },
  legendary: { generic: 2, colored: 3 },
};
