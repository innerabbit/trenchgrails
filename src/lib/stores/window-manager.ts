import { create } from 'zustand';

export type WindowId = 'onboarding' | 'shop' | 'collection' | 'leaderboard' | 'generator' | 'runner' | 'player' | 'faq' | 'mcp';

export interface WindowState {
  id: WindowId;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  x: number;
  y: number;
}

const WINDOW_DEFS: { id: WindowId; title: string; icon: string; x: number; y: number }[] = [
  { id: 'onboarding', title: 'Welcome', icon: '/icons/xp-home.svg', x: 150, y: 60 },
  { id: 'shop', title: 'Free Mint', icon: '/icons/xp-cards.svg', x: 30, y: 120 },
  { id: 'collection', title: 'Collection', icon: '/icons/xp-collection.svg', x: 280, y: 20 },
  { id: 'leaderboard', title: 'Leaderboard', icon: '/icons/xp-trophy.svg', x: 220, y: 90 },
  { id: 'generator', title: 'Card Generator', icon: '/icons/xp-cards.svg', x: 100, y: 40 },
  { id: 'runner', title: 'Trench Runner', icon: '/icons/xp-cards.svg', x: 300, y: 150 },
  { id: 'player', title: 'Media Player', icon: '/icons/xp-cards.svg', x: 200, y: 80 },
  { id: 'faq', title: 'FAQ & Tokenomics', icon: '/icons/xp-cards.svg', x: 120, y: 50 },
  { id: 'mcp', title: 'MCP Agent Terminal', icon: '/icons/xp-cards.svg', x: 180, y: 70 },
];

interface WindowManagerStore {
  windows: WindowState[];
  focusedWindow: WindowId | null;
  nextZIndex: number;

  openWindow: (id: WindowId) => void;
  closeWindow: (id: WindowId) => void;
  minimizeWindow: (id: WindowId) => void;
  focusWindow: (id: WindowId) => void;
  toggleWindow: (id: WindowId) => void;
  moveWindow: (id: WindowId, x: number, y: number) => void;
}

function getInitialWindows(): WindowState[] {
  return WINDOW_DEFS.map((def, i) => ({
    ...def,
    isOpen: def.id === 'onboarding',
    isMinimized: false,
    // Onboarding gets highest z-index so it's on top
    zIndex: def.id === 'onboarding' ? 20 : 10 + i,
  }));
}

export const useWindowManager = create<WindowManagerStore>((set, get) => ({
  windows: getInitialWindows(),
  focusedWindow: 'onboarding',
  nextZIndex: 21,

  openWindow: (id) => {
    const { nextZIndex } = get();
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isOpen: true, isMinimized: false, zIndex: nextZIndex } : w,
      ),
      focusedWindow: id,
      nextZIndex: nextZIndex + 1,
    }));
  },

  closeWindow: (id) => {
    set((state) => {
      const newWindows = state.windows.map((w) =>
        w.id === id ? { ...w, isOpen: false, isMinimized: false } : w,
      );
      let newFocused = state.focusedWindow === id ? null : state.focusedWindow;
      if (newFocused === null) {
        const openWindows = newWindows
          .filter((w) => w.isOpen && !w.isMinimized)
          .sort((a, b) => b.zIndex - a.zIndex);
        newFocused = openWindows[0]?.id ?? null;
      }
      return { windows: newWindows, focusedWindow: newFocused };
    });
  },

  minimizeWindow: (id) => {
    set((state) => {
      const newWindows = state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: true } : w,
      );
      let newFocused = state.focusedWindow === id ? null : state.focusedWindow;
      if (newFocused === null) {
        const openWindows = newWindows
          .filter((w) => w.isOpen && !w.isMinimized)
          .sort((a, b) => b.zIndex - a.zIndex);
        newFocused = openWindows[0]?.id ?? null;
      }
      return { windows: newWindows, focusedWindow: newFocused };
    });
  },

  focusWindow: (id) => {
    const { nextZIndex } = get();
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, isMinimized: false, zIndex: nextZIndex } : w,
      ),
      focusedWindow: id,
      nextZIndex: nextZIndex + 1,
    }));
  },

  toggleWindow: (id) => {
    const { focusedWindow } = get();
    const win = get().windows.find((w) => w.id === id);
    if (!win) return;

    if (!win.isOpen) {
      get().openWindow(id);
    } else if (win.isMinimized) {
      get().focusWindow(id);
    } else if (focusedWindow === id) {
      get().minimizeWindow(id);
    } else {
      get().focusWindow(id);
    }
  },

  moveWindow: (id, x, y) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, x, y } : w,
      ),
    }));
  },
}));
