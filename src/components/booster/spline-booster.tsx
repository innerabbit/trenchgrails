'use client';

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { Application as SplineApp } from '@splinetool/runtime';

const BOOSTER_SCENE_URL =
  'https://prod.spline.design/ws88-gE8dXH7pagA/scene.splinecode?v=1';

// ── Types ──────────────────────────────────────────────────────

export interface SplineBoosterHandle {
  /** Trigger the pack-open animation (emits mouseDown to the booster object) */
  triggerOpen: () => void;
  getApp: () => SplineApp | null;
}

interface SplineBoosterProps {
  className?: string;
  style?: React.CSSProperties;
  /** Called when the Spline scene finishes loading */
  onLoad?: () => void;
  /** Called when the user clicks the booster (before animation) */
  onClick?: () => void;
  /** Name of the Spline object to emit mouseDown on for opening (default: 'Booster') */
  openObjectName?: string;
  /** How long the open animation takes in ms (transitions to next stage after this) */
  animationDuration?: number;
  /** Called after the open animation completes */
  onAnimationEnd?: () => void;
}

// ── Loader ─────────────────────────────────────────────────────

function BoosterLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: '#ff660044', borderTopColor: 'transparent' }}
        />
        <span className="text-[9px] text-[#ff660066] tracking-[0.3em] uppercase">
          Loading 3D
        </span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────
// Uses @splinetool/runtime directly (same pattern as SplineCard).
// Each booster gets its own Application instance.

export const SplineBooster = forwardRef<SplineBoosterHandle, SplineBoosterProps>(
  function SplineBooster(
    {
      className = '',
      style,
      onLoad,
      onClick,
      openObjectName = 'Booster',
      animationDuration = 3000,
      onAnimationEnd,
    },
    ref
  ) {
    const [loaded, setLoaded] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const appRef = useRef<SplineApp | null>(null);
    const disposedRef = useRef(false);

    // Expose imperative handle
    useImperativeHandle(
      ref,
      () => ({
        triggerOpen() {
          const app = appRef.current;
          if (!app) return;
          try {
            app.emitEvent('mouseDown', openObjectName);
            console.log(`[SplineBooster] 🎁 open → "${openObjectName}"`);

            // Fire onAnimationEnd after the Spline animation plays
            if (onAnimationEnd) {
              setTimeout(onAnimationEnd, animationDuration);
            }
          } catch (e) {
            console.warn(`[SplineBooster] ❌ emitEvent failed:`, e);
          }
        },
        getApp() {
          return appRef.current;
        },
      }),
      [openObjectName, animationDuration, onAnimationEnd]
    );

    // Initialize Spline runtime
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      disposedRef.current = false;

      import('@splinetool/runtime').then(({ Application }) => {
        if (disposedRef.current) return;

        const app = new Application(canvas);
        app
          .load(BOOSTER_SCENE_URL)
          .then(() => {
            if (disposedRef.current) {
              app.dispose();
              return;
            }
            appRef.current = app;

            // Scale canvas to fit container via CSS transform.
            // Spline renders at its native frame size — setSize() is unreliable.
            requestAnimationFrame(() => {
              const container = canvas.parentElement;
              if (container && canvas.clientWidth > 0) {
                const scaleX = container.clientWidth / canvas.clientWidth;
                const scaleY = container.clientHeight / canvas.clientHeight;
                const scale = Math.min(scaleX, scaleY);
                const offsetX =
                  (container.clientWidth - canvas.clientWidth * scale) / 2;
                const offsetY =
                  (container.clientHeight - canvas.clientHeight * scale) / 2;
                canvas.style.transformOrigin = 'top left';
                canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
              }
            });

            setLoaded(true);
            onLoad?.();
          })
          .catch((err) => {
            console.warn('[SplineBooster] Failed to load scene:', err);
          });
      });

      return () => {
        disposedRef.current = true;
        if (appRef.current) {
          try {
            appRef.current.dispose();
          } catch (_) {}
          appRef.current = null;
        }
        setLoaded(false);
      };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{ ...style }}
        onClick={onClick}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.6s ease-out',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        />

        {!loaded && <BoosterLoader />}
      </div>
    );
  }
);
