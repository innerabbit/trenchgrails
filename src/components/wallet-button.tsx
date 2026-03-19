'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';

export function WalletButton() {
  const { publicKey, disconnect, connecting, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { isAuthenticated, isSigningIn, signOut } = useAuth();

  const address = useMemo(() => {
    if (!publicKey) return null;
    const base58 = publicKey.toBase58();
    return `${base58.slice(0, 4)}...${base58.slice(-4)}`;
  }, [publicKey]);

  const handleClick = useCallback(() => {
    if (connected) {
      signOut().then(() => disconnect());
    } else {
      setVisible(true);
    }
  }, [connected, disconnect, setVisible, signOut]);

  const label = connecting
    ? 'Connecting...'
    : isSigningIn
    ? 'Signing in...'
    : null;

  return (
    <button
      onClick={handleClick}
      disabled={connecting || isSigningIn}
      className="xp-wallet-btn flex items-center gap-[6px] px-3 py-[2px] text-[11px]"
    >
      {label ? (
        <span>{label}</span>
      ) : connected ? (
        <>
          <span style={{ color: isAuthenticated ? '#22a846' : '#f59e0b', fontSize: 8 }}>&#9679;</span>
          <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{address}</span>
        </>
      ) : (
        <>
          <span>Connect Wallet</span>
        </>
      )}
    </button>
  );
}
