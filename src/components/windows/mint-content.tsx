'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '@/hooks/use-auth';
import { BoosterOverlay } from '@/components/booster/booster-overlay';
import { useWindowManager } from '@/lib/stores/window-manager';

interface MintStatus {
  canMint: boolean;
  nextMintAt: string | null;
  secondsRemaining: number;
  requiredBalance: number;
  currentBalance: number;
  hasEnoughBalance: boolean;
  totalMints: number;
  cooldownMinutes: number;
  holdingPeriodMinutes: number;
  holdingComplete: boolean;
  holdingSecondsRemaining: number;
  holdingFirstSeenAt: string | null;
  walletAddress?: string;
  reason?: string;
}

type MintStage = 'idle' | 'minting' | 'done' | 'error';

export function MintContent() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { isAuthenticated } = useAuth();
  const openWindow = useWindowManager((s) => s.openWindow);

  const [status, setStatus] = useState<MintStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [holdingCountdown, setHoldingCountdown] = useState(0);
  const [stage, setStage] = useState<MintStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [mintedCards, setMintedCards] = useState<any[] | null>(null);
  const [showBooster, setShowBooster] = useState(false);
  const [txSignatures, setTxSignatures] = useState<string[]>([]);
  const [packOpened, setPackOpened] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/nft/status');
      const data: MintStatus = await res.json();
      setStatus(data);
      setCountdown(data.secondsRemaining);
      setHoldingCountdown(data.holdingSecondsRemaining || 0);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connected && isAuthenticated) {
      fetchStatus();
    } else {
      setLoading(false);
      setStatus(null);
    }
  }, [connected, isAuthenticated, fetchStatus]);

  // Countdown timer
  useEffect(() => {
    const activeCountdown = countdown > 0 || holdingCountdown > 0;
    if (!activeCountdown) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      if (countdown > 0) {
        setCountdown((prev) => {
          if (prev <= 1) {
            setTimeout(fetchStatus, 500);
            return 0;
          }
          return prev - 1;
        });
      }
      if (holdingCountdown > 0) {
        setHoldingCountdown((prev) => {
          if (prev <= 1) {
            setTimeout(fetchStatus, 500);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [countdown, holdingCountdown, fetchStatus]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleMint = async () => {
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    setStage('minting');
    setError(null);
    setMintedCards(null);
    setTxSignatures([]);
    setPackOpened(false);

    try {
      const mintRes = await fetch('/api/nft/mint-booster', { method: 'POST' });

      // Safely parse JSON — handle empty/HTML responses
      let mintData: any;
      try {
        const text = await mintRes.text();
        mintData = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(`Server error (${mintRes.status}). Try again.`);
      }

      if (!mintRes.ok) {
        if (mintRes.status === 429) {
          setCountdown(mintData.secondsRemaining || 0);
          throw new Error(`Cooldown active. Wait ${formatTime(mintData.secondsRemaining || 0)}`);
        }
        throw new Error(mintData.error || 'Mint failed');
      }

      const { signatures, cards, nextMintAt } = mintData;
      setMintedCards(cards);
      setTxSignatures(signatures);

      if (nextMintAt) {
        const remaining = Math.ceil((new Date(nextMintAt).getTime() - Date.now()) / 1000);
        setCountdown(remaining);
        setStatus((prev) => prev ? {
          ...prev,
          canMint: false,
          nextMintAt,
          secondsRemaining: remaining,
          totalMints: prev.totalMints + 1,
        } : prev);
      }

      setStage('done');
      setShowBooster(true);
    } catch (err: any) {
      console.error('[mint] Error:', err);
      setStage('error');
      setError(err.message || 'Mint failed. Please try again.');
      fetchStatus();
    }
  };

  const isProcessing = stage === 'minting';
  const holdingMinutes = status?.holdingPeriodMinutes ?? 2;
  const cooldownMinutes = status?.cooldownMinutes ?? 2;

  // ── Derive current step (4 steps) ──
  const holdingActive = holdingCountdown > 0 || !status?.holdingComplete;
  const currentStep: number =
    !connected || !isAuthenticated ? 1
    : loading ? 1
    : !status?.hasEnoughBalance ? 2
    : stage === 'done' && !packOpened ? 4
    : stage === 'done' && packOpened ? 3
    : 3;

  const walletAddr = publicKey?.toBase58();
  const shortAddr = walletAddr ? `${walletAddr.slice(0, 4)}...${walletAddr.slice(-4)}` : '';

  // ── Step renderer ──
  const renderStep = (
    stepNum: number,
    title: string,
    state: 'done' | 'active' | 'pending',
    summary: string,
    content: React.ReactNode,
  ) => (
    <div
      className={`p-3 border rounded-sm ${
        state === 'done'
          ? 'border-[#22a846] bg-[#f0fff0]'
          : state === 'active'
          ? 'border-[#003c74] bg-[#f0f4ff]'
          : 'border-[#ccc] bg-[#f5f5f5] opacity-50'
      }`}
    >
      <div className="flex items-center gap-2 text-[12px]">
        <span className="shrink-0">
          {state === 'done' ? '✅' : state === 'active' ? `${stepNum}.` : '🔒'}
        </span>
        <span className={`font-bold ${state === 'done' ? 'text-[#006600]' : state === 'pending' ? 'text-[#999]' : 'text-[#003c74]'}`}>
          {title}
        </span>
        {state === 'done' && (
          <span className="text-[#666] text-[11px] ml-auto">{summary}</span>
        )}
      </div>
      {state === 'active' && (
        <div className="mt-3">{content}</div>
      )}
    </div>
  );

  const mintAgain = () => {
    setStage('idle');
    setError(null);
    setMintedCards(null);
    setTxSignatures([]);
    setPackOpened(false);
    fetchStatus();
  };

  return (
    <>
      <div className="space-y-2">
        {/* ── Step 1: Connect Wallet ── */}
        {renderStep(
          1,
          'Connect Wallet',
          currentStep > 1 ? 'done' : 'active',
          connected ? `${shortAddr} · ${Number(status?.currentBalance ?? 0).toLocaleString()} $SHAPEGAME` : '',
          <div className="text-center py-2">
            <p className="text-[11px] text-[#444] mb-3">
              Connect your Solana wallet to start
            </p>
            <button
              onClick={() => setVisible(true)}
              className="xp-button xp-button-primary px-6 py-[6px] text-[12px] font-bold"
            >
              Connect Wallet
            </button>
          </div>,
        )}

        {/* ── Step 2: Hold $SHAPEGAME (token balance check) ── */}
        {renderStep(
          2,
          'Hold $SHAPEGAME',
          currentStep > 2 ? 'done' : currentStep === 2 ? 'active' : 'pending',
          `${Number(status?.currentBalance ?? 0).toLocaleString()} $SHAPEGAME`,
          <div className="space-y-3">
            <p className="text-[11px] text-[#cc0000]">
              You need at least {Number(status?.requiredBalance ?? 1_000_000).toLocaleString()} $SHAPEGAME tokens.
            </p>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#666]">Current balance:</span>
              <span className="font-bold text-[#cc0000]">
                {Number(status?.currentBalance ?? 0).toLocaleString()} $SHAPEGAME
              </span>
            </div>
          </div>,
        )}

        {/* ── Step 3: Mint (includes holding timer on button) ── */}
        {renderStep(
          3,
          'Mint Your Pack',
          stage === 'done' ? 'done' : currentStep === 3 ? 'active' : 'pending',
          '3 cards minted!',
          <div className="space-y-3">
            {/* Progress indicator during mint */}
            {isProcessing && (
              <div className="space-y-2">
                <p className="text-[11px] text-[#003c74] font-bold">Minting 3 cards...</p>
                <div className="xp-progress h-[10px]">
                  <div
                    className="h-full bg-[#003c74] transition-all duration-300 animate-pulse"
                    style={{ width: '60%' }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="border p-2 text-[11px] rounded-sm border-[#cc0000] bg-[#fff0f0] text-[#cc0000]">
                {error}
              </div>
            )}

            {/* Holding timer — shows countdown on the button */}
            {holdingActive && !isProcessing && (
              <div className="space-y-2">
                <p className="text-[11px] text-[#444]">
                  Verifying balance for {holdingMinutes} min...
                </p>
                <button
                  disabled
                  className="xp-button w-full py-[10px] text-[16px] font-bold font-mono text-[#003c74]"
                >
                  {formatTime(holdingCountdown)}
                </button>
                <div className="xp-progress h-[10px]">
                  <div
                    className="h-full bg-[#003c74] transition-all duration-1000"
                    style={{
                      width: `${Math.max(0, 100 - (holdingCountdown / (holdingMinutes * 60)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Cooldown */}
            {!holdingActive && countdown > 0 && !isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#996600] font-bold">Next mint in</span>
                  <span className="font-bold text-[#996600] font-mono text-[18px]">
                    {formatTime(countdown)}
                  </span>
                </div>
                <div className="xp-progress h-[10px]">
                  <div
                    className="h-full bg-[#eab308] transition-all duration-1000"
                    style={{
                      width: `${Math.max(0, 100 - (countdown / (cooldownMinutes * 60)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Mint button — visible when not holding and not processing */}
            {!holdingActive && !isProcessing && !showConfirm && (
              <button
                onClick={() => {
                  if (!connected || !publicKey) { setVisible(true); return; }
                  setShowConfirm(true);
                }}
                disabled={status ? !status.canMint : true}
                className={`xp-button w-full py-[8px] text-[13px] font-bold ${
                  status?.canMint ? 'xp-button-primary' : ''
                }`}
              >
                {countdown > 0
                  ? `Cooldown: ${formatTime(countdown)}`
                  : '🎴 Free Mint — 3 NFT Cards'
                }
              </button>
            )}

            {/* Mint confirmation */}
            {showConfirm && !isProcessing && (
              <div className="border border-[#003c74] bg-[#f0f4ff] rounded-sm p-3 space-y-3">
                <p className="text-[12px] text-[#003c74] font-bold text-center">
                  Mint 3 NFT cards to your wallet?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowConfirm(false); handleMint(); }}
                    className="xp-button xp-button-primary flex-1 py-[6px] text-[13px] font-bold"
                  >
                    Mint!
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="xp-button flex-1 py-[6px] text-[13px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {status && (
              <div className="text-center space-y-1">
                <p className="text-[10px] text-[#888]">
                  Total packs minted: {status.totalMints} · Free · Solana
                </p>
                <button
                  onClick={() => openWindow('collection')}
                  className="text-[11px] text-[#003399] underline hover:text-[#0066cc] cursor-pointer bg-transparent border-none p-0"
                >
                  View My Collection →
                </button>
              </div>
            )}
          </div>,
        )}

        {/* ── Step 4: Open Pack ── */}
        {renderStep(
          4,
          'Open Pack',
          packOpened ? 'done' : stage === 'done' ? 'active' : 'pending',
          'Pack opened!',
          <div className="text-center py-2 space-y-3">
            {txSignatures.length > 0 && (
              <div className="text-[10px] text-[#666]">
                {txSignatures.map((sig, i) => (
                  <a
                    key={sig}
                    href={`https://solscan.io/tx/${sig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[#003399] underline"
                  >
                    TX: {sig.slice(0, 8)}...{sig.slice(-8)}
                  </a>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowBooster(true)}
              className="xp-button xp-button-primary px-6 py-[6px] text-[13px] font-bold w-full"
            >
              Open Pack
            </button>
          </div>,
        )}

        {/* Mint again + collection link after pack opened */}
        {packOpened && (
          <div className="flex gap-2">
            <button
              onClick={mintAgain}
              className="xp-button flex-1 py-[4px] text-[11px]"
            >
              Mint Another Pack
            </button>
            <button
              onClick={() => openWindow('collection')}
              className="xp-button flex-1 py-[4px] text-[11px]"
            >
              📂 My Collection
            </button>
          </div>
        )}
      </div>

      {/* Booster reveal overlay */}
      {showBooster && mintedCards && (
        <BoosterOverlay
          onClose={() => {
            setShowBooster(false);
            setPackOpened(true);
          }}
          preloadedCards={mintedCards}
          txSignatures={txSignatures}
        />
      )}
    </>
  );
}
