// Static-but-boiling world doodles. Each one exposes a draw(ctx, seed) function.
// They're placed in the world but their lines re-wobble every boil frame,
// so the whole page feels alive.

import { wobbleShape, wobbleLine, wobbleCircle, wobblePath, wobbleEllipse } from './sketch.js';
import { PAPER } from './paper.js';

const INK = PAPER.ink;
const INK_DEEP = PAPER.inkDeep;

function sun(ctx, x, y, seed) {
  ctx.save();
  ctx.translate(x, y);
  // crayon-ish yellow fill
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#C58A1A';
  wobbleCircle(ctx, 0, 0, 22, {
    wobble: 1.2,
    seed: seed + 1,
    segments: 26,
    fill: 'rgba(245, 200, 90, 0.85)',
  });
  // rays
  ctx.strokeStyle = '#A86C10';
  ctx.lineWidth = 2.0;
  const rays = 9;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const r1 = 26;
    const r2 = 36 + (i % 2) * 6;
    wobbleLine(ctx,
      Math.cos(a) * r1, Math.sin(a) * r1,
      Math.cos(a) * r2, Math.sin(a) * r2,
      { wobble: 0.6, seed: seed + 10 + i, segments: 4 }
    );
  }
  // tiny smile
  ctx.strokeStyle = INK_DEEP;
  ctx.lineWidth = 1.6;
  wobblePath(ctx, [[-5, 4], [-2, 7], [2, 7], [5, 4]], { wobble: 0.3, seed: seed + 50, segments: 4 });
  // eyes
  wobbleCircle(ctx, -5, -3, 1.4, { wobble: 0.25, seed: seed + 51, segments: 8, fill: INK_DEEP });
  wobbleCircle(ctx, 5, -3, 1.4, { wobble: 0.25, seed: seed + 52, segments: 8, fill: INK_DEEP });
  ctx.restore();
}

function cloud(ctx, x, y, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  // 4 overlapping bumps
  const bumps = [
    [-22, 0, 14],
    [ -6, -8, 16],
    [ 12, -4, 14],
    [ 22, 4, 11],
  ];
  // fill first (soft white)
  ctx.fillStyle = 'rgba(252, 247, 230, 0.88)';
  ctx.beginPath();
  for (const [bx, by, br] of bumps) {
    ctx.moveTo(bx + br, by);
    ctx.arc(bx, by, br, 0, Math.PI * 2);
  }
  ctx.fill();
  // outline (one big sketched contour)
  const pts = [
    [-32, 4],
    [-30, -4],
    [-22, -12],
    [-12, -16],
    [ -2, -20],
    [ 10, -18],
    [ 20, -10],
    [ 30, -2],
    [ 30, 8],
    [ 24, 12],
    [ 10, 14],
    [ -8, 14],
    [-22, 12],
    [-32, 8],
  ];
  wobbleShape(ctx, pts, { wobble: 1.0, seed: seed + 5, segments: 4 });
  ctx.restore();
}

function tree(ctx, x, y, seed) {
  // (x, y) is the base of the trunk
  ctx.save();
  ctx.translate(x, y);
  // trunk
  ctx.strokeStyle = '#5A3A20';
  ctx.lineWidth = 2.4;
  const trunkPts = [
    [-6, 0],
    [-5, -10],
    [-7, -22],
    [-5, -34],
    [ 5, -34],
    [ 7, -22],
    [ 5, -10],
    [ 6, 0],
  ];
  wobbleShape(ctx, trunkPts, {
    wobble: 0.8,
    seed: seed + 1,
    segments: 4,
    fill: '#A87856',
  });
  // a little bark detail
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(80, 50, 30, 0.55)';
  wobblePath(ctx, [[-3, -15], [-1, -22]], { wobble: 0.3, seed: seed + 2, segments: 3 });
  wobblePath(ctx, [[2, -10], [3, -18]], { wobble: 0.3, seed: seed + 3, segments: 3 });

  // foliage — fluffy cloud-like top with multiple lobes
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#2E4D2A';
  const foliagePts = [
    [-26, -36],
    [-30, -46],
    [-24, -58],
    [-12, -64],
    [  0, -68],
    [ 12, -66],
    [ 24, -60],
    [ 30, -50],
    [ 28, -38],
    [ 20, -32],
    [  8, -30],
    [ -8, -30],
    [-20, -32],
  ];
  wobbleShape(ctx, foliagePts, {
    wobble: 1.4,
    seed: seed + 4,
    segments: 5,
    fill: '#6B9E5A',
  });
  // a few inner curl marks (leaves)
  ctx.strokeStyle = 'rgba(35, 65, 30, 0.6)';
  ctx.lineWidth = 1.5;
  const curls = [
    [-12, -50], [4, -55], [14, -48], [-6, -42], [18, -40], [-20, -45]
  ];
  for (let i = 0; i < curls.length; i++) {
    const [cx, cy] = curls[i];
    wobblePath(ctx, [[cx - 3, cy], [cx, cy - 4], [cx + 3, cy]], {
      wobble: 0.3,
      seed: seed + 30 + i,
      segments: 3,
    });
  }
  // a single apple (red)
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#7C2218';
  wobbleCircle(ctx, 10, -42, 3.2, {
    wobble: 0.4,
    seed: seed + 80,
    segments: 12,
    fill: '#C53A2E',
  });
  ctx.strokeStyle = '#2E4D2A';
  wobbleLine(ctx, 10, -46, 11, -49, { wobble: 0.2, seed: seed + 81, segments: 3 });
  ctx.restore();
}

