/**
 * End-to-end devnet test:
 * 1. Create a temporary MPL Core collection on devnet
 * 2. Mint 3 cNFTs to a test wallet using Bubblegum V2
 * 3. Verify asset IDs
 *
 * Usage:
 *   MINT_AUTHORITY_SECRET_KEY=... npx tsx src/lib/nft/test-devnet-mint.ts
 */
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { mplCore, createCollection } from '@metaplex-foundation/mpl-core';
import { mplBubblegum, mintV2, findLeafAssetIdPda, parseLeafFromMintV2Transaction } from '@metaplex-foundation/mpl-bubblegum';
import {
  createSignerFromKeypair,
  generateSigner,
  signerIdentity,
  publicKey,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const DEVNET_TREE = '9pUYT7brsw35zVx5PQ5H3fXaVz3D1SaABPMGRd3TniJV';

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

  // 1. Create a temporary collection on devnet
  console.log('\n--- Step 1: Creating devnet collection ---');
  const collection = generateSigner(umi);
  await createCollection(umi, {
    collection,
    name: 'Shape Cards Test',
    uri: 'https://theshapegame.app/api/nft/metadata/1',
    plugins: [{ type: 'BubblegumV2' }],
  }).sendAndConfirm(umi);
  console.log('Collection (with BubblegumV2 plugin):', collection.publicKey.toString());

  // 2. Mint 3 cNFTs
  console.log('\n--- Step 2: Minting 3 cNFTs ---');
  const merkleTreePk = publicKey(DEVNET_TREE);
  const testWallet = signer.publicKey; // Mint to ourselves for testing

  let builder = transactionBuilder();
  const cardNumbers = [1, 5, 12];

  for (const num of cardNumbers) {
    builder = builder.add(
      mintV2(umi, {
        merkleTree: merkleTreePk,
        leafOwner: testWallet,
        coreCollection: collection.publicKey,
        metadata: {
          name: `Shape Card #${String(num).padStart(3, '0')}`,
          uri: `https://theshapegame.app/api/nft/metadata/${num}`,
          sellerFeeBasisPoints: 500,
          creators: [
            { address: signer.publicKey, verified: true, share: 100 },
          ],
          collection: collection.publicKey,
        },
      }),
    );
  }

  const result = await builder.sendAndConfirm(umi);
  const signature = bs58.encode(result.signature);
  console.log('TX Signature:', signature);

  // 3. Parse asset IDs
  console.log('\n--- Step 3: Parsing asset IDs ---');
  // Wait for finalization
  await new Promise(r => setTimeout(r, 3000));

  try {
    const leaf = await parseLeafFromMintV2Transaction(umi, result.signature);
    const firstNonce = Number(leaf.nonce);
    console.log('First leaf nonce:', firstNonce);

    for (let i = 0; i < cardNumbers.length; i++) {
      const [assetId] = findLeafAssetIdPda(umi, {
        merkleTree: merkleTreePk,
        leafIndex: firstNonce + i,
      });
      console.log(`Card #${String(cardNumbers[i]).padStart(3, '0')}: ${assetId.toString()}`);
    }
  } catch (err: any) {
    console.warn('Could not parse leaf (may need finalization):', err.message);
    console.log('Check tx on Solscan: https://solscan.io/tx/' + signature + '?cluster=devnet');
  }

  console.log('\n✅ Devnet test complete!');
  console.log(`View tx: https://solscan.io/tx/${signature}?cluster=devnet`);
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
