import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// GET /api/art-proxy?path=yellow-chrome-hexagon.png
// Proxies Supabase Storage images so they're same-origin for WebGL textures
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get('path');
  if (!path) {
    return NextResponse.json({ error: 'path required' }, { status: 400 });
  }

  const clean = path.replace(/^raw-arts\//, '');
  const url = `${SUPABASE_URL}/storage/v1/object/public/raw-arts/${clean}`;

  const res = await fetch(url);
  if (!res.ok) {
    return new NextResponse('Not found', { status: 404 });
  }

  const contentType = res.headers.get('content-type') || 'image/png';
  const buffer = await res.arrayBuffer();

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