function flower(ctx, x, y, seed, color = '#C53A2E') {
  ctx.save();
  ctx.translate(x, y);
  // stem (drawn first)
  ctx.strokeStyle = '#2E4D2A';
  ctx.lineWidth = 1.8;
  wobblePath(ctx, [[0, 0], [-1, -8], [1, -16]], { wobble: 0.4, seed: seed + 1, segments: 4 });
  // one leaf
  ctx.fillStyle = '#6B9E5A';
  wobbleEllipse(ctx, -4, -8, 4, 2, {
    wobble: 0.3,
    seed: seed + 2,
    segments: 12,
    rotation: -Math.PI / 6,
    fill: '#6B9E5A',
  });
  // petals (5 around center)
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#7C2218';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * 4;
    const py = -16 + Math.sin(a) * 4;
    wobbleEllipse(ctx, px, py, 3.5, 2.2, {
      wobble: 0.4,
      seed: seed + 10 + i,
      segments: 10,
      rotation: a,
      fill: color,
    });
  }
  // center
  ctx.strokeStyle = '#6A4810';
  wobbleCircle(ctx, 0, -16, 1.8, {
    wobble: 0.2,
    seed: seed + 30,
    segments: 8,
    fill: '#E8C24A',
  });
  ctx.restore();
}

function hill(ctx, x, y, seed) {
  // a soft horizon hill behind the world
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#2E4D2A';
  ctx.lineWidth = 2.0;
  wobblePath(ctx, [
    [-200, 0],
    [-160, -14],
    [-100, -26],
    [ -40, -34],
    [  20, -30],
    [  80, -22],
    [ 140, -10],
    [ 200, 0],
  ], { wobble: 0.7, seed: seed + 1, segments: 8 });
  ctx.restore();
}

function sign(ctx, x, y, seed) {
  ctx.save();
  ctx.translate(x, y);
  // post
  ctx.strokeStyle = '#6A4810';
  ctx.lineWidth = 2.2;
  wobbleLine(ctx, 0, 0, 0, -34, { wobble: 0.4, seed: seed + 1, segments: 5 });
  // board
  const boardPts = [
    [-22, -34],
    [ 22, -34],
    [ 22, -52],
    [-22, -52],
  ];
  wobbleShape(ctx, boardPts, {
    wobble: 0.6,
    seed: seed + 2,
    segments: 4,
    fill: '#D8B070',
  });
  ctx.strokeStyle = '#6A4810';
  // nails
  wobbleCircle(ctx, -18, -37, 0.8, { wobble: 0.2, seed: seed + 5, segments: 6, fill: '#3A2A10' });
  wobbleCircle(ctx,  18, -37, 0.8, { wobble: 0.2, seed: seed + 6, segments: 6, fill: '#3A2A10' });
  wobbleCircle(ctx, -18, -49, 0.8, { wobble: 0.2, seed: seed + 7, segments: 6, fill: '#3A2A10' });
  wobbleCircle(ctx,  18, -49, 0.8, { wobble: 0.2, seed: seed + 8, segments: 6, fill: '#3A2A10' });

  // hand-written text "→ pueblo"
  ctx.fillStyle = INK_DEEP;
  ctx.font = "600 14px 'Patrick Hand', cursive";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.save();
  ctx.rotate(-0.04);
  ctx.fillText('→ pueblo', 0, -42);
  ctx.restore();

  ctx.restore();
}

