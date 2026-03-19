#!/usr/bin/env node
/**
 * Setup script: Creates the database schema in Supabase
 *
 * Usage:
 *   DATABASE_URL="postgresql://postgres.[ref]:[password]@..." node scripts/setup-db.mjs
 *
 * Get your DATABASE_URL from:
 *   Supabase Dashboard > Settings > Database > Connection string > URI (Session mode)
 */

import pg from 'pg';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Error: DATABASE_URL environment variable is required.\n');
  console.log('Get it from: Supabase Dashboard > Settings > Database > Connection string\n');
  console.log('Usage:');
  console.log('  DATABASE_URL="postgresql://postgres.[ref]:[password]@..." node scripts/setup-db.mjs');
  process.exit(1);
}

async function main() {
  console.log('=== Shape Cards DB Setup ===');
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database!');
    console.log('Running schema...');
    await client.query(schema);
    console.log('Schema created successfully!');

    const res = await client.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cards'"
    );
    console.log(`Verified: cards table exists = ${res.rows[0].count > 0}`);
    console.log('\n=== DONE! Now run the seed: curl -X POST http://localhost:3000/api/cards/seed ===');
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
