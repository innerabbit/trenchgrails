// ========================================
// Seed data generator for 195 cards
// Run: npx tsx src/lib/cards/generate-seed.ts
// ========================================

import {
  SHAPES,
  BACKGROUNDS,
  BASE_RARITY_PCT,
  MATERIAL_TO_RARITY,
  STAT_RANGES,
  ABILITIES,
} from '../constants';
import type {
  ShapeType,
  MaterialType,
  BackgroundType,
  RarityTier,
  ManaColor,
} from '@/types/cards';

// ── Determine wave ─────────────────────────────────────

function getWave(material: MaterialType, background: BackgroundType): number {
  if (material === 'flat' && background === 'solid_color') return 1;
  if (material === 'flat') return 2;
  if (material === '3d') return 3;
  return 4; // chrome, gold
}

// ── Generate stats based on rarity ─────────────────────

function generateStats(rarity: RarityTier, manaColor: ManaColor, seed: number) {
  const range = STAT_RANGES[rarity];
  const total = range.totalMin + Math.floor(
    (pseudoRandom(seed) * (range.totalMax - range.totalMin + 1))
  );

  // Distribute stats based on mana color affinity
  const weights = getStatWeights(manaColor);
  const rawStats = distributeStats(total, weights, seed);

  return {
    atk: clamp(rawStats.atk, 1, 10),
    def: clamp(rawStats.def, 0, 8),
    hp: clamp(rawStats.hp, 1, 12),
    mana_cost: clamp(Math.ceil(total / 7), 1, 5),
  };
}

function getStatWeights(manaColor: ManaColor): { atk: number; def: number; hp: number } {
  switch (manaColor) {
    case 'red':    return { atk: 0.45, def: 0.15, hp: 0.40 }; // High ATK
    case 'blue':   return { atk: 0.30, def: 0.30, hp: 0.40 }; // Balanced, ability-focused
    case 'green':  return { atk: 0.25, def: 0.25, hp: 0.50 }; // High HP
    case 'white':  return { atk: 0.20, def: 0.45, hp: 0.35 }; // High DEF
    case 'gold':   return { atk: 0.33, def: 0.33, hp: 0.34 }; // Balanced
    case 'chrome': return { atk: 0.33, def: 0.33, hp: 0.34 }; // Balanced
  }
}

function distributeStats(total: number, weights: { atk: number; def: number; hp: number }, seed: number) {
  const statTotal = total; // mana_cost is computed separately
  let atk = Math.round(statTotal * weights.atk + (pseudoRandom(seed + 1) - 0.5) * 2);
  let def = Math.round(statTotal * weights.def + (pseudoRandom(seed + 2) - 0.5) * 2);
  let hp = statTotal - atk - def;
  // Ensure minimums
  if (atk < 1) { hp += atk - 1; atk = 1; }
  if (def < 0) { hp += def; def = 0; }
  if (hp < 1) { atk -= (1 - hp); hp = 1; }
  return { atk, def, hp };
}

// ── Assign ability ─────────────────────────────────────

function assignAbility(rarity: RarityTier, manaColor: ManaColor, seed: number): string | null {
  if (rarity === 'common') return null;

  const rarityOrder: RarityTier[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  const rarityIdx = rarityOrder.indexOf(rarity);

  // Filter abilities by mana color compatibility and minimum rarity
  const eligible = ABILITIES.filter(a => {
    const abilityIdx = rarityOrder.indexOf(a.minRarity);
    const colorMatch = a.manaColor === manaColor || manaColor === 'gold' || manaColor === 'chrome';
    return abilityIdx <= rarityIdx && colorMatch;
  });

  if (eligible.length === 0) {
    // Fallback: any ability that meets rarity requirement
    const fallback = ABILITIES.filter(a => rarityOrder.indexOf(a.minRarity) <= rarityIdx);
    if (fallback.length === 0) return null;
    return fallback[Math.floor(pseudoRandom(seed + 10) * fallback.length)].name;
  }

  return eligible[Math.floor(pseudoRandom(seed + 10) * eligible.length)].name;
}

// ── Deterministic pseudo-random ────────────────────────

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ── Main generation ────────────────────────────────────

export interface SeedCard {
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
  wave: number;
  gen_status: string;
}

export function generateAllCards(): SeedCard[] {
  const cards: SeedCard[] = [];
  let cardNumber = 1;

  for (const shapeDef of SHAPES) {
    for (const material of shapeDef.availableMaterials) {
      for (const bgDef of BACKGROUNDS) {
        const key = `${shapeDef.shape}_${material}`;
        const baseRarity = BASE_RARITY_PCT[key];
        if (baseRarity === undefined) continue;

        const rarity = MATERIAL_TO_RARITY[material];
        const wave = getWave(material, bgDef.type);

        // Determine effective mana color (chrome material → chrome)
        const effectiveMana: ManaColor = material === 'chrome' ? 'chrome' : shapeDef.manaColor;

        const seed = cardNumber * 137;
        const stats = generateStats(rarity, effectiveMana, seed);
        const ability = assignAbility(rarity, effectiveMana, seed);

        cards.push({
          card_number: cardNumber,
          shape: shapeDef.shape,
          material,
          background: bgDef.type,
          mana_color: effectiveMana,
          rarity_tier: rarity,
          ...stats,
          ability,
          base_rarity_pct: baseRarity,
          background_multiplier: bgDef.multiplier,
          wave,
          gen_status: 'not_started',
        });

        cardNumber++;
      }
    }
  }

  return cards;
}

// CLI runner is in scripts/seed.ts to avoid fs import in client bundle
