import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://trenchgrails.vercel.app';
const SCENE_URL = 'https://prod.spline.design/fNEyIuTyKEBBMlkQ/scene.splinecode?v=3';
const SPLINE_RUNTIME_CDN = 'https://unpkg.com/@splinetool/runtime@1.12.68/build/runtime.js';

const RARITY_LABELS: Record<string, string> = {
  common: 'COMMON',
  uncommon: 'UNCOMMON',
  rare: 'RARE',
  epic: 'EPIC',
  legendary: 'LEGENDARY',
};

/**
 * GET /nft/card/[card_number]
 * Serves a standalone HTML page that renders a 3D interactive NFT card
 * using Spline runtime. Used as `animation_url` in NFT metadata.
 * Marketplaces (Magic Eden, Tensor) render this in an iframe.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ card_number: string }> },
) {
  const { card_number } = await params;
  const num = parseInt(card_number, 10);
  if (isNaN(num) || num < 1 || num > 999) {
    return new NextResponse('Invalid card number', { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: card, error } = await supabase
    .from('cards')
    .select('*')
    .eq('card_number', num)
    .single();

  if (error || !card) {
    return new NextResponse('Card not found', { status: 404 });
  }

  // Build card content (same logic as cardToSplineContent)
  let title: string, description: string, stats: string, material: string;

  if (card.card_type && card.name) {
    title = card.name.toUpperCase();
    description = card.perk_1_name
      ? `${card.perk_1_name}: ${card.perk_1_desc || ''}`
      : card.perk_1_desc || card.ability || '';
    stats = card.card_type === 'hero' ? `${card.atk} / ${card.hp}` : '';
    material = card.card_type === 'hero'
      ? (card.hero_class || 'hero').toUpperCase()
      : card.card_type === 'land'
        ? (card.shape || 'land').toUpperCase()
        : 'ARTIFACT';
  } else {
    title = (card.shape || '').toUpperCase();
    description = card.ability || '';
    stats = `${card.atk} / ${card.def}`;
    material = (card.material || '').toUpperCase();
  }

  const cardNumber = `#${String(card.card_number).padStart(3, '0')}`;
  const rarity = RARITY_LABELS[card.rarity_tier] || 'COMMON';
  const manaCost = String(card.mana_cost ?? 0);

  // Art URL — use art-proxy for CORS-safe WebGL texture loading
  let artUrl = '';
  if (card.raw_art_path) {
    const clean = card.raw_art_path.replace(/^raw-arts\//, '');
    artUrl = `${APP_URL}/api/art-proxy?path=${encodeURIComponent(clean)}`;
  }

  // Escape strings for safe JS embedding
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} ${cardNumber} — Trench Grails</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; }
    #container { width: 100%; height: 100%; position: relative; }
    canvas { display: block; }
    #loader {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.02);
      transition: opacity 0.6s;
    }
    #loader.hidden { opacity: 0; pointer-events: none; }
    .spinner {
      width: 32px; height: 32px; border-radius: 50%;
      border: 2px solid rgba(255,102,0,0.25);
      border-top-color: transparent;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div id="container">
    <canvas id="canvas3d"></canvas>
    <div id="loader"><div class="spinner"></div></div>
  </div>

  <script type="module">
    import { Application } from '${SPLINE_RUNTIME_CDN}';

    const CARD = {
      title: '${esc(title)}',
      description: '${esc(description)}',
      cardNumber: '${esc(cardNumber)}',
      rarity: '${esc(rarity)}',
      stats: '${esc(stats)}',
      manaCost: '${esc(manaCost)}',
      material: '${esc(material)}',
      artUrl: '${esc(artUrl)}',
    };

    const TEXT_FIELDS = [
      { objectName: 'CardTitle',       key: 'title',       hint: 'SHAPE' },
      { objectName: 'CardDescription', key: 'description', hint: 'Base power' },
      { objectName: '#date',           key: 'cardNumber' },
      { objectName: 'CardRare',        key: 'rarity' },
      { objectName: 'CardStats',       key: 'stats' },
      { objectName: 'Mana Cost',       key: 'manaCost' },
      { objectName: 'Cardtype',        key: 'material' },
    ];

    // ── Scene helpers ──
    function findScene(app) {
      return app._scene || app.scene || app._proxyScene || app._world || null;
    }
    function findSharedAssets(app) {
      return app._sharedAssetsManager || app._sharedAssets || app.sharedAssets || null;
    }
    function getTextValue(obj) {
      const t = obj.textGeometry?.text;
      if (typeof t === 'object') return t?.textValue || '';
      return typeof t === 'string' ? t : '';
    }

    function buildTextObjectMap(scene) {
      const map = new Map();
      const add = (obj) => {
        if (!obj.textGeometry) return;
        const name = (obj.data?.name || obj.name || '').trim();
        if (!name) return;
        if (!map.has(name)) map.set(name, []);
        map.get(name).push(obj);
      };
      if (typeof scene.traverseEntity === 'function') {
        scene.traverseEntity(add);
      } else {
        const walk = (o) => { add(o); for (const c of o.children || []) walk(c); };
        walk(scene);
      }
      return map;
    }

    function findTextObj(map, name, hint) {
      let matches = map.get(name);
      if (!matches) {
        const t = name.trim();
        for (const [k, v] of map) { if (k.trim() === t) { matches = v; break; } }
      }
      if (!matches?.length) return null;
      if (matches.length === 1) return matches[0];
      if (hint) {
        const h = matches.find(o => getTextValue(o).trim() === hint);
        if (h) return h;
      }
      return matches[matches.length - 1];
    }

    // ── Apply card data ──
    async function applyContent(app) {
      const scene = findScene(app);
      const shared = findSharedAssets(app);
      if (!scene) return false;

      const map = buildTextObjectMap(scene);

      for (const f of TEXT_FIELDS) {
        const val = CARD[f.key] || ' ';
        const obj = findTextObj(map, f.objectName, f.hint);
        if (!obj?.textGeometry?.setText) continue;
        try {
          await obj.textGeometry.setText(val, shared);
        } catch (e) { console.warn('setText failed:', f.objectName, e); }
      }

      // Request render
      if (shared?.requestRender) shared.requestRender();
      else if (app.requestRender) app.requestRender();

      // Art texture
      if (CARD.artUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = CARD.artUrl; });
          const c = document.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          const dataUrl = c.toDataURL('image/png');
          const artProxy = app.findObjectByName('CardArt');
          if (artProxy?.material?.layers) {
            const texLayer = artProxy.material.layers.find(l => l.type === 'texture');
            if (texLayer?.updateTexture) {
              await texLayer.updateTexture(dataUrl);
              if (shared?.requestRender) shared.requestRender();
              else if (app.requestRender) app.requestRender();
            }
          }
        } catch (e) { console.warn('Art texture failed:', e); }
      }

      return true;
    }

    // ── Init ──
    const canvas = document.getElementById('canvas3d');
    const container = document.getElementById('container');
    const loader = document.getElementById('loader');

    const app = new Application(canvas);
    await app.load('${SCENE_URL}');

    // Scale canvas to fill container
    requestAnimationFrame(() => {
      if (canvas.clientWidth > 0) {
        const zoom = 1.45;
        const sx = container.clientWidth / canvas.clientWidth;
        const sy = container.clientHeight / canvas.clientHeight;
        const s = Math.min(sx, sy) * zoom;
        const ox = (container.clientWidth - canvas.clientWidth * s) / 2;
        const oy = (container.clientHeight - canvas.clientHeight * s) / 2;
        canvas.style.transformOrigin = 'top left';
        canvas.style.transform = 'translate(' + ox + 'px, ' + oy + 'px) scale(' + s + ')';
      }
    });

    // Apply content after font init delay
    setTimeout(async () => {
      await applyContent(app);
      loader.classList.add('hidden');
      // Safety retry
      setTimeout(() => applyContent(app), 1200);
    }, 800);
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      // Allow iframe embedding on marketplaces
      'X-Frame-Options': 'ALLOWALL',
      'Content-Security-Policy': "frame-ancestors *",
    },
  });
}
