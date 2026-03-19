/**
 * Update the mainnet collection metadata URI
 * Run: npx tsx src/lib/nft/update-collection.ts
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { keypairIdentity, publicKey } from '@metaplex-foundation/umi';
import { updateCollection } from '@metaplex-foundation/mpl-core';
import bs58 from 'bs58';

const COLLECTION_ADDRESS = '6fmDmSKhyx7AJFZk1z3fpV2p4NRMiaiAMY9Z2fC5Vk6X';
const NEW_URI = 'https://theshapegame.app/api/nft/collection-metadata';
const RPC_URL = 'https://api.mainnet-beta.solana.com';

async function main() {
  // Load mint authority from env
  const secretKey = process.env.MINT_AUTHORITY_SECRET_KEY;
  if (!secretKey) throw new Error('MINT_AUTHORITY_SECRET_KEY not set');

  const umi = createUmi(RPC_URL);

  // Create keypair from secret
  const secretBytes = bs58.decode(secretKey);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretBytes);
  umi.use(keypairIdentity(keypair));

  console.log('Authority:', keypair.publicKey);
  console.log('Collection:', COLLECTION_ADDRESS);
  console.log('New URI:', NEW_URI);

  const tx = await updateCollection(umi, {
    collection: publicKey(COLLECTION_ADDRESS),
    name: 'The Shape Game',
    uri: NEW_URI,
  }).sendAndConfirm(umi);

  console.log('✅ Collection updated!');
  console.log('Tx:', bs58.encode(tx.signature));
}

main().catch(console.error);
