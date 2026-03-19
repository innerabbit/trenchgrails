import {
  publicKey,
  transactionBuilder,
  type Umi,
} from '@metaplex-foundation/umi';
import {
  mintToCollectionV1,
  findLeafAssetIdPda,
  parseLeafFromMintToCollectionV1Transaction,
  type MetadataArgsArgs,
} from '@metaplex-foundation/mpl-bubblegum';
import { COLLECTION_ADDRESS, MERKLE_TREE_ADDRESS, METADATA_BASE_URL } from './config';
import type { BoosterCard } from './pick-booster';
import bs58 from 'bs58';

export interface MintResult {
  /** cNFT asset IDs (derived from leaf schema) */
  assetIds: string[];
  /** Transaction signatures */
  signatures: string[];
  /** Metadata used for each mint (needed for verifyCreator) */
  metadatas: MetadataArgsArgs[];
}

/**
 * Mint compressed NFTs (cNFTs) via Bubblegum V1 with Token Metadata collection.
 * Server fully signs and sends — no client signing needed.
 *
 * Strategy: try all 3 cards in ONE transaction first (fastest, fits in 10s Vercel timeout).
 * If that fails (tx too large), fall back to individual transactions.
 */
export async function mintCompressedCards(
  umi: Umi,
  walletAddress: string,
  cards: BoosterCard[],
): Promise<MintResult> {
  if (!COLLECTION_ADDRESS) {
    throw new Error('NEXT_PUBLIC_COLLECTION_ADDRESS env var is required');
  }
  if (!MERKLE_TREE_ADDRESS) {
    throw new Error('MERKLE_TREE_ADDRESS env var is required');
  }

  const collectionMint = publicKey(COLLECTION_ADDRESS);
  const merkleTreePk = publicKey(MERKLE_TREE_ADDRESS);
  const leafOwner = publicKey(walletAddress);

  // Try batch mint (all cards in one transaction)
  try {
    return await mintBatch(umi, cards, collectionMint, merkleTreePk, leafOwner);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[mint] Batch mint failed, falling back to individual:', msg);
    return await mintIndividual(umi, cards, collectionMint, merkleTreePk, leafOwner);
  }
}

/** Mint all cards in a single transaction */
async function mintBatch(
  umi: Umi,
  cards: BoosterCard[],
  collectionMint: ReturnType<typeof publicKey>,
  merkleTreePk: ReturnType<typeof publicKey>,
  leafOwner: ReturnType<typeof publicKey>,
): Promise<MintResult> {
  let builder = transactionBuilder();
  const metadatas: MetadataArgsArgs[] = [];

  for (const card of cards) {
    const metadata: MetadataArgsArgs = {
      name: `Trench Card #${String(card.card_number).padStart(3, '0')}`,
      symbol: 'TGRL',
      uri: `${METADATA_BASE_URL}/api/nft/metadata/${card.card_number}`,
      sellerFeeBasisPoints: 500,
      collection: { key: collectionMint, verified: false },
      creators: [
        {
          address: umi.identity.publicKey,
          verified: true,
          share: 100,
        },
      ],
    };
    metadatas.push(metadata);
    builder = builder.add(
      mintToCollectionV1(umi, {
        merkleTree: merkleTreePk,
        leafOwner,
        collectionMint,
        metadata,
      }),
    );
  }

  const result = await builder.sendAndConfirm(umi);
  const signature = bs58.encode(result.signature);

  // Parse all leaves from the batch transaction
  const assetIds: string[] = [];
  try {
    const leaf = await parseLeafFromMintToCollectionV1Transaction(umi, result.signature);
    const startNonce = Number(leaf.nonce) - (cards.length - 1);
    for (let i = 0; i < cards.length; i++) {
      const [assetId] = findLeafAssetIdPda(umi, {
        merkleTree: merkleTreePk,
        leafIndex: startNonce + i,
      });
      assetIds.push(assetId.toString());
    }
  } catch {
    // Fallback: use signature references
    for (let i = 0; i < cards.length; i++) {
      assetIds.push(`${signature}:${i}`);
    }
  }

  return { assetIds, signatures: [signature], metadatas };
}

/** Mint each card in a separate transaction (fallback) */
async function mintIndividual(
  umi: Umi,
  cards: BoosterCard[],
  collectionMint: ReturnType<typeof publicKey>,
  merkleTreePk: ReturnType<typeof publicKey>,
  leafOwner: ReturnType<typeof publicKey>,
): Promise<MintResult> {
  const assetIds: string[] = [];
  const signatures: string[] = [];
  const metadatas: MetadataArgsArgs[] = [];

  for (const card of cards) {
    const metadata: MetadataArgsArgs = {
      name: `Trench Card #${String(card.card_number).padStart(3, '0')}`,
      symbol: 'TGRL',
      uri: `${METADATA_BASE_URL}/api/nft/metadata/${card.card_number}`,
      sellerFeeBasisPoints: 500,
      collection: { key: collectionMint, verified: false },
      creators: [
        {
          address: umi.identity.publicKey,
          verified: true,
          share: 100,
        },
      ],
    };
    metadatas.push(metadata);

    const builder = transactionBuilder().add(
      mintToCollectionV1(umi, {
        merkleTree: merkleTreePk,
        leafOwner,
        collectionMint,
        metadata,
      }),
    );

    const result = await builder.sendAndConfirm(umi);
    const signature = bs58.encode(result.signature);
    signatures.push(signature);

    try {
      const leaf = await parseLeafFromMintToCollectionV1Transaction(umi, result.signature);
      const [assetId] = findLeafAssetIdPda(umi, {
        merkleTree: merkleTreePk,
        leafIndex: Number(leaf.nonce),
      });
      assetIds.push(assetId.toString());
    } catch {
      assetIds.push(`${signature}:0`);
    }
  }

  return { assetIds, signatures, metadatas };
}
