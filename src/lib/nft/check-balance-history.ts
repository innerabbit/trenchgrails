import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Check if a wallet's SPL token balance dropped below the threshold
 * at any point during the holding period.
 *
 * Uses standard Solana RPC:
 * 1. getSignaturesForAddress → list of tx in the window
 * 2. getTransaction per tx → check preTokenBalances/postTokenBalances
 *
 * Returns { ok: true } if balance stayed above threshold,
 * or { ok: false, reason } if it dropped.
 */
export async function checkBalanceHistory(
  connection: Connection,
  walletAddress: string,
  sinceTimestamp: Date,
  tokenMint: PublicKey,
  minTokens: number,
): Promise<{ ok: boolean; reason?: string }> {
  const pubkey = new PublicKey(walletAddress);
  const mintStr = tokenMint.toBase58();

  // 1. Get recent transaction signatures for this wallet
  let signatures;
  try {
    signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: 50,
    });
  } catch (err) {
    // RPC error — fail open (allow mint, don't block on RPC issues)
    console.warn('[balance-history] getSignaturesForAddress failed:', err);
    return { ok: true };
  }

  // Filter to transactions within the holding period
  const sinceUnix = Math.floor(sinceTimestamp.getTime() / 1000);
  const relevantSigs = signatures.filter(
    (s) => s.blockTime && s.blockTime >= sinceUnix,
  );

  if (relevantSigs.length === 0) {
    // No transactions during holding period — balance never changed
    return { ok: true };
  }

  // 2. Check each transaction for token balance drops
  for (const sig of relevantSigs) {
    let tx;
    try {
      tx = await connection.getTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });
    } catch {
      // Skip failed RPC calls — fail open
      continue;
    }

    if (!tx?.meta) continue;

    // Find wallet's index in accountKeys
    const staticKeys = tx.transaction.message.staticAccountKeys;
    let walletIndex = -1;
    for (let i = 0; i < staticKeys.length; i++) {
      if (staticKeys[i]?.toBase58() === walletAddress) {
        walletIndex = i;
        break;
      }
    }

    if (walletIndex === -1) continue;

    // Check preTokenBalances and postTokenBalances for this wallet + mint
    const preTokenBal = tx.meta.preTokenBalances?.find(
      (b) => b.owner === walletAddress && b.mint === mintStr,
    );
    const postTokenBal = tx.meta.postTokenBalances?.find(
      (b) => b.owner === walletAddress && b.mint === mintStr,
    );

    // If neither pre nor post has this token, tx didn't affect it — skip
    if (!preTokenBal && !postTokenBal) continue;

    const preAmount = Number(preTokenBal?.uiTokenAmount?.uiAmount || 0);
    const postAmount = Number(postTokenBal?.uiTokenAmount?.uiAmount || 0);

    if (preAmount < minTokens || postAmount < minTokens) {
      return {
        ok: false,
        reason: `Token balance dropped below ${minTokens.toLocaleString()} during holding period (tx: ${sig.signature.slice(0, 8)}...)`,
      };
    }
  }

  return { ok: true };
}
