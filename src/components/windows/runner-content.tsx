'use client';

import { useRef, useEffect, useCallback } from 'react';

const CANVAS_W = 300;
const CANVAS_H = 170;
const GROUND_Y = CANVAS_H - 24;
const GRAVITY = 0.5;
const JUMP_IMPULSE = -5.5;       // initial kick on press
const HOLD_BOOST = -0.35;        // extra upward force each frame while holding
const MAX_JUMP_HOLD_FRAMES = 12; // max frames you can boost

const PLAYER_X = 36;

// Dark moody colors from the photo — saturated shapes on dark bg
const SHAPE_COLORS = ['#e03030', '#2878e0', '#28b848', '#e8c020', '#e06020', '#9040d0'];

type ShapeType = 'square' | 'triangle' | 'circle' | 'diamond';
const SHAPE_TYPES: ShapeType[] = ['square', 'triangle', 'circle', 'diamond'];

interface Obstacle {
  x: number;
  type: ShapeType;
  color: string;
  size: number;
}

interface GameState {
  status: 'idle' | 'playing' | 'dead';
  playerY: number;
  velY: number;
  obstacles: Obstacle[];
  score: number;
  speed: number;
  spawnTimer: number;
  spaceHeld: boolean;    // is space currently held
  jumpHoldFrames: number; // how many frames we've been boosting
  frameId: number;
  runFrame: number;
  scrollX: number;  // smooth scroll accumulator
}

// Pre-generate stars
const STARS: { x: number; y: number; size: number; bright: number }[] = [];
for (let i = 0; i < 40; i++) {
  STARS.push({
    x: (Math.sin(i * 137.5) * 0.5 + 0.5) * CANVAS_W,
    y: (Math.cos(i * 73.1) * 0.5 + 0.5) * (GROUND_Y - 50),
    size: (i % 3 === 0) ? 2 : 1,
    bright: 0.4 + (i % 5) * 0.15,
  });
}

// Pixel city buildings — back layer (tall, far)
const BUILDINGS_FAR: { x: number; w: number; h: number; color: string }[] = [
  { x: 0, w: 18, h: 40, color: '#1a1a35' },
  { x: 22, w: 12, h: 55, color: '#1c1c38' },
  { x: 38, w: 20, h: 35, color: '#18182f' },
  { x: 62, w: 14, h: 60, color: '#1e1e3a' },
  { x: 80, w: 22, h: 42, color: '#1a1a32' },
  { x: 106, w: 16, h: 50, color: '#1c1c36' },
  { x: 126, w: 20, h: 38, color: '#191930' },
  { x: 150, w: 12, h: 58, color: '#1d1d38' },
  { x: 166, w: 18, h: 44, color: '#1b1b34' },
  { x: 188, w: 22, h: 36, color: '#181830' },
  { x: 214, w: 14, h: 52, color: '#1c1c37' },
  { x: 232, w: 20, h: 40, color: '#1a1a33' },
  { x: 256, w: 16, h: 48, color: '#1e1e3b' },
  { x: 276, w: 18, h: 35, color: '#191931' },
  { x: 298, w: 14, h: 55, color: '#1b1b36' },
];

// Pixel city buildings — front layer (shorter, nearer)
const BUILDINGS_NEAR: { x: number; w: number; h: number; color: string }[] = [
  { x: 5, w: 16, h: 28, color: '#222245' },
  { x: 25, w: 20, h: 22, color: '#252548' },
  { x: 50, w: 14, h: 32, color: '#202042' },
  { x: 68, w: 22, h: 20, color: '#232346' },
  { x: 95, w: 18, h: 30, color: '#212144' },
  { x: 118, w: 16, h: 24, color: '#242448' },
  { x: 138, w: 20, h: 26, color: '#222243' },
  { x: 162, w: 14, h: 34, color: '#252549' },
  { x: 180, w: 22, h: 22, color: '#202040' },
  { x: 206, w: 18, h: 28, color: '#232347' },
  { x: 228, w: 16, h: 20, color: '#212142' },
  { x: 248, w: 20, h: 30, color: '#242446' },
  { x: 272, w: 14, h: 24, color: '#222244' },
  { x: 290, w: 18, h: 26, color: '#252547' },
];

