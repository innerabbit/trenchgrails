/**
 * Update the mainnet collection metadata (name, symbol, URI)
 * Uses Token Metadata (Bubblegum collection), NOT mpl-core
 * Run: MINT_AUTHORITY_SECRET_KEY=... npx tsx src/lib/nft/update-collection.ts
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import {
  mplTokenMetadata,
  updateV1,
  fetchMetadataFromSeeds,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createSignerFromKeypair,
  signerIdentity,
  publicKey,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';

const COLLECTION_MINT = 'EizZPeiRGTMbka7xhhhAJGbDDTDByCEY7bawuKhSMEcK';
const NEW_NAME = 'Trench Grails';
const NEW_SYMBOL = 'TGRL';
const NEW_URI = 'https://trenchgrails.com/api/nft/collection-metadata';
const RPC_URL = 'https://api.mainnet-beta.solana.com';

async function main() {
  const secretKey = process.env.MINT_AUTHORITY_SECRET_KEY;
  if (!secretKey) throw new Error('MINT_AUTHORITY_SECRET_KEY not set');

  const umi = createUmi(RPC_URL, 'confirmed').use(mplTokenMetadata());

  const kp = umi.eddsa.createKeypairFromSecretKey(bs58.decode(secretKey));
  const signer = createSignerFromKeypair(umi, kp);
  umi.use(signerIdentity(signer));

  console.log('Authority:', signer.publicKey.toString());
  console.log('Collection Mint:', COLLECTION_MINT);

  // Fetch current metadata
  const metadata = await fetchMetadataFromSeeds(umi, {
    mint: publicKey(COLLECTION_MINT),
  });
  console.log('\nCurrent name:', metadata.name);
  console.log('Current symbol:', metadata.symbol);
  console.log('Current URI:', metadata.uri);

  console.log('\n--- Updating to ---');
  console.log('New name:', NEW_NAME);
  console.log('New symbol:', NEW_SYMBOL);
  console.log('New URI:', NEW_URI);

  const tx = await updateV1(umi, {
    mint: publicKey(COLLECTION_MINT),
    data: {
      ...metadata,
      name: NEW_NAME,
      symbol: NEW_SYMBOL,
      uri: NEW_URI,
    },
  }).sendAndConfirm(umi);

  console.log('\n✅ Collection metadata updated!');
  console.log('Tx:', bs58.encode(tx.signature));
}

main().catch(console.error);
