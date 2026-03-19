// ========================================
// TRENCH_GRAILS v2 — Seed 125 Cards
// Based on Notion mechanics doc
// ========================================

import type { CardColor, HeroClass, RarityTier, ArtifactSubtype, PerkType } from '@/types/cards';
import {
  LAND_SHAPES,
  LAND_MATERIALS,
  DUAL_LAND_PAIRS,
  ALL_PERKS,
  ARTIFACTS,
  HERO_STAT_RANGES,
  HERO_MANA_COSTS,
} from '../constants';

export interface SeedCardV2 {
  card_number: number;
  card_type: 'land' | 'hero' | 'artifact';
  name: string;
  color: CardColor;
  rarity_tier: RarityTier;

  // Hero fields
  hero_class?: HeroClass;
  atk?: number;
  hp?: number;
  mana_cost?: number;
  generic_cost?: number;
  colored_cost?: number;

  // Artifact fields
  artifact_subtype?: ArtifactSubtype;

  // Land fields
  shape?: string;
  material?: string;

  // Perks
  perk_1_name?: string;
  perk_1_type?: PerkType;
  perk_1_desc?: string;
  perk_2_name?: string;
  perk_2_type?: PerkType;
  perk_2_desc?: string;

  // Ability text (artifact effect or perk summary)
  ability?: string;
}

// ── Deterministic RNG ─────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ── Color Labels ──────────────────────────────────────

const COLOR_LABELS: Record<CardColor, string> = {
  yellow: 'Yellow', blue: 'Blue', black: 'Black', red: 'Red', green: 'Green', white: 'White',
};

const MATERIAL_LABELS: Record<string, string> = {
  flat: 'Flat', gradient: 'Gradient', '3d': '3D', chrome: 'Chrome', gold: 'Gold',
};

// ── Generate Lands (35) ──────────────────────────────

function generateLands(startNum: number): SeedCardV2[] {
  const lands: SeedCardV2[] = [];
  let num = startNum;
  const rng = seededRandom(42);

  // 25 mono-lands: 5 colors × 5 materials
  const monoColors: CardColor[] = ['yellow', 'blue', 'black', 'red', 'green'];
  for (const color of monoColors) {
    for (const mat of LAND_MATERIALS) {
      const shapeIdx = Math.floor(rng() * LAND_SHAPES.length);
      const shape = LAND_SHAPES[shapeIdx].shape;
      lands.push({
        card_number: num++,
        card_type: 'land',
        name: `${COLOR_LABELS[color]} ${MATERIAL_LABELS[mat.material]} ${shape.charAt(0).toUpperCase() + shape.slice(1)}`,
        color,
        rarity_tier: mat.rarity,
        shape,
        material: mat.material,
      });
    }
  }

  // 10 dual-lands: 5 pairs × 2 materials (3d + chrome)
  const dualMaterials = ['3d', 'chrome'] as const;
  for (const [color1, color2] of DUAL_LAND_PAIRS) {
    for (const mat of dualMaterials) {
      const rarity = mat === '3d' ? 'rare' : 'epic';
      const shapeIdx = Math.floor(rng() * LAND_SHAPES.length);
      const shape = LAND_SHAPES[shapeIdx].shape;
      lands.push({
        card_number: num++,
        card_type: 'land',
        name: `${COLOR_LABELS[color1]}-${COLOR_LABELS[color2]} ${MATERIAL_LABELS[mat]} ${shape.charAt(0).toUpperCase() + shape.slice(1)}`,
        color: color1, // Primary color
        rarity_tier: rarity as RarityTier,
        shape,
        material: mat,
      });
    }
  }

  return lands;
}

// ── Hero Names (placeholder — will be AI-generated) ───

const HERO_NAMES: Record<HeroClass, string[]> = {
  preacher: [
    // Common (6)
    'Brother Thomas', 'Sister Grace', 'Deacon Mills', 'Mother Ruth', 'Elder James', 'Choir Boy Marcus',
    // Uncommon (4)
    'Pastor Williams', 'Reverend Stone', 'Apostle Davis', 'Bishop Carter',
    // Rare (3)
    'Prophet Isaiah', 'Archbishop Moore', 'Cardinal Hayes',
    // Epic (2)
    'Saint Michael', 'Holy Father Jenkins',
    // Legendary (1)
    'Archangel Solomon',
  ],
  hacker: [
    'Script Kiddie Ray', 'Newbie_404', 'Junior Dev Kim', 'Cable Girl Dez', 'Patch Adams', 'Router Ron',
    'Zero Day Zeke', 'Proxy Paula', 'Kernel Kate', 'Rootkit Rivera',
    'Ghost Protocol', 'CryptoQueen Jade', 'Mainframe Max',
    'Neural Net Nina', 'Blackhat Baron',
    'The Architect',
  ],
  gangster: [
    'Lil Dice', 'Corner Boy Mike', 'Runner Tee', 'Lookout Larry', 'Bag Man Willie', 'Young Smoke',
    'Big Homie Dre', 'Trap Queen Keisha', 'Enforcer Eddie', 'Money Mark',
    'Don Corleone Jr', 'OG Rashad', 'Ghost Face Rick',
    'Queenpin Vanessa', 'Warlord Malik',
    'The Godfather',
  ],
  artist: [
    'MC Lil Verse', 'Beat Boy Danny', 'Tag Kid Spry', 'DJ Rookie', 'Hype Girl Tanya', 'Open Mic Steve',
    'Graffiti King Kobe', 'Scratch Master Lee', 'Flow Queen Aisha', 'Mic Check Charlie',
    'Lyrical Prophet', 'Turntable Tyrant', 'Muralist Maya',
    'Grandmaster Flash Jr', 'Virtuoso Vince',
    'Legendary MC Rakim',
  ],
  athlete: [
    'Pickup Pete', 'Jump Shot Jenny', 'Track Star Ty', 'Sparring Sam', 'Hustle Hart', 'Benchwarm Bobby',
    'Slam Dunk Davis', 'Iron Mike Jr', 'Sprint Queen Shay', 'Grappler Greg',
    'All-Star Andre', 'Champ Rivera', 'Ironman Jones',
    'MVP Morrison', 'Titan Thompson',
    'The GOAT',
  ],
};

