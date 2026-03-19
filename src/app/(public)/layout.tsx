'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { WalletProvider } from '@/components/providers/wallet-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { WalletButton } from '@/components/wallet-button';
import { Toaster } from 'sonner';
import { useWindowManager, type WindowId } from '@/lib/stores/window-manager';
import { SplineWallpaper } from '@/components/spline-wallpaper';

const ALL_WINDOWS: { id: WindowId; icon: string; label: string }[] = [
  { id: 'onboarding', icon: '/icons/xp-home.svg', label: 'Welcome' },
  { id: 'shop', icon: '/icons/xp-cards.svg', label: 'Free Mint' },
  { id: 'collection', icon: '/icons/xp-collection.svg', label: 'Collection' },
  { id: 'leaderboard', icon: '/icons/xp-trophy.svg', label: 'Leaderboard' },
  { id: 'generator', icon: '/icons/xp-cards.svg', label: 'Card Generator' },
  { id: 'runner', icon: '/icons/xp-cards.svg', label: 'Trench Runner' },
  { id: 'player', icon: '/icons/xp-cards.svg', label: 'Media Player' },
  { id: 'faq', icon: '/icons/xp-cards.svg', label: 'FAQ' },
  { id: 'mcp', icon: '/icons/xp-cards.svg', label: 'MCP Agent' },
];

const TOKEN_CA = 'DHPpqsiWjcSmCkeUmxr6SENEy7gs3HDZ2Wtq4jPUpump';

function TokenCA() {
  const [copied, setCopied] = useState(false);
  const short = `${TOKEN_CA.slice(0, 4)}...${TOKEN_CA.slice(-4)}`;

  const copy = useCallback(() => {
    navigator.clipboard.writeText(TOKEN_CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  return (
    <div className="xp-token-ca">
      <span>CA:</span>
      <span>{short}</span>
      <button className="xp-token-ca-copy" onClick={copy} title="Copy contract address">
        {copied ? '✓' : '📋'}
      </button>
    </div>
  );
}

function TaskbarInner() {
  const windows = useWindowManager((s) => s.windows);
  const focusedWindow = useWindowManager((s) => s.focusedWindow);
  const toggleWindow = useWindowManager((s) => s.toggleWindow);
  const openWindow = useWindowManager((s) => s.openWindow);
  const [startOpen, setStartOpen] = useState(false);

  const openWindows = windows.filter((w) => w.isOpen);

  return (
    <div className="xp-taskbar">
      {/* Start button */}
      <div className="relative">
        <button
          className="xp-start-button"
          onClick={() => setStartOpen(!startOpen)}
        >
          <Image src="/icons/xp-start.svg" alt="" width={16} height={16} className="shrink-0" />
          start
        </button>

        {/* Start menu */}
        {startOpen && (
          <>
            <div className="fixed inset-0 z-[98]" onClick={() => setStartOpen(false)} />
            <div className="xp-start-menu">
              <div className="xp-start-menu-header">
                <Image src="/icons/xp-cards.svg" alt="" width={16} height={16} />
                <span className="font-bold">TRENCH GRAILS</span>
              </div>
              <div className="xp-start-menu-items">
                {ALL_WINDOWS.map((w) => (
                  <button
                    key={w.id}
                    className="xp-start-menu-item"
                    onClick={() => {
                      openWindow(w.id);
                      setStartOpen(false);
                    }}
                  >
                    <Image src={w.icon} alt="" width={16} height={16} className="shrink-0" />
                    <span>{w.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Taskbar buttons — one per open window */}
      <div className="xp-taskbar-buttons">
        {openWindows.map((w) => {
          const isFocused = focusedWindow === w.id;
          return (
            <button
              key={w.id}
              className={`xp-taskbar-btn ${isFocused ? 'xp-taskbar-btn-active' : ''} ${w.isMinimized ? 'xp-taskbar-btn-minimized' : ''}`}
              onClick={() => toggleWindow(w.id)}
            >
              <img src={w.icon} alt="" width={14} height={14} className="shrink-0" />
              <span className="truncate">{w.title}</span>
            </button>
          );
        })}
      </div>

      {/* System tray */}
      <div className="xp-tray">
        <TokenCA />
        <a href="https://pump.fun/coin/DHPpqsiWjcSmCkeUmxr6SENEy7gs3HDZ2Wtq4jPUpump" target="_blank" rel="noopener noreferrer" className="xp-tray-link">
          <img src="/icons/pumpfun.svg" alt="Pump.fun" width={16} height={16} />
        </a>
        <a href="https://gmgn.ai/sol/token/DHPpqsiWjcSmCkeUmxr6SENEy7gs3HDZ2Wtq4jPUpump" target="_blank" rel="noopener noreferrer" className="xp-tray-link">
          <img src="/icons/gmgn.svg" alt="GMGN" width={16} height={16} />
        </a>
        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
        <WalletButton />
        <a href="https://x.com/trenchgrails" target="_blank" rel="noopener noreferrer" className="xp-tray-link">
          <img src="/icons/twitter.svg" alt="Twitter" width={14} height={14} />
        </a>
        <a href="https://github.com/innerabbit/trenchgrails" target="_blank" rel="noopener noreferrer" className="xp-tray-link">
          <img src="/icons/github.svg" alt="GitHub" width={14} height={14} />
        </a>
        <img src="/icons/xp-speaker.svg" alt="" width={14} height={14} />
        <span className="text-[11px]">
          {new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </span>
      </div>
    </div>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProvider>
      <AuthProvider>
      <div className="xp-desktop flex flex-col" style={{ paddingBottom: 36 }}>
        {/* Background video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        >
          <source src="/shape_game.mp4" type="video/mp4" />
        </video>

        {/* 3D Spline wallpaper — on top of video */}
        <SplineWallpaper />

        {/* Main content — desktop area */}
        <main className="flex-1 relative" style={{ zIndex: 1, pointerEvents: 'none' }}>
          {children}
        </main>

        {/* XP Taskbar with dynamic buttons */}
        <TaskbarInner />

        <Toaster
          theme="light"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#ffffe1',
              border: '1px solid #000',
              color: '#222',
              fontFamily: 'Tahoma, sans-serif',
              fontSize: '11px',
              borderRadius: 0,
            },
          }}
        />
      </div>
      </AuthProvider>
    </WalletProvider>
  );
}
