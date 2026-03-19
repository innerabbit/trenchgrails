'use client';

import dynamic from 'next/dynamic';

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false });

const SCENE_URL = 'https://prod.spline.design/f0yF1oYeO50SDQs1/scene.splinecode?v=3';

export function SplineWallpaper() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        opacity: 0.6,
      }}
    >
      <Spline scene={SCENE_URL} />
    </div>
  );
}
