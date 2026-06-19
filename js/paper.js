// The notebook page. Rendered ONCE per resize into an offscreen canvas:
// printed paper doesn't boil — only the hand-drawn doodles on top of it do.

import { wobbleLine, rand } from './sketch.js';

export const PAPER = {
  cream:        '#F3EAD0',
  creamShadow:  '#E6DAB5',
  creamHi:      '#FAF3DC',
  grid:         '#9CB6CC',
  gridStrong:   '#7A99B5',
  margin:       '#B5413B',
  hole:         '#1c1814',
  ink:          '#1F2A4A',
  inkDeep:      '#141B33',
  pencil:       '#5A5A5A',
  pencilLight:  '#8E8B7E',
  red:          '#B5413B',
};

export const CELL = 32;
export const MARGIN_X = CELL * 3;
export const TOP_PAD = CELL * 2;

let cache = null;
let cacheW = 0;
let cacheH = 0;
let cacheDpr = 0;

export function invalidatePaper() {
  cache = null;
}

export function renderPaper(ctx, w, h, dpr) {
  if (cache && cacheW === w && cacheH === h && cacheDpr === dpr) {
    ctx.drawImage(cache, 0, 0, w, h);
    return;
  }
  buildCache(w, h, dpr);
  ctx.drawImage(cache, 0, 0, w, h);
}

function buildCache(w, h, dpr) {
  cache = document.createElement('canvas');
  cache.width = Math.ceil(w * dpr);
  cache.height = Math.ceil(h * dpr);
  const c = cache.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 1. base paper with a soft vertical tint
  const grad = c.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, PAPER.creamHi);
  grad.addColorStop(0.5, PAPER.cream);
  grad.addColorStop(1, PAPER.creamShadow);
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);

  // 2. paper grain
  drawGrain(c, w, h);

  // 3. faint vertical fibers
  drawFibers(c, w, h);

  // 4. the cuadrícula (grid)
  drawGrid(c, w, h);

  // 5. the red margin line — wobbly, drawn in pen
  c.strokeStyle = PAPER.margin;
  c.lineWidth = 2.2;
  c.lineCap = 'round';
  wobbleLine(c, MARGIN_X, -16, MARGIN_X, h + 16, {
    wobble: 0.9,
    seed: 7,
    segments: Math.ceil(h / 12),
    taper: false,
  });
  // a second very faint pass for ink bleed
  c.save();
  c.globalAlpha = 0.25;
  c.lineWidth = 4;
  wobbleLine(c, MARGIN_X, -16, MARGIN_X, h + 16, {
    wobble: 1.2,
    seed: 7,
    segments: Math.ceil(h / 12),
    taper: false,
  });
  c.restore();

  // 6. spiral holes along the left edge
  drawSpiralHoles(c, h);

  // 7. corner fold (top right)
  drawCornerFold(c, w);

  // 8. coffee/pencil stains (a few)
  drawStains(c, w, h);

  // 9. vignette (darker toward edges)
  drawVignette(c, w, h);

  cacheW = w;
  cacheH = h;
  cacheDpr = dpr;
}

function drawGrain(ctx, w, h) {
  // fine speckles
  const area = w * h;
  const count = Math.floor(area / 900);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rand(i * 1.31) * w;
    const y = rand(i * 2.71) * h;
    const v = rand(i * 0.91);
    const alpha = 0.03 + v * 0.05;
    ctx.fillStyle = v < 0.5
      ? `rgba(120, 90, 40, ${alpha})`
      : `rgba(255, 250, 230, ${alpha})`;
    const sz = 1 + v * 1.2;
    ctx.fillRect(x, y, sz, sz);
  }
  ctx.restore();
}

function drawFibers(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 0.6;
  const n = Math.floor(w / 18);
  for (let i = 0; i < n; i++) {
    const x = rand(i * 4.7) * w;
    const y1 = rand(i * 6.1) * h;
    const y2 = y1 + 30 + rand(i * 9.3) * 80;
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.bezierCurveTo(x + 4, y1 + 20, x - 6, y2 - 20, x + 2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGrid(ctx, w, h) {
  // Light cuadrícula
  ctx.save();
  ctx.strokeStyle = PAPER.grid;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.32;
  for (let x = 0; x <= w; x += CELL) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += CELL) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();

  // Slightly stronger every 5 cells (math notebook style)
  ctx.save();
  ctx.strokeStyle = PAPER.gridStrong;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45;
  for (let x = 0; x <= w; x += CELL * 5) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += CELL * 5) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpiralHoles(ctx, h) {
  const x = 18;
  const r = 9;
  const spacing = 64;
  for (let y = spacing * 0.6; y < h; y += spacing) {
    // shadow on paper
    ctx.save();
    ctx.fillStyle = 'rgba(50, 30, 10, 0.16)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, r + 5, r + 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // dark hole punch
    ctx.fillStyle = PAPER.hole;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // inner gradient
    const g = ctx.createRadialGradient(x - 2, y - 3, 0, x, y, r);
    g.addColorStop(0, 'rgba(80, 60, 40, 0.6)');
    g.addColorStop(0.6, 'rgba(20, 12, 8, 0.95)');
    g.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // tiny rim highlight
    ctx.strokeStyle = 'rgba(255, 245, 220, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y - 1, r - 1.5, Math.PI * 0.6, Math.PI * 0.95);
    ctx.stroke();
  }
}

function drawCornerFold(ctx, w) {
  // top-right corner folded down
  const size = 38;
  ctx.save();
  // shadow under the fold
  ctx.fillStyle = 'rgba(60, 40, 20, 0.12)';
  ctx.beginPath();
  ctx.moveTo(w - size - 2, 0);
  ctx.lineTo(w, size + 2);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  // the folded triangle (paler/cream underside)
  ctx.fillStyle = PAPER.creamShadow;
  ctx.beginPath();
  ctx.moveTo(w - size, 0);
  ctx.lineTo(w, size);
  ctx.lineTo(w, 0);
  ctx.closePath();
  ctx.fill();
  // fold crease
  ctx.strokeStyle = 'rgba(60, 40, 20, 0.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(w - size, 0);
  ctx.lineTo(w, size);
  ctx.stroke();
  ctx.restore();
}

function drawStains(ctx, w, h) {
  const stains = [
    { x: 0.18, y: 0.74, r: 70, c: 'rgba(140, 90, 40, 0.08)' },
    { x: 0.82, y: 0.32, r: 90, c: 'rgba(120, 80, 30, 0.06)' },
    { x: 0.55, y: 0.88, r: 50, c: 'rgba(100, 70, 30, 0.07)' },
    { x: 0.32, y: 0.18, r: 40, c: 'rgba(120, 80, 40, 0.05)' },
  ];
  for (const s of stains) {
    const cx = s.x * w;
    const cy = s.y * h;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, s.r);
    g.addColorStop(0, s.c);
    g.addColorStop(1, s.c.replace(/[\d.]+\)/, '0)'));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(
    w * 0.5, h * 0.5, Math.min(w, h) * 0.35,
    w * 0.5, h * 0.5, Math.max(w, h) * 0.85
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(40, 25, 10, 0.22)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // soft top shadow (page weight)
  const g2 = ctx.createLinearGradient(0, 0, 0, 30);
  g2.addColorStop(0, 'rgba(40, 25, 10, 0.18)');
  g2.addColorStop(1, 'rgba(40, 25, 10, 0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, w, 30);
}
