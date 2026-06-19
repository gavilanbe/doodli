// Battle field decorations — composed ON TOP of the real world (the page where
// the enemy lives). The world stays visible behind a dark overlay; this module
// adds the arena, spotlights, perspective lines, sparks and corner doodles.

import { wobbleShape, wobbleLine, wobbleCircle, rand } from './sketch.js';

// Dim the world so the battle reads, but keep page decorations recognizable.
export function drawBattleDim(ctx, viewW, viewH) {
  // dark warm wash
  ctx.fillStyle = 'rgba(18, 10, 4, 0.62)';
  ctx.fillRect(0, 0, viewW, viewH);
  // subtle amber tint on top
  const g = ctx.createLinearGradient(0, 0, 0, viewH);
  g.addColorStop(0, 'rgba(80, 50, 20, 0.10)');
  g.addColorStop(1, 'rgba(30, 18, 8, 0.20)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, viewW, viewH);
}

export function drawBattleStage(ctx, viewW, viewH, seed, playerX, playerY, enemyX, enemyY) {
  // ---------- horizon glow / perspective floor ----------
  const horizonY = enemyY - 8;
  const floorGrad = ctx.createLinearGradient(0, horizonY, 0, viewH);
  floorGrad.addColorStop(0, 'rgba(250, 220, 150, 0.02)');
  floorGrad.addColorStop(0.5, 'rgba(250, 220, 150, 0.08)');
  floorGrad.addColorStop(1, 'rgba(250, 220, 150, 0.02)');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, horizonY, viewW, viewH - horizonY);

  // ---------- perspective lines from the front edge to a vanishing point ----------
  const vpX = viewW * 0.5;
  const vpY = horizonY - 16;
  ctx.strokeStyle = 'rgba(230, 200, 150, 0.16)';
  ctx.lineWidth = 1.4;
  const fanCount = 9;
  for (let i = 0; i < fanCount; i++) {
    const t = i / (fanCount - 1);
    const ax = viewW * (0.02 + t * 0.96);
    ctx.beginPath();
    ctx.moveTo(ax, viewH + 12);
    ctx.lineTo(vpX, vpY);
    ctx.stroke();
  }

  // ---------- two horizon rules ----------
  ctx.strokeStyle = 'rgba(230, 200, 150, 0.18)';
  ctx.lineWidth = 1.4;
  wobbleLine(ctx, viewW * 0.10, horizonY, viewW * 0.90, horizonY, {
    wobble: 1.2, seed: seed + 99, segments: 18, taper: true,
  });

  // ---------- spotlight under each fighter ----------
  drawSpotlight(ctx, playerX, playerY + 14, 270, 'rgba(255, 235, 175, 0.30)');
  drawSpotlight(ctx, enemyX,  enemyY  + 14, 200, 'rgba(255, 210, 170, 0.25)');

  // ---------- chalk arena — a perspective oval between the two fighters ----------
  // Centered between player and enemy, tilted slightly toward the back.
  const arenaCY = (playerY + enemyY) / 2 + 10;
  const arenaCX = viewW * 0.5;
  const arenaRX = viewW * 0.42;
  const arenaRY = (playerY - enemyY) * 0.55;

  ctx.save();
  ctx.translate(arenaCX, arenaCY);

  // soft floor warmth inside the oval
  const floorWarmth = ctx.createRadialGradient(0, 0, 0, 0, 0, arenaRX);
  floorWarmth.addColorStop(0, 'rgba(255, 230, 160, 0.10)');
  floorWarmth.addColorStop(1, 'rgba(255, 230, 160, 0)');
  ctx.fillStyle = floorWarmth;
  ctx.beginPath();
  ctx.ellipse(0, 0, arenaRX, arenaRY, 0, 0, Math.PI * 2);
  ctx.fill();

  // outer chalk outline (wobble)
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = 'rgba(245, 225, 180, 0.55)';
  wobbleShape(ctx, ellipsePts(arenaRX, arenaRY, 36), {
    wobble: 4, seed: seed + 1, segments: 5,
  });
  // inner ring
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(250, 230, 180, 0.32)';
  wobbleShape(ctx, ellipsePts(arenaRX - 20, arenaRY - 10, 32), {
    wobble: 3, seed: seed + 2, segments: 5,
  });
  // tick marks along the oval
  ctx.strokeStyle = 'rgba(240, 220, 170, 0.40)';
  ctx.lineWidth = 2;
  const ticks = 16;
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const x1 = Math.cos(a) * arenaRX;
    const y1 = Math.sin(a) * arenaRY;
    const x2 = Math.cos(a) * (arenaRX + 12);
    const y2 = Math.sin(a) * (arenaRY + 8);
    wobbleLine(ctx, x1, y1, x2, y2, { wobble: 0.5, seed: seed + 10 + i, segments: 2, taper: false });
  }
  ctx.restore();

  // ---------- corner sparks (4-pt stars) ----------
  drawSpark(ctx, viewW * 0.08, viewH * 0.30, 14, seed + 30);
  drawSpark(ctx, viewW * 0.93, viewH * 0.20, 12, seed + 31);
  drawSpark(ctx, viewW * 0.04, viewH * 0.62, 10, seed + 32);
  drawSpark(ctx, viewW * 0.96, viewH * 0.60, 10, seed + 33);
  drawSpark(ctx, viewW * 0.15, viewH * 0.12, 8,  seed + 34);
  drawSpark(ctx, viewW * 0.82, viewH * 0.78, 9,  seed + 35);

  // ---------- corner decorations ----------
  ctx.save();
  ctx.translate(viewW * 0.84, 84);
  ctx.rotate(-0.08);
  ctx.font = "700 36px 'Caveat'";
  ctx.fillStyle = 'rgba(250, 220, 140, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('¡combate!', 0, 0);
  ctx.strokeStyle = 'rgba(250, 220, 140, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let dx = -60; dx <= 60; dx += 4) {
    const yy = 14 + Math.sin(dx * 0.32) * 1.6;
    if (dx === -60) ctx.moveTo(dx, yy);
    else ctx.lineTo(dx, yy);
  }
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(viewW * 0.14, 80);
  ctx.rotate(0.04);
  ctx.font = "400 18px 'Patrick Hand'";
  ctx.fillStyle = 'rgba(230, 200, 140, 0.65)';
  ctx.textAlign = 'center';
  ctx.fillText('round 1', 0, 0);
  ctx.restore();

  // ---------- vignette (last) ----------
  const vignette = ctx.createRadialGradient(
    viewW * 0.5, viewH * 0.55, Math.min(viewW, viewH) * 0.32,
    viewW * 0.5, viewH * 0.5, Math.max(viewW, viewH) * 0.85,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.60)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewW, viewH);
}

