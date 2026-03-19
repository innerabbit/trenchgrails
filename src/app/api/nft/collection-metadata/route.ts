import { NextResponse } from 'next/server';

/**
 * GET /api/nft/collection-metadata
 * Returns Metaplex-standard collection metadata JSON.
 * Used as the URI for the on-chain collection NFT.
 */
export async function GET() {
  const metadata = {
    name: 'Trench Grails',
    symbol: 'TGRL',
    description:
      'NFT card game on Solana. Collect heroes, artifacts, and lands — each card is a unique compressed NFT. Hold SOL, open free boosters, build your deck, and battle.',
    image: 'https://trenchgrails.vercel.app/collection-image.png',
    external_url: 'https://trenchgrails.vercel.app',
    properties: {
      category: 'game',
      creators: [
        {
          address: 'EskHzPns8Epq9ruQ36F5ogCdWvQWTxFDw4cbiwfuDPFS',
          share: 100,
        },
      ],
    },
  };

  return NextResponse.json(metadata, {
    headers: {
      'Cache-Control': 'public, max-age=86400',
      'Content-Type': 'application/json',
    },
  });
}
