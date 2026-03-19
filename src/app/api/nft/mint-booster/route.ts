import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabase } from '@/lib/supabase/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { getUmi } from '@/lib/nft/umi';
import { pickBoosterPack } from '@/lib/nft/pick-booster';
import { mintCompressedCards } from '@/lib/nft/build-mint-tx';
import { verifyCreatorsAfterMint } from '@/lib/nft/verify-after-mint';
import { TOKEN_MINT_ADDRESS, MIN_TOKEN_BALANCE, MINT_COOLDOWN_MINUTES, HOLDING_PERIOD_MINUTES } from '@/lib/nft/config';
import { checkBalanceHistory } from '@/lib/nft/check-balance-history';
import { randomUUID } from 'crypto';

export const maxDuration = 30; // Vercel function timeout

/**
 * POST /api/nft/mint-booster
 * 1. Verify auth + wallet
 * 2. Check SOL balance
 * 3. Atomic cooldown claim (prevents race condition)
 * 4. Pick 3 random cards (secure RNG, weighted rarity)
 * 5. Mint 3 compressed NFTs directly to user's wallet (server pays)
 * 6. Return asset IDs + signatures
 */
export async function POST() {
  try {
    const admin = createAdminClient();

    // 1. Auth
    let walletAddress: string | null = null;
    let userId: string | null = null;
    try {
      const supabase = await createServerSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: appUser } = await admin
          .from('users')
          .select('id, wallet_address')
          .eq('supabase_auth_id', user.id)
          .single();
        walletAddress = appUser?.wallet_address ?? null;
        userId = appUser?.id ?? null;
      }
    } catch {
      // Not authenticated
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 });
    }

    console.log('[nft/mint] Wallet:', walletAddress);

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
    } catch (err: any) {
      // Account doesn't exist = 0 balance
      if (err?.message?.includes('could not find account')) {
        tokenBalance = 0;
      } else {
        console.error('[nft/mint] Token balance check failed:', err);
        return NextResponse.json({ error: 'Failed to check token balance' }, { status: 503 });
      }
    }

    console.log('[nft/mint] Token balance:', tokenBalance, 'Required:', MIN_TOKEN_BALANCE);

    if (tokenBalance < MIN_TOKEN_BALANCE) {
      return NextResponse.json({
        error: `Insufficient token balance. Need ${MIN_TOKEN_BALANCE.toLocaleString()} tokens, have ${tokenBalance.toLocaleString()}`,
      }, { status: 403 });
    }

    // 3. Balance history check (anti-shuttle)
    const { data: cooldownRecord, error: cooldownQueryError } = await admin
      .from('mint_cooldowns')
      .select('first_seen_at')
      .eq('wallet_address', walletAddress)
      .single();

    if (cooldownQueryError) {
      console.error('[nft/mint] Cooldown query error:', cooldownQueryError.message);
    }

    if (!cooldownRecord?.first_seen_at) {
      return NextResponse.json({
        error: 'Holding period not started. Keep your balance above the minimum.',
      }, { status: 403 });
    }

    const firstSeen = new Date(cooldownRecord.first_seen_at);
    const holdingEnd = new Date(firstSeen.getTime() + HOLDING_PERIOD_MINUTES * 60 * 1000);

    if (holdingEnd > new Date()) {
      const secs = Math.ceil((holdingEnd.getTime() - Date.now()) / 1000);
      return NextResponse.json({
        error: 'Holding period active',
        holdingSecondsRemaining: secs,
      }, { status: 403 });
    }

    // Verify token balance didn't drop below threshold during holding period
    const historyCheck = await checkBalanceHistory(
      connection, walletAddress, firstSeen, tokenMint, MIN_TOKEN_BALANCE,
    );

    if (!historyCheck.ok) {
      // Reset holding period — they moved funds
      try {
        await admin.rpc('reset_holding_period', { p_wallet: walletAddress });
      } catch (e: any) {
        console.warn('[nft/mint] reset_holding_period RPC error (non-fatal):', e?.message);
      }
      return NextResponse.json({
        error: `Balance dropped during holding period. Timer reset. ${historyCheck.reason}`,
      }, { status: 403 });
    }

    // 4. Atomic cooldown + holding claim (prevents race condition)
    const { data: canMint, error: cooldownError } = await admin.rpc('try_claim_mint', {
      p_wallet: walletAddress,
      p_cooldown_minutes: MINT_COOLDOWN_MINUTES,
      p_holding_minutes: HOLDING_PERIOD_MINUTES,
    });

    if (cooldownError) {
      console.error('[nft/mint] Cooldown RPC error:', cooldownError.message);
      return NextResponse.json({ error: 'Cooldown check failed' }, { status: 500 });
    }

    if (!canMint) {
      // Get remaining cooldown time
      const { data: cd } = await admin
        .from('mint_cooldowns')
        .select('last_mint_at')
        .eq('wallet_address', walletAddress)
        .single();

      const lastMint = cd?.last_mint_at ? new Date(cd.last_mint_at) : new Date();
      const nextMintAt = new Date(lastMint.getTime() + MINT_COOLDOWN_MINUTES * 60 * 1000);

      return NextResponse.json({
        error: 'Cooldown active',
        nextMintAt: nextMintAt.toISOString(),
        secondsRemaining: Math.ceil((nextMintAt.getTime() - Date.now()) / 1000),
      }, { status: 429 });
    }

    // 5. Pick 3 cards
    const { data: allCards, error: cardsError } = await admin
      .from('cards')
      .select('*')
      .order('card_number');

    if (cardsError || !allCards || allCards.length < 3) {
      console.error('[nft/mint] Cards query error:', cardsError?.message, 'count:', allCards?.length);
      return NextResponse.json({ error: 'No cards available' }, { status: 500 });
    }

    const pack = pickBoosterPack(allCards);
    console.log('[nft/mint] Pack picked:', pack.map(c => c.card_number));

    // 6. Mint compressed NFTs directly (server signs and sends)
    let umi;
    try {
      umi = getUmi();
    } catch (err: any) {
      console.error('[nft/mint] getUmi() failed:', err?.message);
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    let result;
    try {
      result = await mintCompressedCards(umi, walletAddress, pack);
    } catch (err: any) {
      console.error('[nft/mint] Mint error:', err?.message, err?.stack);
      return NextResponse.json({ error: `Failed to mint: ${err?.message || 'unknown error'}` }, { status: 500 });
    }

    console.log('[nft/mint] Minted! Signatures:', result.signatures);

    // 7. Fire-and-forget: verify creator on each cNFT (non-blocking)
    const verifyTasks = result.assetIds.map((assetId, i) => ({
      assetId,
      leafOwner: walletAddress!,
      metadata: result.metadatas[i],
    }));
    verifyCreatorsAfterMint(umi, verifyTasks).catch(err => {
      console.error('[nft/mint] verifyCreator background error (non-fatal):', err?.message);
    });

    // 8. Save pack info to DB (non-fatal — minting already succeeded)
    const packId = randomUUID();
    try {
      const mintRows = pack.map((card, i) => ({
        user_id: userId,
        card_id: card.id,
        mint_address: result.assetIds[i],
        tx_signature: result.signatures[0],
        pack_id: packId,
      }));

      await admin.from('nft_mints').insert(mintRows);

      if (userId) {
        const userCardRows = pack.map((card) => ({
          user_id: userId,
          card_id: card.id,
          source: 'nft_booster',
          pack_id: packId,
          opened_at: new Date().toISOString(),
        }));
        await admin.from('user_cards').insert(userCardRows);
      }
    } catch (err: any) {
      // DB save failed but minting succeeded — log and continue
      console.error('[nft/mint] DB save error (non-fatal):', err?.message);
    }

    // Refresh leaderboard materialized view (fire-and-forget)
    admin.rpc('refresh_leaderboard').then(({ error: refreshErr }) => {
      if (refreshErr) console.error('[nft/mint] Leaderboard refresh error (non-fatal):', refreshErr.message);
    });

    // Calculate next mint time
    const nextMintAt = new Date(Date.now() + MINT_COOLDOWN_MINUTES * 60 * 1000);

    return NextResponse.json({
      assetIds: result.assetIds,
      signatures: result.signatures,
      cards: pack,
      packId,
      nextMintAt: nextMintAt.toISOString(),
    });
  } catch (err: any) {
    // Catch-all: ensures we always return JSON, never an empty response
    console.error('[nft/mint] Unhandled error:', err?.message, err?.stack);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
