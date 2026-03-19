import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/nft/confirm
 * With Bubblegum V2, the server already confirmed transactions during mint.
 * This endpoint is kept for backwards compatibility but is now a no-op.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { packId, txSignatures } = body as {
    packId: string;
    txSignatures: string[];
  };

  if (!packId || !txSignatures?.length) {
    return NextResponse.json({ error: 'Missing packId or txSignatures' }, { status: 400 });
  }

  // Server already confirmed during mint — nothing to do
  return NextResponse.json({
    confirmed: txSignatures.length,
    total: txSignatures.length,
    packId,
  });
}
