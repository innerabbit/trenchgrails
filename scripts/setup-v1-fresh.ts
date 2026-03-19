/**
 * Fresh mainnet setup: Bubblegum V1 + Token Metadata collection
 *
 * Creates:
 *   1. V1 Merkle tree (depth 13 = 8,192 cNFTs, canopy 10 = Tensor-compatible)
 *   2. Token Metadata collection NFT (symbol: SHPG)
 *
 * Usage:
 *   MINT_AUTHORITY_SECRET_KEY=... npx tsx scripts/setup-v1-fresh.ts
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum, createTree } from '@metaplex-foundation/mpl-bubblegum';
import {
  mplTokenMetadata,
  createNft,
} from '@metaplex-foundation/mpl-token-metadata';
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
  percentAmount,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';

const RPC = 'https://api.mainnet-beta.solana.com';

async function main() {
  const secretKey = process.env.MINT_AUTHORITY_SECRET_KEY;
  if (!secretKey) throw new Error('MINT_AUTHORITY_SECRET_KEY required');

  const umi = createUmi(RPC, 'confirmed')
    .use(mplTokenMetadata())
    .use(mplBubblegum());

  const kp = umi.eddsa.createKeypairFromSecretKey(bs58.decode(secretKey));
  const signer = createSignerFromKeypair(umi, kp);
  umi.use(signerIdentity(signer));

  console.log('Authority:', signer.publicKey.toString());
  const bal = await umi.rpc.getBalance(signer.publicKey);
  console.log('Balance:', Number(bal.basisPoints) / 1e9, 'SOL');

  if (Number(bal.basisPoints) < 500_000_000) {
    throw new Error('Need at least 0.5 SOL for tree (depth 14, canopy 10) + collection');
  }

  // 1. Merkle tree — V1 (createTree)
  // depth 14 = 16,384 cNFTs, buffer 64, canopy 10 (Tensor: 14-10=4 ≤ 10 ✅)
  // Note: depth 13 + buffer 64 is not a valid combo on-chain; depth 14 + buffer 64 is valid
  console.log('\n--- Creating V1 Merkle tree (depth 14, buffer 64, canopy 10) ---');
  const tree = generateSigner(umi);
  console.log('Tree address:', tree.publicKey.toString());

  const treeTx = await createTree(umi, {
    merkleTree: tree,
    maxDepth: 14,
    maxBufferSize: 64,
    canopyDepth: 10,
    public: false, // only tree creator can mint
  });
  await treeTx.sendAndConfirm(umi);
  console.log('✅ V1 Tree created!');

  const balAfterTree = await umi.rpc.getBalance(signer.publicKey);
  console.log('Balance after tree:', Number(balAfterTree.basisPoints) / 1e9, 'SOL');

  // 2. Token Metadata collection NFT
  console.log('\n--- Creating Token Metadata collection NFT ---');
  const col = generateSigner(umi);
  await createNft(umi, {
    mint: col,
    name: 'The Shape Game',
    symbol: 'SHPG',
    uri: 'https://theshapegame.app/api/nft/collection-metadata',
    sellerFeeBasisPoints: percentAmount(5), // 5% royalties
    isCollection: true,
    creators: [
      {
        address: signer.publicKey,
        verified: true,
        share: 100,
      },
    ],
  }).sendAndConfirm(umi);
  console.log('✅ Collection created:', col.publicKey.toString());

  const bal2 = await umi.rpc.getBalance(signer.publicKey);
  console.log('\nRemaining balance:', Number(bal2.basisPoints) / 1e9, 'SOL');

  console.log('\n========================================');
  console.log('Set these on Vercel + .env.local:');
  console.log('========================================');
  console.log(`MERKLE_TREE_ADDRESS=${tree.publicKey.toString()}`);
  console.log(`NEXT_PUBLIC_COLLECTION_ADDRESS=${col.publicKey.toString()}`);
  console.log(`MINT_AUTHORITY_SECRET_KEY=${secretKey}`);
  console.log('========================================');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
