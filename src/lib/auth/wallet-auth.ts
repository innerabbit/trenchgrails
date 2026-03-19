import type { WalletContextState } from '@solana/wallet-adapter-react';

export interface AppUser {
  id: string;
  wallet_address: string | null;
  twitter_id: string | null;
  twitter_handle: string | null;
  supabase_auth_id: string;
  free_pack_claimed: boolean;
  free_pack_claimed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Sign in with a Solana wallet:
 * 1. Request nonce from server
 * 2. Sign message with wallet
 * 3. Send signature to server for verification + session creation
 */
export async function signInWithWallet(
  wallet: WalletContextState,
): Promise<{ user: AppUser } | { error: string }> {
  const { publicKey, signMessage } = wallet;

  if (!publicKey || !signMessage) {
    return { error: 'Wallet not connected or does not support message signing' };
  }

  const walletAddress = publicKey.toBase58();

  // 1. Get nonce
  const nonceRes = await fetch('/api/auth/wallet/nonce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress }),
  });

  if (!nonceRes.ok) {
    const err = await nonceRes.json();
    return { error: err.error || 'Failed to get nonce' };
  }

  const { message } = await nonceRes.json();

  // 2. Sign message
  let signature: Uint8Array;
  try {
    signature = await signMessage(new TextEncoder().encode(message));
  } catch {
    return { error: 'User rejected signature request' };
  }

  // 3. Verify and create session
  const verifyRes = await fetch('/api/auth/wallet/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      walletAddress,
      signature: Array.from(signature),
      message,
    }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    return { error: err.error || 'Verification failed' };
  }

  const data = await verifyRes.json();
  return { user: data.user };
}
