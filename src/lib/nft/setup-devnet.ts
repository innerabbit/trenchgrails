/**
 * One-time devnet setup: airdrop SOL, create Merkle tree, create collection with BubblegumV2 plugin.
 *
 * Usage:
 *   MINT_AUTHORITY_SECRET_KEY=... npx tsx src/lib/nft/setup-devnet.ts
 *
 * Outputs MERKLE_TREE_ADDRESS and NEXT_PUBLIC_COLLECTION_ADDRESS for .env.local
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore, createCollection } from '@metaplex-foundation/mpl-core';
import { mplBubblegum, createTreeV2 } from '@metaplex-foundation/mpl-bubblegum';
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
  sol,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';

const DEVNET_RPC = 'https://api.devnet.solana.com';

async function main() {
  const secretKey = process.env.MINT_AUTHORITY_SECRET_KEY;
  if (!secretKey) throw new Error('MINT_AUTHORITY_SECRET_KEY required');

  const umi = createUmi(DEVNET_RPC, 'confirmed')
    .use(mplCore())
    .use(mplBubblegum());

  const secretKeyBytes = bs58.decode(secretKey);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));

  console.log('Authority:', signer.publicKey.toString());

  // 1. Airdrop SOL
  console.log('\n--- Step 1: Airdrop 2 SOL ---');
  try {
    await umi.rpc.airdrop(signer.publicKey, sol(2));
    console.log('Airdrop requested. Waiting 5s...');
    await new Promise((r) => setTimeout(r, 5000));
  } catch (err: any) {
    console.warn('Airdrop failed (may already have SOL):', err.message);
  }

  const balance = await umi.rpc.getBalance(signer.publicKey);
  console.log('Balance:', Number(balance.basisPoints) / 1e9, 'SOL');

  // 2. Create Merkle tree
  console.log('\n--- Step 2: Create Merkle tree ---');
  const merkleTree = generateSigner(umi);
  const maxDepth = 14;
  const maxBufferSize = 64;
  const canopyDepth = 10;

  console.log(`  Capacity: ${2 ** maxDepth} cNFTs`);
  console.log(`  Tree: ${merkleTree.publicKey.toString()}`);

  const treeBuilder = await createTreeV2(umi, {
    merkleTree,
    maxDepth,
    maxBufferSize,
    canopyDepth,
    public: false,
  });
  await treeBuilder.sendAndConfirm(umi);
  console.log('Merkle tree created!');

  // 3. Create collection with BubblegumV2 plugin
  console.log('\n--- Step 3: Create collection ---');
  const collection = generateSigner(umi);
  await createCollection(umi, {
    collection,
    name: 'Shape Cards (Devnet)',
    uri: 'https://theshapegame.app/api/nft/metadata/1',
    plugins: [{ type: 'BubblegumV2' }],
  }).sendAndConfirm(umi);
  console.log('Collection created:', collection.publicKey.toString());

  // Output
  console.log('\n========================================');
  console.log('Copy these into .env.local:');
  console.log('========================================');
  console.log(`SOLANA_RPC_URL=https://api.devnet.solana.com`);
  console.log(`MERKLE_TREE_ADDRESS=${merkleTree.publicKey.toString()}`);
  console.log(`NEXT_PUBLIC_COLLECTION_ADDRESS=${collection.publicKey.toString()}`);
  console.log(`MIN_MINT_BALANCE_LAMPORTS=0`);
  console.log(`HOLDING_PERIOD_MINUTES=0`);
  console.log(`MINT_COOLDOWN_MINUTES=0`);
  console.log('========================================');
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
