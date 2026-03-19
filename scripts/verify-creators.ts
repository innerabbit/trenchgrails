#!/usr/bin/env npx tsx
/**
 * verify-creators.ts
 *
 * Verifies the creator on existing cNFTs minted via Bubblegum V1.
 * This fixes `creators[0].verified: false` → `true` which is required
 * for marketplace indexing (Magic Eden, Tensor).
 *
 * Usage:
 *   MINT_AUTHORITY_SECRET_KEY=... DAS_RPC_URL=... npx tsx src/lib/nft/verify-creators.ts
 *
 * The script:
 * 1. Fetches all cNFTs owned by any wallet in our collection via DAS
 * 2. For each cNFT with unverified creator, calls verifyCreator instruction
 * 3. Logs results
 *
 * Requires DAS-compatible RPC (Helius, Triton) for getAssetsByGroup + getAssetWithProof
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import {
  mplBubblegum,
  verifyCreator,
  getAssetWithProof,
} from '@metaplex-foundation/mpl-bubblegum';
import {
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
} from '@metaplex-foundation/umi';
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';
import bs58 from 'bs58';

const DAS_RPC_URL = process.env.DAS_RPC_URL || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const COLLECTION_ADDRESS = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS;
const SECRET_KEY = process.env.MINT_AUTHORITY_SECRET_KEY;

async function main() {
  if (!SECRET_KEY) throw new Error('MINT_AUTHORITY_SECRET_KEY required');
  if (!COLLECTION_ADDRESS) throw new Error('NEXT_PUBLIC_COLLECTION_ADDRESS required');

  console.log('🔧 Verify creators on cNFTs');
  console.log(`   Collection: ${COLLECTION_ADDRESS}`);
  console.log(`   DAS RPC: ${DAS_RPC_URL}`);

  // Set up UMI with DAS API plugin
  const umi = createUmi(DAS_RPC_URL, 'confirmed')
    .use(mplTokenMetadata())
    .use(mplBubblegum())
    .use(dasApi());

  const secretKeyBytes = bs58.decode(SECRET_KEY);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));

  console.log(`   Creator/Signer: ${signer.publicKey}`);

  // Fetch all cNFTs in our collection via DAS getAssetsByGroup
  console.log('\n📡 Fetching collection assets via DAS...');
  const assets = await fetchCollectionAssets();

  if (assets.length === 0) {
    console.log('⚠️  No assets found in collection');
    return;
  }

  console.log(`   Found ${assets.length} cNFTs in collection`);

  // Filter to assets with unverified creator
  const unverified = assets.filter((asset: any) => {
    const creators = asset.creators || [];
    return creators.some(
      (c: any) => c.address === signer.publicKey.toString() && !c.verified
    );
  });

  if (unverified.length === 0) {
    console.log('✅ All creators already verified!');
    return;
  }

  console.log(`   ${unverified.length} cNFTs need creator verification\n`);

  // Verify each
  let success = 0;
  let failed = 0;

  for (const asset of unverified) {
    const assetId = asset.id;
    const name = asset.content?.metadata?.name || assetId;

    try {
      console.log(`🔄 Verifying creator on "${name}" (${assetId})...`);

      // Get proof from DAS (required for compressed NFT operations)
      const assetWithProof = await getAssetWithProof(umi, publicKey(assetId));

      // Call verifyCreator instruction
      await verifyCreator(umi, {
        ...assetWithProof,
        creator: signer,
      }).sendAndConfirm(umi);

      console.log(`   ✅ Verified!`);
      success++;
    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${success} verified, ${failed} failed out of ${unverified.length}`);
}

/** Fetch all assets in our collection via DAS getAssetsByGroup */
async function fetchCollectionAssets(): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  const limit = 1000;

  while (true) {
    const res = await fetch(DAS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `group-${page}`,
        method: 'getAssetsByGroup',
        params: {
          groupKey: 'collection',
          groupValue: COLLECTION_ADDRESS,
          page,
          limit,
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

main().catch((err) => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