// Window positions for buildings (lit windows)
const WINDOWS_FAR: { bx: number; by: number }[] = [];
BUILDINGS_FAR.forEach((b) => {
  for (let wy = 4; wy < b.h - 4; wy += 8) {
    for (let wx = 3; wx < b.w - 3; wx += 6) {
      if (Math.sin(b.x * 17 + wx * 7 + wy * 13) > 0.1) {
        WINDOWS_FAR.push({ bx: b.x + wx, by: wy });
      }
    }
  }
});
const WINDOWS_NEAR: { bx: number; by: number }[] = [];
BUILDINGS_NEAR.forEach((b) => {
  for (let wy = 3; wy < b.h - 3; wy += 7) {
    for (let wx = 3; wx < b.w - 3; wx += 6) {
      if (Math.cos(b.x * 13 + wx * 11 + wy * 7) > 0) {
        WINDOWS_NEAR.push({ bx: b.x + wx, by: wy });
      }
    }
  }
});

function drawBackground(ctx: CanvasRenderingContext2D, scrollOffset: number) {
  // Night sky — lighter purple/blue
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#1a1040');
  sky.addColorStop(0.4, '#252060');
  sky.addColorStop(0.8, '#302868');
  sky.addColorStop(1, '#3a3070');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  // Stars — twinkle
  const time = Date.now() * 0.002;
  for (const s of STARS) {
    const twinkle = 0.5 + 0.5 * Math.sin(time + s.x * 3 + s.y * 7);
    ctx.globalAlpha = s.bright * twinkle;
    ctx.fillStyle = '#fff';
    ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
  }
  ctx.globalAlpha = 1;

  // Moon
  ctx.fillStyle = '#e8e0c0';
  ctx.shadowColor = '#e8e0c0';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(CANVAS_W - 35, 18, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Far buildings (slow parallax)
  const farOff = (scrollOffset * 0.15) % (CANVAS_W + 40);
  for (const b of BUILDINGS_FAR) {
    const bx = ((b.x - farOff) % (CANVAS_W + 20) + CANVAS_W + 20) % (CANVAS_W + 20) - 20;
    ctx.fillStyle = b.color;
    ctx.fillRect(bx, GROUND_Y - b.h, b.w, b.h);
  }
  // Far windows
  ctx.fillStyle = '#e8c040';
  for (const w of WINDOWS_FAR) {
    const b = BUILDINGS_FAR.find((bb) => w.bx >= bb.x && w.bx < bb.x + bb.w);
    if (!b) continue;
    const bx = ((b.x - farOff) % (CANVAS_W + 20) + CANVAS_W + 20) % (CANVAS_W + 20) - 20;
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 0.5 + w.bx);
    ctx.fillRect(bx + (w.bx - b.x), GROUND_Y - b.h + w.by, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Near buildings (faster parallax)
  const nearOff = (scrollOffset * 0.4) % (CANVAS_W + 40);
  for (const b of BUILDINGS_NEAR) {
    const bx = ((b.x - nearOff) % (CANVAS_W + 20) + CANVAS_W + 20) % (CANVAS_W + 20) - 20;
    ctx.fillStyle = b.color;
    ctx.fillRect(bx, GROUND_Y - b.h, b.w, b.h);
  }
  // Near windows
  ctx.fillStyle = '#f0d060';
  for (const w of WINDOWS_NEAR) {
    const b = BUILDINGS_NEAR.find((bb) => w.bx >= bb.x && w.bx < bb.x + bb.w);
    if (!b) continue;
    const bx = ((b.x - nearOff) % (CANVAS_W + 20) + CANVAS_W + 20) % (CANVAS_W + 20) - 20;
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(time * 0.7 + w.bx * 2);
    ctx.fillRect(bx + (w.bx - b.x), GROUND_Y - b.h + w.by, 3, 2);
  }
  ctx.globalAlpha = 1;

  // Ground
  ctx.fillStyle = '#1a1838';
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  // Road line
  ctx.strokeStyle = '#3a3868';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(CANVAS_W, GROUND_Y);
  ctx.stroke();
  // Road dashes
  ctx.strokeStyle = '#4a4878';
  const dashOff = (scrollOffset * 2) % 20;
  for (let dx = -dashOff; dx < CANVAS_W; dx += 20) {
    ctx.beginPath();
    ctx.moveTo(dx, GROUND_Y + 10);
    ctx.lineTo(dx + 8, GROUND_Y + 10);
    ctx.stroke();
  }
}

function drawShape(ctx: CanvasRenderingContext2D, type: ShapeType, x: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;

  switch (type) {
    case 'square':
      ctx.fillRect(x - size / 2, y - size, size, size);
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size / 2, y);
      ctx.lineTo(x + size / 2, y);
      ctx.closePath();
      ctx.fill();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(x, y - size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size / 2, y - size / 2);
      ctx.lineTo(x, y);
      ctx.lineTo(x - size / 2, y - size / 2);
      ctx.closePath();
      ctx.fill();
      break;
  }
  ctx.shadowBlur = 0;
}

// Pixel-art person: ~12x24 pixels
function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, jumping: boolean) {
  const p = (px: number, py: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x + px, y - 24 + py, w, h);
  };

  const skin = '#6b3e26';
  // Head
  p(3, 0, 6, 6, skin);
  // Beanie/durag (black)
  p(2, 0, 8, 3, '#1a1a1a');
  // Eyes
  p(4, 3, 2, 1, '#eee');
  p(7, 3, 2, 1, '#eee');

  // Chain (gold)
  p(5, 7, 2, 1, '#d4aa30');

  // Torso (white tee)
  p(2, 6, 8, 8, '#e8e0d8');
  // Jacket (dark brown leather)
  p(0, 6, 2, 8, '#3a2518');
  p(10, 6, 2, 8, '#3a2518');

  // Arms
  const armOff = jumping ? -1 : (frame % 2 === 0 ? 0 : 1);
  p(0, 8 + armOff, 2, 5, skin);
  p(10, 8 - armOff, 2, 5, skin);

  // Pants (dark)
  p(3, 14, 3, 6, '#1a1a2e');
  p(7, 14, 3, 6, '#1a1a2e');

  // Legs animation
  if (jumping) {
    // Tucked legs
    p(3, 18, 3, 3, '#1a1a2e');
    p(7, 18, 3, 3, '#1a1a2e');
    // Shoes
    p(2, 21, 4, 3, '#222');
    p(7, 21, 4, 3, '#222');
  } else {
    const step = frame % 4;
    if (step < 2) {
      // Left forward
      p(2, 20, 4, 4, '#222');
      p(7, 19, 4, 4, '#222');
    } else {
      // Right forward
      p(2, 19, 4, 4, '#222');
      p(7, 20, 4, 4, '#222');
    }
  }
}

