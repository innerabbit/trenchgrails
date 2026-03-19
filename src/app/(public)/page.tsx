'use client';

import { useEffect } from 'react';
import { useWindowManager, type WindowId } from '@/lib/stores/window-manager';
import { XpManagedWindow } from '@/components/xp/xp-managed-window';
import { OnboardingContent } from '@/components/windows/onboarding-content';
import { ShopContent } from '@/components/windows/shop-content';
import { CollectionContent } from '@/components/windows/collection-content';
import { LeaderboardContent } from '@/components/windows/leaderboard-content';
import { GeneratorContent } from '@/components/windows/generator-content';
import { RunnerContent } from '@/components/windows/runner-content';
import { PlayerContent } from '@/components/windows/player-content';
import { FaqContent } from '@/components/windows/faq-content';
import { McpContent } from '@/components/windows/mcp-content';
import { XpDesktopIcons } from '@/components/xp/xp-desktop-icons';

const HASH_TO_WINDOW: Record<string, WindowId> = {
  shop: 'shop',
  collection: 'collection',
  leaderboard: 'leaderboard',
  generator: 'generator',
  runner: 'runner',
  player: 'player',
  faq: 'faq',
  mcp: 'mcp',
};

export default function HomePage() {
  const focusedWindow = useWindowManager((s) => s.focusedWindow);
  const windows = useWindowManager((s) => s.windows);

  // On mount: open window from hash
  useEffect(() => {
    const { openWindow } = useWindowManager.getState();
    const hash = window.location.hash.replace('#', '');
    const windowId = HASH_TO_WINDOW[hash];
    if (windowId) {
      openWindow(windowId);
    }
  }, []);

  // Sync hash with focused window
  useEffect(() => {
    if (focusedWindow && focusedWindow !== 'onboarding') {
      window.location.hash = focusedWindow;
    }
  }, [focusedWindow]);

  // Mark onboarding as completed when shop is opened
  useEffect(() => {
    const shopWindow = windows.find((w) => w.id === 'shop');
    if (shopWindow?.isOpen) {
      localStorage.setItem('sc_onboarding_done', '1');
    }
  }, [windows]);

  return (
    <div className="xp-window-area">
      <XpDesktopIcons />

      <XpManagedWindow windowId="onboarding">
        <OnboardingContent />
      </XpManagedWindow>

      <XpManagedWindow windowId="shop">
        <ShopContent />
      </XpManagedWindow>

      <XpManagedWindow
        windowId="collection"
        statusBar={<><div>Collection</div><div className="flex-1 text-right">TRENCH GRAILS</div></>}
      >
        <CollectionContent />
      </XpManagedWindow>

      <XpManagedWindow
        windowId="leaderboard"
        statusBar={<><div>10 collectors listed</div><div>Preview data</div><div className="flex-1 text-right">Leaderboard</div></>}
      >
        <LeaderboardContent />
      </XpManagedWindow>

      <XpManagedWindow windowId="generator">
        <GeneratorContent />
      </XpManagedWindow>

      <XpManagedWindow windowId="runner" noPadding className="xp-managed-window-runner">
        <RunnerContent />
      </XpManagedWindow>

      <XpManagedWindow windowId="player" noPadding className="xp-managed-window-player">
        <PlayerContent />
      </XpManagedWindow>

      <XpManagedWindow windowId="faq" className="xp-managed-window-faq">
        <FaqContent />
      </XpManagedWindow>

      <XpManagedWindow windowId="mcp" noPadding className="xp-managed-window-mcp">
        <McpContent />
      </XpManagedWindow>

      {/* Desktop icons are always visible behind windows */}
    </div>
  );
}
