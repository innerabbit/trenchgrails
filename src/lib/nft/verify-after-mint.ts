import { publicKey, type Umi, type PublicKey as UmiPublicKey } from '@metaplex-foundation/umi';
import { verifyCreator, type MetadataArgsArgs } from '@metaplex-foundation/mpl-bubblegum';
import { MERKLE_TREE_ADDRESS } from './config';

interface AssetProof {
  root: Uint8Array;
  proof: string[];
  leaf_id: number;
}

/**
 * Fetch asset proof from DAS API (Helius) via raw RPC call.
 */
async function getAssetProofDAS(assetId: string): Promise<AssetProof | null> {
  const dasUrl = process.env.DAS_RPC_URL;
  if (!dasUrl) {
    console.warn('[verifyCreator] DAS_RPC_URL not set, skipping');
    return null;
  }

  const proofRes = await fetch(dasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'proof',
      method: 'getAssetProof',
      params: { id: assetId },
    }),
  });

  const proofData = await proofRes.json();
  if (!proofData.result) return null;

  const { root, proof, node_index } = proofData.result;

  return {
    root: bs58ToBytes(root),
    proof,
    leaf_id: Math.log2(node_index + 1) < 0 ? 0 : node_index, // DAS returns node_index
  };
}

/**
 * Get asset to find leaf_id (nonce)
 */
async function getAssetDAS(assetId: string): Promise<{ leafId: number } | null> {
  const dasUrl = process.env.DAS_RPC_URL;
  if (!dasUrl) return null;

  const res = await fetch(dasUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'asset',
      method: 'getAsset',
      params: { id: assetId },
    }),
  });

  const data = await res.json();
  if (!data.result?.compression) return null;

  return { leafId: data.result.compression.leaf_id };
}

function bs58ToBytes(str: string): Uint8Array {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes: number[] = [];
  for (const c of str) {
    let carry = alphabet.indexOf(c);
    if (carry < 0) throw new Error(`Invalid base58 char: ${c}`);
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const c of str) {
    if (c !== '1') break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

export interface VerifyCreatorTask {
  assetId: string;
  leafOwner: string;
  metadata: MetadataArgsArgs;
}

/**
 * Fire-and-forget: verify creator on freshly minted cNFTs.
 * DAS needs time to index, so we retry with delay.
 * Non-fatal — if this fails, mint is still valid.
 */
export async function verifyCreatorsAfterMint(
  umi: Umi,
  tasks: VerifyCreatorTask[],
  retries = 3,
  delayMs = 5000,
): Promise<void> {
  const merkleTree = publicKey(MERKLE_TREE_ADDRESS);

  for (const task of tasks) {
    // Skip placeholder IDs (signature:index format)
    if (task.assetId.includes(':')) continue;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Wait for DAS indexing
        await new Promise(r => setTimeout(r, delayMs));

        // Get proof
        const proofInfo = await getAssetProofDAS(task.assetId);
        if (!proofInfo) {
          console.warn(`[verifyCreator] No proof for ${task.assetId}, attempt ${attempt + 1}`);
          continue;
        }

        // Get asset leaf_id
        const asset = await getAssetDAS(task.assetId);
        if (!asset) {
          console.warn(`[verifyCreator] No asset data for ${task.assetId}, attempt ${attempt + 1}`);
          continue;
        }

        await verifyCreator(umi, {
          leafOwner: publicKey(task.leafOwner),
          merkleTree,
          creator: umi.identity,
          root: proofInfo.root,
          nonce: BigInt(asset.leafId),
          index: asset.leafId,
          metadata: task.metadata,
          proof: proofInfo.proof.map((p: string) => publicKey(p)),
        }).sendAndConfirm(umi);

        console.log(`[verifyCreator] ✅ Verified creator on ${task.assetId}`);
        break; // Success
      } catch (err: any) {
        console.warn(`[verifyCreator] Attempt ${attempt + 1} failed for ${task.assetId}:`, err?.message);
        if (attempt === retries - 1) {
          console.error(`[verifyCreator] ❌ Failed all retries for ${task.assetId}`);
        }
      }
    }
  }
}
