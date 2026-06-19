// Enemies that live on the tilemap. Touching one triggers combat.

import { wobbleShape, wobbleCircle, wobblePath, wobbleLine } from './sketch.js';

export class InkBlot {
  constructor(cellX, cellY, tilemap, opts = {}) {
    this.cellX = cellX;
    this.cellY = cellY;
    this.tilemap = tilemap;
    const p = tilemap.cellToPixel(cellX, cellY);
    this.x = p.x;
    this.y = p.y;
    this.name = opts.name || 'Mancha de Tinta';
    this.maxHp = opts.hp ?? 6;
    this.hp = this.maxHp;
    this.atk = opts.atk ?? 2;
    this.def = opts.def ?? 0;
    this.exp = opts.exp ?? 4;
    this.alive = true;
    this.idleT = Math.random() * 6;
  }

  update(dt) { this.idleT += dt; }

  draw(ctx, seed) {
    drawInkBlot(ctx, this.x, this.y - 14, 0.65, seed, this.idleT);
  }

  drawBig(ctx, x, y, seed, scale = 1.6, shakeX = 0, shakeY = 0) {
    drawInkBlot(ctx, x + shakeX, y + shakeY, scale, seed, this.idleT);
  }
}

function drawInkBlot(ctx, cx, cy, scale, seed, idleT) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // soft breathing pulse
  const pulse = 1 + Math.sin(idleT * 1.7) * 0.04;
  ctx.scale(pulse, pulse);

  // shadow on the paper
  ctx.fillStyle = 'rgba(20, 15, 10, 0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 38, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // splatter droplets
  const drops = [[-30, 18, 4], [26, 20, 5], [-14, 26, 3], [10, 24, 2.5]];
  for (let i = 0; i < drops.length; i++) {
    const [dx, dy, dr] = drops[i];
    wobbleCircle(ctx, dx, dy, dr, {
      wobble: 0.6,
      seed: seed + 31 + i * 7,
      segments: 12,
      fill: '#1A2240',
      stroke: false,
    });
  }

  // main blob silhouette
  const blob = [
    [-38,  4],
    [-50, -8],
    [-46, -22],
    [-32, -36],
    [-12, -42],
    [ 12, -44],
    [ 32, -36],
    [ 48, -22],
    [ 52, -6],
    [ 46, 10],
    [ 30, 20],
    [ 10, 24],
    [-12, 22],
    [-30, 16],
  ];
  ctx.strokeStyle = '#06060F';
  ctx.lineWidth = 2;
  wobbleShape(ctx, blob, {
    wobble: 2.6,
    seed: seed + 1,
    segments: 5,
    fill: '#1B2348',
  });

  // glossy highlight on top of blob
  ctx.fillStyle = 'rgba(170, 200, 250, 0.18)';
  ctx.beginPath();
  ctx.ellipse(-10, -28, 14, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // eyes (white, with dark pupils)
  wobbleCircle(ctx, -11, -16, 5.4, { wobble: 0.4, seed: seed + 41, segments: 14, fill: '#F8F0D2' });
  wobbleCircle(ctx,  13, -16, 5.4, { wobble: 0.4, seed: seed + 42, segments: 14, fill: '#F8F0D2' });
  ctx.fillStyle = '#06060F';
  ctx.beginPath(); ctx.arc(-10, -15, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc( 14, -15, 2.2, 0, Math.PI * 2); ctx.fill();

  // grumpy mouth (light line, downward)
  ctx.strokeStyle = '#F8F0D2';
  ctx.lineWidth = 1.8;
  wobblePath(ctx, [[-9, 2], [-4, -2], [4, -2], [9, 2]], { wobble: 0.4, seed: seed + 51, segments: 4 });

  ctx.restore();
}
