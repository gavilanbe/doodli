// Hand-drawn rendering primitives.
// Every shape gets its outline sampled and perturbed by deterministic noise,
// so passing a new `seed` each frame produces the "boiling line" effect.

const TAU = Math.PI * 2;

export function rand(seed) {
  const x = Math.sin(seed * 12.9898 + 4.7) * 43758.5453;
  return x - Math.floor(x);
}

function sampleLine(x1, y1, x2, y2, segments, wobble, seed, taperStart, taperEnd) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const bx = x1 + dx * t;
    const by = y1 + dy * t;
    let taper = 1;
    if (taperStart) taper *= Math.min(1, t * 3);
    if (taperEnd) taper *= Math.min(1, (1 - t) * 3);
    const off = (rand(seed + i * 7.13) - 0.5) * 2 * wobble * taper;
    pts.push([bx + nx * off, by + ny * off]);
  }
  return pts;
}

function strokeSmooth(ctx, pts, closed = false) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  if (closed) {
    const last = pts[pts.length - 1];
    const first = pts[0];
    ctx.quadraticCurveTo(last[0], last[1], (last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    ctx.closePath();
  } else {
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }
  ctx.stroke();
}

function fillSmooth(ctx, pts) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.closePath();
  ctx.fill();
}

export function wobbleLine(ctx, x1, y1, x2, y2, opts = {}) {
  const wobble = opts.wobble ?? 1.2;
  const seed = opts.seed ?? 0;
  const taper = opts.taper ?? true;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const segs = opts.segments ?? Math.max(6, Math.ceil(len / 14));
  const pts = sampleLine(x1, y1, x2, y2, segs, wobble, seed, taper, taper);
  strokeSmooth(ctx, pts, false);
}

export function wobbleShape(ctx, points, opts = {}) {
  const wobble = opts.wobble ?? 1.4;
  const seed = opts.seed ?? 0;
  const segments = opts.segments ?? 5;
  const fill = opts.fill ?? null;
  const stroke = opts.stroke ?? true;
  const allPts = [];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    const seg = sampleLine(x1, y1, x2, y2, segments, wobble, seed + i * 31.7, false, false);
    if (i > 0) seg.shift();
    allPts.push(...seg);
  }
  if (fill) {
    ctx.save();
    ctx.fillStyle = fill;
    fillSmooth(ctx, allPts);
    ctx.restore();
  }
  if (stroke) strokeSmooth(ctx, allPts, true);
}

export function wobbleCircle(ctx, cx, cy, r, opts = {}) {
  const wobble = opts.wobble ?? 1.2;
  const seed = opts.seed ?? 0;
  const fill = opts.fill ?? null;
  const stroke = opts.stroke ?? true;
  const segs = opts.segments ?? Math.max(16, Math.ceil(r * 1.5));
  const pts = [];
  const start = (rand(seed + 991) - 0.5) * 0.8;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const ang = start + t * TAU;
    const wob = (rand(seed + i * 13.3) - 0.5) * wobble * 2;
    const rr = Math.max(0.2, r + wob);
    pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
  }
  if (fill) {
    ctx.save();
    ctx.fillStyle = fill;
    fillSmooth(ctx, pts);
    ctx.restore();
  }
  if (stroke) strokeSmooth(ctx, pts, true);
}

export function wobbleEllipse(ctx, cx, cy, rx, ry, opts = {}) {
  const wobble = opts.wobble ?? 1.2;
  const seed = opts.seed ?? 0;
  const rotation = opts.rotation ?? 0;
  const fill = opts.fill ?? null;
  const stroke = opts.stroke ?? true;
  const segs = opts.segments ?? Math.max(18, Math.ceil((rx + ry) * 0.7));
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);
  const pts = [];
  const start = (rand(seed + 991) - 0.5) * 0.6;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const ang = start + t * TAU;
    const wob = (rand(seed + i * 13.3) - 0.5) * wobble * 2;
    const px = Math.cos(ang) * (rx + wob);
    const py = Math.sin(ang) * (ry + wob);
    pts.push([cx + px * cosR - py * sinR, cy + px * sinR + py * cosR]);
  }
  if (fill) {
    ctx.save();
    ctx.fillStyle = fill;
    fillSmooth(ctx, pts);
    ctx.restore();
  }
  if (stroke) strokeSmooth(ctx, pts, true);
}

// A free-form hand-drawn path through arbitrary points (not closed).
export function wobblePath(ctx, points, opts = {}) {
  const wobble = opts.wobble ?? 1.0;
  const seed = opts.seed ?? 0;
  const segments = opts.segments ?? 6;
  const n = points.length;
  if (n < 2) return;
  const allPts = [];
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const taperStart = i === 0;
    const taperEnd = i === n - 2;
    const seg = sampleLine(x1, y1, x2, y2, segments, wobble, seed + i * 41.3, taperStart, taperEnd);
    if (i > 0) seg.shift();
    allPts.push(...seg);
  }
  strokeSmooth(ctx, allPts, false);
}
