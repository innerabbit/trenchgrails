import { NextRequest, NextResponse } from 'next/server';

const COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// DAS-compatible RPC (Helius, Triton, etc.) — falls back to SOLANA_RPC_URL
const DAS_RPC_URL = process.env.DAS_RPC_URL || RPC_URL;

/**
 * GET /api/nft/owned?wallet=<address>
 * Returns card numbers owned by a wallet, verified on-chain via DAS API.
 * Requires a DAS-compatible RPC (Helius, Triton, etc.)
 */
export async function GET(request: NextRequest) {
  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return NextResponse.json({ error: 'wallet param required' }, { status: 400 });
  }

  if (!COLLECTION_ADDRESS) {
    return NextResponse.json({ error: 'Collection not configured' }, { status: 500 });
  }

  try {
    // Use DAS API: getAssetsByOwner to fetch all cNFTs owned by wallet
    const assets = await fetchAllAssets(wallet);

    // Filter by our collection and extract card numbers from metadata
    const cards: { cardNumber: number; assetId: string; name: string }[] = [];

    for (const asset of assets) {
      // Check if belongs to our collection
      const grouping = asset.grouping?.find(
        (g: any) => g.group_key === 'collection' && g.group_value === COLLECTION_ADDRESS
      );
      if (!grouping) continue;

      // Extract card number from name "Shape Card #042" or metadata
      const name = asset.content?.metadata?.name || '';
      const match = name.match(/#(\d+)/);
      const cardNumber = match ? parseInt(match[1], 10) : null;

      if (cardNumber) {
        cards.push({
          cardNumber,
          assetId: asset.id,
          name,
        });
      }
    }

    return NextResponse.json({
      wallet,
      collection: COLLECTION_ADDRESS,
      cards,
      count: cards.length,
    }, {
      headers: { 'Cache-Control': 'public, max-age=30' },
    });
  } catch (err: any) {
    console.error('[nft/owned] DAS error:', err.message);

    // If DAS not supported, return helpful error
    if (err.message?.includes('Method not found') || err.message?.includes('-32601')) {
      return NextResponse.json({
        error: 'DAS API not available. Set DAS_RPC_URL to a Helius/Triton endpoint.',
        hint: 'Get free key at https://helius.dev',
      }, { status: 501 });
    }

    return NextResponse.json({ error: 'Failed to fetch on-chain assets' }, { status: 500 });
  }
}

/** Paginated fetch of all assets owned by wallet */
async function fetchAllAssets(wallet: string): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  const limit = 1000;

  while (true) {
    const res = await fetch(DAS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `owned-${page}`,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: wallet,
          page,
          limit,
          displayOptions: { showCollectionMetadata: false },
        },
      }),
    });

    const json = await res.json();
    if (json.error) {
      throw new Error(json.error.message || JSON.stringify(json.error));
    }

    const items = json.result?.items || [];
    all.push(...items);

    if (items.length < limit) break;
    page++;
  }

  return all;
}