function squiggle(ctx, x, y, seed) {
  // a margin doodle — meaningless scribble, for atmosphere
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PAPER.pencil;
  ctx.lineWidth = 1.4;
  const pts = [];
  for (let i = 0; i < 8; i++) {
    pts.push([i * 5 - 18, Math.sin(i * 1.3) * 4]);
  }
  wobblePath(ctx, pts, { wobble: 0.5, seed: seed + 1, segments: 3 });
  ctx.restore();
}

// ============================================================
//  Page 2 — Math notebook decorations (pencil scribbles)
// ============================================================

function pencilText(text, font, color, rotation) {
  return function(ctx, x, y, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation || 0);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };
}

function triangleDoodle(ctx, x, y, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PAPER.pencil;
  ctx.lineWidth = 2.2;
  wobbleShape(ctx, [[-36, 28], [0, -38], [36, 28]], { wobble: 1.4, seed: seed + 1, segments: 6 });
  ctx.font = "400 18px 'Patrick Hand'";
  ctx.fillStyle = PAPER.pencil;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('a', -25, -2);
  ctx.fillText('b', 25, -2);
  ctx.fillText('c', 0, 38);
  ctx.restore();
}

function circleDoodle(ctx, x, y, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PAPER.pencil;
  ctx.lineWidth = 2.2;
  wobbleCircle(ctx, 0, 0, 36, { wobble: 1.6, seed: seed + 1, segments: 22 });
  // diameter line
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(90, 90, 90, 0.55)';
  wobbleLine(ctx, -34, 0, 34, 0, { wobble: 0.5, seed: seed + 2, segments: 6 });
  ctx.font = "400 14px 'Patrick Hand'";
  ctx.fillStyle = PAPER.pencil;
  ctx.textAlign = 'center';
  ctx.fillText('r', 16, -4);
  ctx.restore();
}

function fractionDoodle(ctx, x, y, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.font = "400 42px 'Patrick Hand'";
  ctx.fillStyle = PAPER.pencil;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // numerator
  ctx.fillText('a²+b²', 0, -22);
  // bar
  ctx.strokeStyle = PAPER.pencil;
  ctx.lineWidth = 2.4;
  wobbleLine(ctx, -38, 0, 38, 0, { wobble: 0.5, seed: seed + 1, segments: 6 });
  // denominator
  ctx.fillText('c²', 0, 22);
  ctx.restore();
}

function axesDoodle(ctx, x, y, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PAPER.pencil;
  ctx.lineWidth = 2;
  // y axis
  wobbleLine(ctx, 0, -40, 0, 40, { wobble: 0.5, seed: seed + 1, segments: 6 });
  // x axis
  wobbleLine(ctx, -50, 0, 50, 0, { wobble: 0.5, seed: seed + 2, segments: 6 });
  // arrowheads
  wobbleLine(ctx, 0, -40, -5, -32, { wobble: 0.3, seed: seed + 3, segments: 3 });
  wobbleLine(ctx, 0, -40,  5, -32, { wobble: 0.3, seed: seed + 4, segments: 3 });
  wobbleLine(ctx, 50, 0, 42, -5, { wobble: 0.3, seed: seed + 5, segments: 3 });
  wobbleLine(ctx, 50, 0, 42,  5, { wobble: 0.3, seed: seed + 6, segments: 3 });
  // curve
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = '#7C2218';
  wobblePath(ctx, [[-40, 30], [-20, 10], [0, -20], [20, -28], [40, -22]], {
    wobble: 0.6, seed: seed + 7, segments: 4,
  });
  // labels
  ctx.font = "400 14px 'Patrick Hand'";
  ctx.fillStyle = PAPER.pencil;
  ctx.textAlign = 'center';
  ctx.fillText('x', 56, 8);
  ctx.fillText('y', -8, -44);
  ctx.restore();
}

