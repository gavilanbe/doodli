// NPCs that live on the tilemap and can be talked to.

import { wobbleLine, wobbleCircle, wobblePath } from './sketch.js';
import { PAPER } from './paper.js';

export class Stickman {
  constructor(cellX, cellY, tilemap, opts = {}) {
    this.cellX = cellX;
    this.cellY = cellY;
    this.tilemap = tilemap;
    const p = tilemap.cellToPixel(cellX, cellY);
    this.x = p.x;
    this.y = p.y;
    this.label = opts.label || 'Sticky';
    this.script = opts.script || [];
    this.idleT = Math.random() * 6;
  }

  // Stickmen are obstacles — the player can't walk onto their cell.
  blocks() { return true; }

  update(dt) {
    this.idleT += dt;
  }

  draw(ctx, seed) {
    // slow idle sway
    const sway = Math.sin(this.idleT * 1.4) * 0.6;

    ctx.save();
    ctx.translate(this.x, this.y);

    // soft shadow
    ctx.fillStyle = 'rgba(40, 25, 10, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 13, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // body trunk
    wobbleLine(ctx, 0, -10, 0 + sway, -28, { wobble: 0.5, seed: seed + 1, segments: 5 });
    // arms (slightly down-out)
    wobbleLine(ctx, 0 + sway * 0.5, -24, -10, -16, { wobble: 0.5, seed: seed + 2, segments: 4 });
    wobbleLine(ctx, 0 + sway * 0.5, -24,  10, -16, { wobble: 0.5, seed: seed + 3, segments: 4 });
    // legs
    wobbleLine(ctx, 0, -10, -7, -2, { wobble: 0.5, seed: seed + 4, segments: 4 });
    wobbleLine(ctx, 0, -10,  7, -2, { wobble: 0.5, seed: seed + 5, segments: 4 });
    // head circle
    wobbleCircle(ctx, sway, -36, 9, {
      wobble: 0.6,
      seed: seed + 6,
      segments: 16,
      fill: '#FAF1D5',
    });
    ctx.strokeStyle = PAPER.ink;
    wobbleCircle(ctx, sway, -36, 9, {
      wobble: 0.6,
      seed: seed + 6,
      segments: 16,
      fill: null,
    });
    // face
    wobbleCircle(ctx, sway - 3, -37, 1.2, { wobble: 0.2, seed: seed + 7, segments: 8, fill: PAPER.inkDeep });
    wobbleCircle(ctx, sway + 3, -37, 1.2, { wobble: 0.2, seed: seed + 8, segments: 8, fill: PAPER.inkDeep });
    wobblePath(ctx, [[sway - 2, -33], [sway, -32], [sway + 2, -33]], { wobble: 0.2, seed: seed + 9, segments: 3 });

    // a tiny "interactable" hint — a small floating mark above when player nearby?
    // (we'll handle this from main.js if needed)

    ctx.restore();
  }
}
