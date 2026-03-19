import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

function createServerSupabaseForRoute() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookieStore).getAll();
        },
        async setAll(cookiesToSet) {
          try {
            const store = await cookieStore;
            cookiesToSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            // Ignore in read-only contexts
          }
        },
      },
    },
  );
}

export async function POST(request: Request) {
  try {
    const { walletAddress, signature, message } = await request.json();

    if (!walletAddress || !signature || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // 1. Verify nonce exists and is not expired
    const admin = createAdminClient();

    const { data: nonceRow } = await admin
      .from('auth_nonces')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (!nonceRow) {
      return NextResponse.json({ error: 'No nonce found. Request a new one.' }, { status: 401 });
    }

    if (new Date(nonceRow.expires_at) < new Date()) {
      await admin.from('auth_nonces').delete().eq('wallet_address', walletAddress);
      return NextResponse.json({ error: 'Nonce expired. Request a new one.' }, { status: 401 });
    }

    // Check nonce is in the message
    if (!message.includes(nonceRow.nonce)) {
      return NextResponse.json({ error: 'Invalid message' }, { status: 401 });
    }

    // 2. Verify ed25519 signature
    const publicKeyBytes = bs58.decode(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = typeof signature === 'string'
      ? bs58.decode(signature)
      : new Uint8Array(Object.values(signature));

    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Delete used nonce
    await admin.from('auth_nonces').delete().eq('wallet_address', walletAddress);

    // 4. Create or get Supabase auth user
    const email = `${walletAddress}@wallet.trenchgrails`;

    // Try to create first (works for new users)
    const { data: created } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { wallet_address: walletAddress },
    });

    let authUser = created?.user ?? null;

    // If already exists — look up via app users table + getUserById (no pagination issues)
    if (!authUser) {
      const { data: appRow } = await admin
        .from('users')
        .select('supabase_auth_id')
        .eq('wallet_address', walletAddress)
        .single();

      if (appRow?.supabase_auth_id) {
        const { data: { user } } = await admin.auth.admin.getUserById(appRow.supabase_auth_id);
        authUser = user;
      }

      // Final fallback: listUsers with high perPage
      if (!authUser) {
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
        authUser = users?.find(u => u.email === email) ?? null;
      }
    }

    if (!authUser) {
      return NextResponse.json({ error: 'Could not find or create auth user' }, { status: 500 });
    }

    // 5. Upsert app user row
    await admin.from('users').upsert({
      wallet_address: walletAddress,
      supabase_auth_id: authUser.id,
    }, { onConflict: 'wallet_address' });

    // 6. Generate magic link to establish session
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    if (linkErr || !linkData) {
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 });
    }

    // 7. Verify OTP on server client to set session cookies
    const serverSupabase = createServerSupabaseForRoute();

    const { data: session, error: otpErr } = await serverSupabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (otpErr) {
      return NextResponse.json({ error: `Session creation failed: ${otpErr.message}` }, { status: 500 });
    }

    // 8. Fetch the app user
    const { data: appUser } = await admin
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    return NextResponse.json({
      user: appUser,
      session: session.session ? { access_token: session.session.access_token } : null,
    });
  } catch (err) {
    console.error('Wallet verify error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
