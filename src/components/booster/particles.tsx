'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  rotation: number;
  rotSpeed: number;
}

const COLORS = ['#ff6600', '#ffaa00', '#ff4488', '#6644ff', '#00ccff', '#ffdd00', '#ffffff'];

export function PackParticles({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const hasSpawned = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth * 2;
      canvas.height = window.innerHeight * 2;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = () => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2 - 40;
      for (let i = 0; i < 60; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 6;
        particlesRef.current.push({
          x: cx + (Math.random() - 0.5) * 40,
          y: cy + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          life: 0,
          maxLife: 40 + Math.random() * 40,
          size: 2 + Math.random() * 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.2,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      particlesRef.current = particlesRef.current.filter(p => {
        p.life++;
        if (p.life > p.maxLife) return false;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;

        const progress = p.life / p.maxLife;
        const alpha = progress < 0.1 ? progress * 10 : 1 - (progress - 0.1) / 0.9;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = alpha * 0.9;

        // Draw sparkle shape
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);

        ctx.restore();
        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    if (active && !hasSpawned.current) {
      hasSpawned.current = true;
      spawn();
      // Second burst
      setTimeout(spawn, 200);
    }

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  // Reset spawn flag when deactivated
  useEffect(() => {
    if (!active) hasSpawned.current = false;
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[55] pointer-events-none"
    />
  );
}
