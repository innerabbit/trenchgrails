/**
 * One-time script to create the Metaplex Core Collection on devnet.
 *
 * Usage:
 *   npx tsx scripts/create-collection.ts
 *
 * Required env vars:
 *   SOLANA_RPC_URL (defaults to devnet)
 *   MINT_AUTHORITY_SECRET_KEY (base58 encoded keypair)
 *
 * Output: Collection mint address to add to .env as NEXT_PUBLIC_COLLECTION_ADDRESS
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore, createCollection } from '@metaplex-foundation/mpl-core';
import { createSignerFromKeypair, generateSigner, signerIdentity } from '@metaplex-foundation/umi';
import bs58 from 'bs58';
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const secretKey = process.env.MINT_AUTHORITY_SECRET_KEY;

  if (!secretKey) {
    console.error('Error: MINT_AUTHORITY_SECRET_KEY env var is required');
    console.error('Generate one with: solana-keygen new --outfile mint-authority.json');
    console.error('Then base58-encode the secret key');
    process.exit(1);
  }

  console.log(`Connecting to ${rpcUrl}...`);
  const umi = createUmi(rpcUrl, 'finalized').use(mplCore());

  const secretKeyBytes = bs58.decode(secretKey);
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKeyBytes);
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(signerIdentity(signer));

  console.log(`Authority: ${signer.publicKey}`);

  // Check balance
  const balance = await umi.rpc.getBalance(signer.publicKey);
  console.log(`Balance: ${Number(balance.basisPoints) / 1e9} SOL`);

  if (Number(balance.basisPoints) < 10_000_000) {
    console.error('Need at least 0.01 SOL to create the collection.');
    process.exit(1);
  }

  // Create collection
  const collectionSigner = generateSigner(umi);
  console.log(`Creating collection: ${collectionSigner.publicKey}...`);

  await createCollection(umi, {
    collection: collectionSigner,
    name: 'Trench Grails',
    uri: '', // Will be set later with collection-level metadata
  }).sendAndConfirm(umi);

  console.log('\n✅ Collection created!');
  console.log(`\nCollection Address: ${collectionSigner.publicKey}`);
  console.log(`\nAdd to .env.local:`);
  console.log(`NEXT_PUBLIC_COLLECTION_ADDRESS=${collectionSigner.publicKey}`);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