export function buildScene2(w, h) {
  return [
    // page title
    { x: w * 0.50, y: 60, draw: pencilText('— mate (martes) —', "700 30px 'Caveat'", '#1F2A4A', -0.01) },

    // top row of scribbles
    { x: w * 0.30, y: h * 0.18, draw: pencilText('x² + y² = r²', "400 32px 'Patrick Hand'", '#5A5A5A', -0.05) },
    { x: w * 0.70, y: h * 0.16, draw: pencilText('π ≈ 3.14...', "400 28px 'Patrick Hand'", '#5A5A5A', 0.04) },

    // middle math
    { x: w * 0.22, y: h * 0.42, draw: triangleDoodle },
    { x: w * 0.45, y: h * 0.40, draw: fractionDoodle },
    { x: w * 0.78, y: h * 0.40, draw: circleDoodle },

    // axes / function
    { x: w * 0.32, y: h * 0.72, draw: axesDoodle },

    // a scribbled-over equation that survived
    { x: w * 0.60, y: h * 0.74, draw: pencilText('2 + 2 = ?', "400 38px 'Patrick Hand'", '#1F2A4A', 0.03) },

    // infinity
    { x: w * 0.85, y: h * 0.78, draw: pencilText('∞', "700 64px 'Caveat'", '#5A5A5A', -0.08) },

    // edge hint — go left to return to page 1
    { x: 110, y: h * 0.50, draw: edgeHint('←  pág. 1', 'left', 0.04) },
    { x: 110, y: h * 0.30, draw: edgeHint('←', 'left', 0) },
    { x: 110, y: h * 0.68, draw: edgeHint('←', 'left', 0) },
  ];
}

function edgeHint(text, side, rotation) {
  return function(ctx, x, y, seed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation || 0);
    ctx.font = "700 22px 'Caveat'";
    ctx.fillStyle = 'rgba(60, 40, 20, 0.62)';
    ctx.textAlign = side === 'right' ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    // hand-drawn underline squiggle
    const w = ctx.measureText(text).width;
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.5)';
    ctx.lineWidth = 1.4;
    const startX = side === 'right' ? -w : 0;
    ctx.beginPath();
    for (let dx = startX; dx <= startX + w; dx += 3) {
      const yy = 14 + Math.sin((dx - startX) * 0.4) * 0.8;
      if (dx === startX) ctx.moveTo(dx, yy);
      else ctx.lineTo(dx, yy);
    }
    ctx.stroke();
    ctx.restore();
  };
}

export function buildScene1(w, h) {
  return [
    // background hills (drawn first)
    { x: w * 0.5, y: h * 0.55, draw: hill },
    { x: w * 0.78, y: h * 0.42, draw: hill },

    // sun, clouds
    { x: w * 0.82, y: 130, draw: sun },
    { x: w * 0.32, y: 110, draw: cloud },
    { x: w * 0.62, y: 80,  draw: cloud },

    // tree
    { x: w * 0.25, y: h * 0.78, draw: tree },
    { x: w * 0.74, y: h * 0.86, draw: tree },

    // flowers
    { x: w * 0.42, y: h * 0.86, draw: (c, x, y, s) => flower(c, x, y, s, '#C53A2E') },
    { x: w * 0.50, y: h * 0.90, draw: (c, x, y, s) => flower(c, x, y, s, '#D8A02E') },
    { x: w * 0.58, y: h * 0.86, draw: (c, x, y, s) => flower(c, x, y, s, '#8E4ABF') },
    { x: w * 0.66, y: h * 0.92, draw: (c, x, y, s) => flower(c, x, y, s, '#E64FA0') },
    { x: w * 0.34, y: h * 0.90, draw: (c, x, y, s) => flower(c, x, y, s, '#3A8FCB') },

    // sign post toward the village
    { x: w * 0.85, y: h * 0.74, draw: sign },

    // edge hint — go right to reach page 2
    { x: w - 30, y: h * 0.50, draw: edgeHint('pág. 2  →', 'right', -0.04) },
    { x: w - 30, y: h * 0.30, draw: edgeHint('→', 'right', 0) },
    { x: w - 30, y: h * 0.68, draw: edgeHint('→', 'right', 0) },

    // margin squiggles (between the spiral holes and the margin line)
    { x: 56, y: h * 0.18, draw: squiggle },
    { x: 56, y: h * 0.46, draw: squiggle },
    { x: 56, y: h * 0.78, draw: squiggle },
  ];
}

export function drawScene(ctx, scene, seed) {
  // sort by y (painter's algo for depth)
  const sorted = [...scene].sort((a, b) => a.y - b.y);
  for (const item of sorted) {
    item.draw(ctx, item.x, item.y, seed + Math.floor(item.x * 0.3) + Math.floor(item.y * 0.7));
  }
}
