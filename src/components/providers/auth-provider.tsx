'use client';

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { createClient } from '@/lib/supabase/client';
import { signInWithWallet, type AppUser } from '@/lib/auth/wallet-auth';

interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSigningIn: boolean;
  signOut: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isSigningIn: false,
  signOut: async () => {},
  refetchUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const supabaseRef = useRef(createClient());
  const authAttemptedRef = useRef<string | null>(null);
  // Gate auto-sign-in on Supabase's INITIAL_SESSION event — guarantees
  // the client has fully checked cookies/storage before we decide whether
  // to prompt for a wallet signature.
  const [sessionChecked, setSessionChecked] = useState(false);

  // Fetch app user by supabase auth id
  const fetchUserById = useCallback(async (authId: string) => {
    const { data } = await supabaseRef.current
      .from('users')
      .select('*')
      .eq('supabase_auth_id', authId)
      .single();
    return data as AppUser | null;
  }, []);

  // Public refetch — reads current session
  const refetchUser = useCallback(async () => {
    const { data: { session } } = await supabaseRef.current.auth.getSession();
    if (session) {
      const appUser = await fetchUserById(session.user.id);
      setUser(appUser);
    } else {
      setUser(null);
    }
  }, [fetchUserById]);

  // Listen for auth state changes — single source of truth
  useEffect(() => {
    const supabase = supabaseRef.current;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const appUser = await fetchUserById(session.user.id);
          setUser(appUser);
        } else {
          setUser(null);
        }

        // INITIAL_SESSION fires once after Supabase finishes checking
        // cookies/storage. Only after this can we safely decide whether
        // the user needs to sign a message.
        if (event === 'INITIAL_SESSION') {
          setSessionChecked(true);
          setIsLoading(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [fetchUserById]);

  // Auto sign-in when wallet connects
  useEffect(() => {
    const walletAddress = wallet.publicKey?.toBase58();

    // Wallet disconnected — sign out
    if (!wallet.connected || !walletAddress) {
      if (user) {
        supabaseRef.current.auth.signOut().then(() => {
          setUser(null);
          authAttemptedRef.current = null;
        });
      }
      return;
    }

    // Wait until Supabase has finished restoring session from cookies
    if (!sessionChecked) return;

    // Already signed in with this wallet, or already attempted
    if (user?.wallet_address === walletAddress) return;
    if (authAttemptedRef.current === walletAddress) return;
    if (isSigningIn) return;
    if (!wallet.signMessage) return;

    // Auto sign-in
    authAttemptedRef.current = walletAddress;
    setIsSigningIn(true);

    signInWithWallet(wallet).then((result) => {
      if ('user' in result) {
        setUser(result.user);
      } else {
        console.error('Wallet auth failed:', result.error);
      }
      setIsSigningIn(false);
    });
  }, [wallet.connected, wallet.publicKey, wallet.signMessage, user, isSigningIn, sessionChecked, wallet]);

  const signOut = useCallback(async () => {
    await supabaseRef.current.auth.signOut();
    setUser(null);
    authAttemptedRef.current = null;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isSigningIn,
        signOut,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
