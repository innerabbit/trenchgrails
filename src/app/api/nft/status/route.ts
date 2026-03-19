import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { TOKEN_MINT_ADDRESS, MIN_TOKEN_BALANCE, MINT_COOLDOWN_MINUTES, HOLDING_PERIOD_MINUTES } from '@/lib/nft/config';

/**
 * GET /api/nft/status
 * Returns mint eligibility status for the authenticated user.
 * Shows token balance, cooldown timer, and whether they can mint.
 */
export async function GET() {
  // 1. Auth check
  let walletAddress: string | null = null;
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createAdminClient();
      const { data: appUser } = await admin
        .from('users')
        .select('wallet_address')
        .eq('supabase_auth_id', user.id)
        .single();
      walletAddress = appUser?.wallet_address ?? null;
    }
  } catch {
    // Not authenticated
  }

  if (!walletAddress) {
    return NextResponse.json({
      canMint: false,
      reason: 'not_authenticated',
      requiredBalance: MIN_TOKEN_BALANCE,
      cooldownMinutes: MINT_COOLDOWN_MINUTES,
    });
  }

  // 2. SPL token balance check
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const walletPubkey = new PublicKey(walletAddress);
  const tokenMint = new PublicKey(TOKEN_MINT_ADDRESS);

  let tokenBalance = 0;
  try {
    const ata = getAssociatedTokenAddressSync(tokenMint, walletPubkey);
    const accountInfo = await connection.getTokenAccountBalance(ata);
    tokenBalance = Number(accountInfo.value.uiAmount || 0);
  } catch {
    // Account doesn't exist or RPC error — treat as 0
  }

  const hasEnoughBalance = tokenBalance >= MIN_TOKEN_BALANCE;

  // 3. Holding period + cooldown check
  const admin = createAdminClient();

  // Record wallet as seen with sufficient balance (or reset if balance dropped)
  let firstSeenAt: string | null = null;
  if (hasEnoughBalance) {
    const { data: seenAt } = await admin.rpc('record_wallet_seen', {
      p_wallet: walletAddress,
      p_balance: tokenBalance,
    });
    firstSeenAt = seenAt;
  } else {
    // Balance below threshold — reset holding period
    await admin.rpc('reset_holding_period', { p_wallet: walletAddress });
  }

  const { data: cooldown } = await admin
    .from('mint_cooldowns')
    .select('last_mint_at, total_mints, first_seen_at, snapshot_balance')
    .eq('wallet_address', walletAddress)
    .single();

  let canMint = hasEnoughBalance;
  let nextMintAt: string | null = null;
  let secondsRemaining = 0;
  const totalMints = cooldown?.total_mints ?? 0;

  // Check holding period
  let holdingComplete = false;
  let holdingSecondsRemaining = 0;
  const holdingFirstSeen = cooldown?.first_seen_at || firstSeenAt;

  if (holdingFirstSeen) {
    const seenDate = new Date(holdingFirstSeen);
    const holdingEnd = new Date(seenDate.getTime() + HOLDING_PERIOD_MINUTES * 60 * 1000);
    const now = new Date();

    if (holdingEnd > now) {
      holdingComplete = false;
      holdingSecondsRemaining = Math.ceil((holdingEnd.getTime() - now.getTime()) / 1000);
      canMint = false;
    } else {
      holdingComplete = true;
    }
  } else {
    // No first_seen_at — holding period not started
    canMint = false;
  }

  // Check cooldown (only matters if holding is complete)
  if (cooldown?.last_mint_at) {
    const lastMint = new Date(cooldown.last_mint_at);
    const cooldownEnd = new Date(lastMint.getTime() + MINT_COOLDOWN_MINUTES * 60 * 1000);
    const now = new Date();

    if (cooldownEnd > now) {
      canMint = false;
      nextMintAt = cooldownEnd.toISOString();
      secondsRemaining = Math.ceil((cooldownEnd.getTime() - now.getTime()) / 1000);
    }
  }

  if (!hasEnoughBalance) {
    canMint = false;
  }

  return NextResponse.json({
    canMint,
    nextMintAt,
    secondsRemaining,
    requiredBalance: MIN_TOKEN_BALANCE,
    currentBalance: tokenBalance,
    hasEnoughBalance,
    totalMints,
    cooldownMinutes: MINT_COOLDOWN_MINUTES,
    holdingPeriodMinutes: HOLDING_PERIOD_MINUTES,
    holdingComplete,
    holdingSecondsRemaining,
    holdingFirstSeenAt: holdingFirstSeen || null,
    walletAddress,
  });
}
