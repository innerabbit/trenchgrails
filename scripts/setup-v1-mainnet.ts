/**
 * Mainnet setup: Bubblegum V1 (Token Metadata collection) — compatible with Magic Eden.
 *
 * Creates:
 *   1. V1 Merkle tree (depth 14 = 16K cNFTs, canopy 0 = cheapest)
 *   2. Token Metadata collection NFT (classic Metaplex standard)
 *
 * Usage:
 *   MINT_AUTHORITY_SECRET_KEY=... npx tsx src/lib/nft/setup-v1-mainnet.ts
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

  // 1. Merkle tree — V1 (createTree, NOT createTreeV2)
  // depth 10 = 1,024 cNFTs (~341 boosters), buffer 32, canopy 0 (absolute cheapest)
  console.log('\n--- Creating V1 Merkle tree (depth 10, canopy 0) ---');
  const tree = generateSigner(umi);
  console.log('Tree address:', tree.publicKey.toString());

  const treeTx = await createTree(umi, {
    merkleTree: tree,
    maxDepth: 10,
    maxBufferSize: 32,
    canopyDepth: 0,
    public: false, // only tree creator can mint
  });
  await treeTx.sendAndConfirm(umi);
  console.log('✅ V1 Tree created!');

  // 2. Token Metadata collection NFT (classic Metaplex standard — ME compatible)
  console.log('\n--- Creating Token Metadata collection NFT ---');
  const col = generateSigner(umi);
  await createNft(umi, {
    mint: col,
    name: 'Trench Grails',
    symbol: 'TGRL',
    uri: 'https://trenchgrails.com/api/nft/collection-metadata',
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
  console.log('========================================');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
