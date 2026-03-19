import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// POST /api/admin/migrate — Check migration status and seed if ready
export async function POST() {
  const supabase = createAdminClient();

  // Check if cards table exists and is accessible
  const { count, error } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return NextResponse.json({
      status: 'schema_not_ready',
      error: error.message,
      instructions: 'Run supabase/schema.sql in the Supabase SQL Editor first.',
      sqlEditorUrl: `https://supabase.com/dashboard/project/egiavipjkheqxlstaxyc/sql/new`,
    }, { status: 400 });
  }

  return NextResponse.json({
    status: 'schema_ready',
    cardCount: count,
    message: count === 0
      ? 'Schema is ready. Call POST /api/cards/seed to populate.'
      : `Database has ${count} cards.`,
  });
}

// GET /api/admin/migrate — Check current migration status
export async function GET() {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('cards')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return NextResponse.json({
      schemaReady: false,
      error: error.message,
    });
  }

  return NextResponse.json({
    schemaReady: true,
    cardCount: count,
    seeded: (count ?? 0) > 0,
  });
}
