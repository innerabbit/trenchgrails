/**
 * Create ONLY the Token Metadata collection NFT (tree already exists).
 *
 * Tree address: CnKrpXQvCuSaG6uCzHoxpK7tfmdSgh8zgekrBWHkUqbd
 *
 * Usage:
 *   MINT_AUTHORITY_SECRET_KEY=... npx tsx src/lib/nft/setup-v1-collection-only.ts
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';
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

  // Token Metadata collection NFT (classic Metaplex standard — ME compatible)
  console.log('\n--- Creating Token Metadata collection NFT ---');
  const col = generateSigner(umi);
  await createNft(umi, {
    mint: col,
    name: 'The Shape Game',
    symbol: 'SHAPE',
    uri: 'https://theshapegame.app/api/nft/collection-metadata',
    sellerFeeBasisPoints: percentAmount(5),
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
  console.log('MERKLE_TREE_ADDRESS=CnKrpXQvCuSaG6uCzHoxpK7tfmdSgh8zgekrBWHkUqbd');
  console.log(`NEXT_PUBLIC_COLLECTION_ADDRESS=${col.publicKey.toString()}`);
  console.log('========================================');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