// ── Perk Assignment by Class ──────────────────────────

function getPerksForHero(heroClass: HeroClass, rarity: RarityTier, heroIndex: number): { perk1: typeof ALL_PERKS[0]; perk2?: typeof ALL_PERKS[0] } {
  const color = { preacher: 'yellow', hacker: 'blue', gangster: 'black', artist: 'red', athlete: 'green' }[heroClass] as CardColor;
  const classPerks = ALL_PERKS.filter(p => p.color === color);
  const perkCount = HERO_STAT_RANGES[rarity].perks;

  const perk1 = classPerks[heroIndex % classPerks.length];
  const perk2 = perkCount >= 2 ? classPerks[(heroIndex + 1) % classPerks.length] : undefined;

  return { perk1, perk2 };
}

// ── Generate Heroes (80) ─────────────────────────────

function generateHeroes(startNum: number): SeedCardV2[] {
  const heroes: SeedCardV2[] = [];
  let num = startNum;
  const rng = seededRandom(1337);

  const classes: HeroClass[] = ['preacher', 'hacker', 'gangster', 'artist', 'athlete'];
  const classColors: Record<HeroClass, CardColor> = {
    preacher: 'yellow', hacker: 'blue', gangster: 'black', artist: 'red', athlete: 'green',
  };

  // 16 heroes per class: 6 common, 4 uncommon, 3 rare, 2 epic, 1 legendary
  const rarityDistribution: RarityTier[] = [
    'common', 'common', 'common', 'common', 'common', 'common',
    'uncommon', 'uncommon', 'uncommon', 'uncommon',
    'rare', 'rare', 'rare',
    'epic', 'epic',
    'legendary',
  ];

  for (const cls of classes) {
    const names = HERO_NAMES[cls];
    for (let i = 0; i < 16; i++) {
      const rarity = rarityDistribution[i];
      const stats = HERO_STAT_RANGES[rarity];
      const costs = HERO_MANA_COSTS[rarity];
      const { perk1, perk2 } = getPerksForHero(cls, rarity, i);

      const atk = randInt(rng, stats.atkMin, stats.atkMax);
      const hp = randInt(rng, stats.hpMin, stats.hpMax);

      const hero: SeedCardV2 = {
        card_number: num++,
        card_type: 'hero',
        name: names[i] || `${cls} Hero #${i + 1}`,
        color: classColors[cls],
        rarity_tier: rarity,
        hero_class: cls,
        atk,
        hp,
        mana_cost: costs.generic + costs.colored,
        generic_cost: costs.generic,
        colored_cost: costs.colored,
        perk_1_name: perk1.name,
        perk_1_type: perk1.type,
        perk_1_desc: perk1.description,
      };

      if (perk2) {
        hero.perk_2_name = perk2.name;
        hero.perk_2_type = perk2.type;
        hero.perk_2_desc = perk2.description;
      }

      heroes.push(hero);
    }
  }

  return heroes;
}

// ── Generate Artifacts (10) ──────────────────────────

function generateArtifacts(startNum: number): SeedCardV2[] {
  return ARTIFACTS.map((a, i) => ({
    card_number: startNum + i,
    card_type: 'artifact' as const,
    name: a.name,
    color: 'white' as CardColor,
    rarity_tier: a.rarity,
    artifact_subtype: a.subtype,
    ability: a.effect,
    mana_cost: a.genericCost,
    generic_cost: a.genericCost,
    colored_cost: 0,
  }));
}

// ── Generate All 125 Cards ──────────────────────────

export function generateAllCardsV2(): SeedCardV2[] {
  const lands = generateLands(1);          // #1-35
  const heroes = generateHeroes(36);       // #36-115
  const artifacts = generateArtifacts(116); // #116-125

  return [...lands, ...heroes, ...artifacts];
}
