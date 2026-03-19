/**
 * One-time script to create a Bubblegum V2 Merkle tree for compressed NFTs.
 *
 * Usage:
 *   MINT_AUTHORITY_SECRET_KEY=... SOLANA_RPC_URL=... npx tsx src/lib/nft/setup-tree.ts
 *
 * Outputs the tree address to use as MERKLE_TREE_ADDRESS env var.
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, createTreeV2 } from '@metaplex-foundation/mpl-bubblegum';
import { mplCore } from '@metaplex-foundation/mpl-core';
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const secretKey = process.env.MINT_AUTHORITY_SECRET_KEY;

  if (!rpcUrl) {
    throw new Error('SOLANA_RPC_URL env var is required');
  }
  if (!secretKey) {
    throw new Error('MINT_AUTHORITY_SECRET_KEY env var is required');
  }

  const umi = createUmi(rpcUrl, 'confirmed')
    .use(mplCore())
    .use(mplBubblegum());

  const secretKeyBytes = bs58.decode(secretKey);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));

  console.log('Authority:', signer.publicKey.toString());

  // Depth 14 = 16,384 cNFTs capacity (~2,730 packs of 3 + 3 per pack)
  // Buffer size 64 = supports concurrent mints
  // Canopy depth 10 = good marketplace composability (maxDepth - canopyDepth ≤ 10)
  const maxDepth = 14;
  const maxBufferSize = 64;
  const canopyDepth = 10;

  const merkleTree = generateSigner(umi);

  console.log('Creating Merkle tree...');
  console.log(`  Max depth: ${maxDepth} (capacity: ${2 ** maxDepth} cNFTs)`);
  console.log(`  Buffer size: ${maxBufferSize}`);
  console.log(`  Canopy depth: ${canopyDepth}`);
  console.log(`  Tree address: ${merkleTree.publicKey.toString()}`);

  const builder = await createTreeV2(umi, {
    merkleTree,
    maxDepth,
    maxBufferSize,
    canopyDepth,
    public: false, // Only tree creator/delegate can mint
  });

  const tx = await builder.sendAndConfirm(umi);
  const sig = bs58.encode(tx.signature);

  console.log('\n✅ Merkle tree created!');
  console.log(`  Signature: ${sig}`);
  console.log(`  Tree address: ${merkleTree.publicKey.toString()}`);
  console.log(`\nSet this env var:`);
  console.log(`  MERKLE_TREE_ADDRESS=${merkleTree.publicKey.toString()}`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
