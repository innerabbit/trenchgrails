/**
 * Mainnet setup: create Merkle tree (depth 14, canopy 0, ~0.13 SOL) + collection with BubblegumV2.
 *
 * Usage:
 *   MINT_AUTHORITY_SECRET_KEY=... npx tsx src/lib/nft/setup-mainnet.ts
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore, createCollection } from '@metaplex-foundation/mpl-core';
import { mplBubblegum, createTreeV2 } from '@metaplex-foundation/mpl-bubblegum';
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';

const RPC = 'https://api.mainnet-beta.solana.com';

async function main() {
  const secretKey = process.env.MINT_AUTHORITY_SECRET_KEY;
  if (!secretKey) throw new Error('MINT_AUTHORITY_SECRET_KEY required');

  const umi = createUmi(RPC, 'confirmed')
    .use(mplCore())
    .use(mplBubblegum());

  const kp = umi.eddsa.createKeypairFromSecretKey(bs58.decode(secretKey));
  const signer = createSignerFromKeypair(umi, kp);
  umi.use(signerIdentity(signer));

  console.log('Authority:', signer.publicKey.toString());
  const bal = await umi.rpc.getBalance(signer.publicKey);
  console.log('Balance:', Number(bal.basisPoints) / 1e9, 'SOL');

  // 1. Merkle tree — depth 12 (4K cNFTs), canopy 0 (cheap)
  console.log('\n--- Creating Merkle tree (depth 12, canopy 0) ---');
  const tree = generateSigner(umi);
  console.log('Tree address:', tree.publicKey.toString());

  const tb = await createTreeV2(umi, {
    merkleTree: tree,
    maxDepth: 12,
    maxBufferSize: 32,
    canopyDepth: 0,
    public: false,
  });
  await tb.sendAndConfirm(umi);
  console.log('Tree created!');

  // 2. Collection with BubblegumV2 plugin
  console.log('\n--- Creating collection with BubblegumV2 ---');
  const col = generateSigner(umi);
  await createCollection(umi, {
    collection: col,
    name: 'Trench Grails',
    uri: 'https://trenchgrails.vercel.app/api/nft/metadata/1',
    plugins: [{ type: 'BubblegumV2' }],
  }).sendAndConfirm(umi);
  console.log('Collection created:', col.publicKey.toString());

  const bal2 = await umi.rpc.getBalance(signer.publicKey);
  console.log('\nRemaining balance:', Number(bal2.basisPoints) / 1e9, 'SOL');

  console.log('\n========================================');
  console.log('Set these on Vercel + .env.local:');
  console.log('========================================');
  console.log(`MERKLE_TREE_ADDRESS=${tree.publicKey.toString()}`);
  console.log(`NEXT_PUBLIC_COLLECTION_ADDRESS=${col.publicKey.toString()}`);
  console.log('========================================');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
