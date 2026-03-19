#!/usr/bin/env npx tsx
// ========================================
// CLI: Generate seed data for 210 cards
// Run: npx tsx scripts/seed.ts
// ========================================

import { generateAllCards } from '../src/lib/cards/generate-seed';
import * as fs from 'fs';

const cards = generateAllCards();
console.log(`Generated ${cards.length} cards`);

// Stats summary
const byWave: Record<number, number> = {};
const byRarity: Record<string, number> = {};
const byMana: Record<string, number> = {};

for (const card of cards) {
  byWave[card.wave] = (byWave[card.wave] || 0) + 1;
  byRarity[card.rarity_tier] = (byRarity[card.rarity_tier] || 0) + 1;
  byMana[card.mana_color] = (byMana[card.mana_color] || 0) + 1;
}

console.log('\nBy Wave:', byWave);
console.log('By Rarity:', byRarity);
console.log('By Mana Color:', byMana);

// Output as JSON for Supabase import
const outputPath = './seed-data.json';
fs.writeFileSync(outputPath, JSON.stringify(cards, null, 2));
console.log(`\nSeed data written to ${outputPath}`);