// Small gold stars circling above an enemy's head — visible while the enemy
// is stunned (will skip its next turn).
export function drawStunAura(ctx, x, y, t) {
  ctx.save();
  const baseY = y - 130;
  const radius = 32;
  const stars = 3;
  for (let i = 0; i < stars; i++) {
    const angle = (i / stars) * Math.PI * 2 + t * 2;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius * 0.38;
    ctx.save();
    ctx.translate(x + dx, baseY + dy);
    ctx.rotate(angle * 2.5);
    // 4-point star
    ctx.fillStyle = '#F9D85A';
    ctx.strokeStyle = '#A86C10';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const r = 7;
    for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4;
      const rr = (j % 2 === 0) ? r : r * 0.4;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// ============================================================
//  Helpers
// ============================================================

function ellipsePts(rx, ry, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([Math.cos(a) * rx, Math.sin(a) * ry]);
  }
  return pts;
}

function drawSpotlight(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(0.5, color.replace(/[\d.]+\)/, '0.08)'));
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpark(ctx, x, y, size, seed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(250, 220, 140, 0.6)';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const len = (i % 2 === 0) ? size : size * 0.45;
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len;
    wobbleLine(ctx, 0, 0, dx, dy, { wobble: 0.4, seed: seed + i, segments: 2, taper: false });
  }
  ctx.fillStyle = 'rgba(250, 220, 140, 0.7)';
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
