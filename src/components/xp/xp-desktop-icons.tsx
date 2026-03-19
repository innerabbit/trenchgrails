'use client';

import { useCallback } from 'react';
import { useWindowManager, type WindowId } from '@/lib/stores/window-manager';

interface DesktopIcon {
  id: WindowId;
  label: string;
  icon: string;
}

const DESKTOP_ICONS: DesktopIcon[] = [
  { id: 'shop', label: 'Free Mint', icon: '/icons/xp-desktop-mint.png' },
  { id: 'collection', label: 'Collection', icon: '/icons/xp-desktop-collection.png' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '/icons/xp-desktop-leaderboard.png' },
  { id: 'generator', label: 'Card Generator', icon: '/icons/xp-desktop-generator.png' },
  { id: 'runner', label: 'Trench Runner', icon: '/icons/xp-desktop-runner.png' },
  { id: 'player', label: 'Media Player', icon: '/icons/xp-desktop-player.png' },
  { id: 'faq', label: 'FAQ', icon: '/icons/xp-desktop-faq.png' },
  { id: 'mcp', label: 'MCP Agent', icon: '/icons/xp-desktop-mcp.png' },
];

export function XpDesktopIcons() {
  const openWindow = useWindowManager((s) => s.openWindow);

  const handleClick = useCallback((id: WindowId) => {
    openWindow(id);
  }, [openWindow]);

  return (
    <div className="xp-desktop-icons">
      {DESKTOP_ICONS.map((item) => (
        <button
          key={item.id}
          className="xp-desktop-icon"
          onClick={() => handleClick(item.id)}
        >
          <img
            src={item.icon}
            alt={item.label}
            width={48}
            height={48}
            draggable={false}
          />
          <span className="xp-desktop-icon-label">{item.label}</span>
        </button>
      ))}
    </div>
  );
}
