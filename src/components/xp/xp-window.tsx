'use client';

import type { ReactNode } from 'react';

interface XpWindowProps {
  title: string;
  icon?: string;
  children: ReactNode;
  className?: string;
  toolbar?: ReactNode;
  statusBar?: ReactNode;
  noPadding?: boolean;
}

export function XpWindow({
  title,
  icon,
  children,
  className = '',
  toolbar,
  statusBar,
  noPadding,
}: XpWindowProps) {
  return (
    <div className={`xp-window ${className}`}>
      {/* Title bar */}
      <div className="xp-title-bar">
        <div className="flex items-center gap-[6px] min-w-0">
          {icon && <span className="text-sm shrink-0">{icon}</span>}
          <span className="xp-title-text">{title}</span>
        </div>
        <div className="flex items-center gap-[2px] shrink-0">
          <button className="xp-btn-minimize" aria-label="Minimize">
            <svg width="8" height="2" viewBox="0 0 8 2"><rect width="8" height="2" fill="currentColor"/></svg>
          </button>
          <button className="xp-btn-maximize" aria-label="Maximize">
            <svg width="9" height="9" viewBox="0 0 9 9"><rect x="0" y="0" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="2"/></svg>
          </button>
          <button className="xp-btn-close" aria-label="Close">
            <svg width="8" height="8" viewBox="0 0 8 8"><path d="M0 0L8 8M8 0L0 8" stroke="currentColor" strokeWidth="1.5"/></svg>
          </button>
        </div>
      </div>

      {/* Optional toolbar */}
      {toolbar && (
        <div className="xp-toolbar">{toolbar}</div>
      )}

      {/* Content */}
      <div className={noPadding ? 'xp-window-content-raw' : 'xp-window-content'}>
        {children}
      </div>

      {/* Optional status bar */}
      {statusBar && (
        <div className="xp-status-bar">{statusBar}</div>
      )}
    </div>
  );
}
