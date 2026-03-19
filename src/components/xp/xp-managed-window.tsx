'use client';

import { type ReactNode, useRef, useCallback, useEffect } from 'react';
import { useWindowManager, type WindowId } from '@/lib/stores/window-manager';

interface XpManagedWindowProps {
  windowId: WindowId;
  children: ReactNode;
  toolbar?: ReactNode;
  statusBar?: ReactNode;
  noPadding?: boolean;
  className?: string;
}

export function XpManagedWindow({
  windowId,
  children,
  toolbar,
  statusBar,
  noPadding,
  className,
}: XpManagedWindowProps) {
  const win = useWindowManager((s) => s.windows.find((w) => w.id === windowId)!);
  const focused = useWindowManager((s) => s.focusedWindow === windowId);
  const closeWindow = useWindowManager((s) => s.closeWindow);
  const minimizeWindow = useWindowManager((s) => s.minimizeWindow);
  const focusWindow = useWindowManager((s) => s.focusWindow);

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Only drag from title bar itself, not buttons
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: win.x, origY: win.y };
    if (!focused) focusWindow(windowId);
  }, [win.x, win.y, focused, focusWindow, windowId]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    useWindowManager.getState().moveWindow(windowId, dragRef.current.origX + dx, dragRef.current.origY + dy);
  }, [windowId]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // Clean up drag if component unmounts mid-drag
  useEffect(() => {
    return () => { dragRef.current = null; };
  }, []);

  if (!win.isOpen || win.isMinimized) return null;

  // On mobile, ignore stored position (CSS handles full-screen)
  const positionStyle: React.CSSProperties = {
    zIndex: win.zIndex,
    left: win.x,
    top: win.y,
  };

  return (
    <div
      className={`xp-managed-window ${focused ? 'xp-managed-window-focused' : 'xp-managed-window-blur'} ${className || ''}`}
      style={positionStyle}
      onMouseDown={() => {
        if (!focused) focusWindow(windowId);
      }}
    >
      <div className="xp-window flex flex-col">
        {/* Title bar — draggable */}
        <div
          className={`xp-title-bar shrink-0 ${!focused ? 'xp-title-bar-inactive' : ''}`}
          style={{ cursor: 'grab', touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div className="flex items-center gap-[6px] min-w-0">
            <img src={win.icon} alt="" width={14} height={14} className="shrink-0" />
            <span className="xp-title-text">{win.title}</span>
          </div>
          <div className="flex items-center gap-[2px] shrink-0">
            <button
              className="xp-btn-minimize"
              aria-label="Minimize"
              onClick={(e) => { e.stopPropagation(); minimizeWindow(windowId); }}
            >
              <svg width="8" height="2" viewBox="0 0 8 2"><rect width="8" height="2" fill="currentColor"/></svg>
            </button>
            <button className="xp-btn-maximize" aria-label="Maximize" onClick={(e) => e.stopPropagation()}>
              <svg width="9" height="9" viewBox="0 0 9 9"><rect x="0" y="0" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
            </button>
            <button
              className="xp-btn-close"
              aria-label="Close"
              onClick={(e) => { e.stopPropagation(); closeWindow(windowId); }}
            >
              <svg width="8" height="8" viewBox="0 0 8 8"><path d="M0 0L8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          </div>
        </div>

        {/* Optional toolbar */}
        {toolbar && <div className="xp-toolbar shrink-0">{toolbar}</div>}

        {/* Content — scrollable */}
        <div className={`flex-1 overflow-y-auto ${noPadding ? 'xp-window-content-raw' : 'xp-window-content'}`}>
          {children}
        </div>

        {/* Optional status bar */}
        {statusBar && <div className="xp-status-bar shrink-0">{statusBar}</div>}
      </div>
    </div>
  );
}