export function RunnerContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameState>({
    status: 'idle',
    playerY: GROUND_Y,
    velY: 0,
    obstacles: [],
    score: 0,
    speed: 1.2,
    spawnTimer: 0,
    spaceHeld: false,
    jumpHoldFrames: 0,
    frameId: 0,
    runFrame: 0,
    scrollX: 0,
  });

  const resetGame = useCallback(() => {
    const g = gameRef.current;
    g.status = 'playing';
    g.playerY = GROUND_Y;
    g.velY = 0;
    g.obstacles = [];
    g.score = 0;
    g.speed = 1.2;
    g.spawnTimer = 120;
    g.spaceHeld = false;
    g.jumpHoldFrames = 0;
    g.runFrame = 0;
    g.scrollX = 0;
  }, []);

  const spawnObstacle = useCallback(() => {
    const g = gameRef.current;
    const type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
    const color = SHAPE_COLORS[Math.floor(Math.random() * SHAPE_COLORS.length)];
    const size = 14 + Math.floor(Math.random() * 12);
    g.obstacles.push({ x: CANVAS_W + 20, type, color, size });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    function loop() {
      const g = gameRef.current;
      g.frameId = requestAnimationFrame(loop);

      // Background: night sky + stars + parallax city
      drawBackground(ctx, g.scrollX);

      if (g.status === 'idle') {
        drawPlayer(ctx, PLAYER_X, GROUND_Y, 0, false);
        // Title with glow
        ctx.shadowColor = '#e8c020';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#e8c020';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TRENCH RUNNER', CANVAS_W / 2, 65);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#8888aa';
        ctx.font = '10px monospace';
        ctx.fillText('Click to Play', CANVAS_W / 2, 82);
        ctx.textAlign = 'left';
        return;
      }

      if (g.status === 'dead') {
        drawPlayer(ctx, PLAYER_X, g.playerY, g.runFrame, false);
        for (const obs of g.obstacles) {
          drawShape(ctx, obs.type, obs.x, GROUND_Y, obs.size, obs.color);
        }
        ctx.fillStyle = 'rgba(5,5,15,0.6)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.shadowColor = '#e03030';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#e03030';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_W / 2, 55);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#e8c020';
        ctx.font = '12px monospace';
        ctx.fillText(`Score: ${g.score}`, CANVAS_W / 2, 78);
        ctx.fillStyle = '#8888aa';
        ctx.font = '10px monospace';
        ctx.fillText('Space to Retry', CANVAS_W / 2, 100);
        ctx.textAlign = 'left';
        return;
      }

      // --- Playing ---

      // Walk animation frame
      if (g.score % 8 === 0) g.runFrame++;

      // Physics — hold space for higher jump (continuous boost)
      const inAir = g.playerY < GROUND_Y || g.velY < 0;
      if (inAir) {
        // Extra upward force while holding space (kinetic feel)
        if (g.spaceHeld && g.jumpHoldFrames < MAX_JUMP_HOLD_FRAMES && g.velY < 0) {
          g.velY += HOLD_BOOST;
          g.jumpHoldFrames++;
        }
        g.velY += GRAVITY;
        g.playerY += g.velY;
        if (g.playerY >= GROUND_Y) {
          g.playerY = GROUND_Y;
          g.velY = 0;
          g.jumpHoldFrames = 0;
        }
      }
      const isJumping = inAir;

      // Spawn — starts slow, gaps shrink as speed increases
      g.spawnTimer--;
      if (g.spawnTimer <= 0) {
        spawnObstacle();
        const baseGap = Math.max(70, 140 - g.speed * 8);
        g.spawnTimer = baseGap + Math.floor(Math.random() * 50);
      }

      // Move obstacles
      for (const obs of g.obstacles) {
        obs.x -= g.speed;
      }
      g.obstacles = g.obstacles.filter((o) => o.x > -30);

      // Collision
      for (const obs of g.obstacles) {
        const obsLeft = obs.x - obs.size / 2;
        const obsRight = obs.x + obs.size / 2;
        const obsTop = GROUND_Y - obs.size;
        const playerLeft = PLAYER_X;
        const playerRight = PLAYER_X + 12;
        const playerTop = g.playerY - 24;

        if (
          playerRight > obsLeft + 2 &&
          playerLeft < obsRight - 2 &&
          g.playerY > obsTop + 2 &&
          playerTop < GROUND_Y
        ) {
          g.status = 'dead';
          return;
        }
      }

      // Score & gradual difficulty
      g.score++;
      g.scrollX += g.speed;
      if (g.score % 100 === 0) {
        g.speed += 0.15;
      }

      // Draw obstacles
      for (const obs of g.obstacles) {
        drawShape(ctx, obs.type, obs.x, GROUND_Y, obs.size, obs.color);
      }

      // Draw player
      drawPlayer(ctx, PLAYER_X, g.playerY, g.runFrame, isJumping);

      // Score display — centered, grows with score
      const fontSize = Math.min(10 + Math.floor(g.score / 50) * 2, 48);
      ctx.fillStyle = '#e8c020';
      ctx.shadowColor = '#e8c020';
      ctx.shadowBlur = Math.min(4 + fontSize * 0.3, 16);
      ctx.globalAlpha = Math.max(0.25, 0.6 - fontSize * 0.008);
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${g.score}`, CANVAS_W / 2, CANVAS_H / 2 - 10);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    gameRef.current.frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(gameRef.current.frameId);
    };
  }, [spawnObstacle]);

  // Input handlers — jump on press, hold for height
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      const g = gameRef.current;

      if (g.status === 'dead') {
        resetGame();
        return;
      }
      if (g.status !== 'playing') return;

      g.spaceHeld = true;

      // Jump on first press (not repeat)
      if (!e.repeat && g.playerY >= GROUND_Y) {
        g.velY = JUMP_IMPULSE;
        g.jumpHoldFrames = 0;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      const g = gameRef.current;
      g.spaceHeld = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [resetGame]);

  const handleCanvasClick = useCallback(() => {
    const g = gameRef.current;
    if (g.status === 'idle') {
      resetGame();
    }
  }, [resetGame]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onClick={handleCanvasClick}
      style={{ display: 'block', width: '100%', height: CANVAS_H, imageRendering: 'pixelated', cursor: 'pointer' }}
      tabIndex={0}
    />
  );
}
