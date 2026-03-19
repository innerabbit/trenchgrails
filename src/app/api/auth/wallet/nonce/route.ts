import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'walletAddress required' }, { status: 400 });
    }

    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

    const message = `Sign this message to login to The Shape Game.\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    const supabase = createAdminClient();

    // Upsert nonce (one per wallet, replace if exists)
    await supabase
      .from('auth_nonces')
      .upsert({
        wallet_address: walletAddress,
        nonce,
        expires_at: expiresAt,
      }, { onConflict: 'wallet_address' });

    // Clean expired nonces
    await supabase
      .from('auth_nonces')
      .delete()
      .lt('expires_at', new Date().toISOString());

    return NextResponse.json({ nonce, message });
  } catch {
    return NextResponse.json({ error: 'Failed to generate nonce' }, { status: 500 });
  }
}
