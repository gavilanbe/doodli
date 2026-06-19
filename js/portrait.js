// Larger character portraits for dialogue. Each portrait function draws a
// bust (head + neck + shoulders) anchored at (cx, cy = bottom-center of the
// portrait box). All linework boils via the global seed.
//
// Supported expressions: 'neutral' | 'happy' | 'sad' | 'surprised' | 'worried' | 'angry'

import { wobbleShape, wobbleLine, wobbleCircle, wobblePath } from './sketch.js';
import { PAPER } from './paper.js';

const CREAM = '#FAF1D5';
const INK = PAPER.inkDeep;
const TEAR = 'rgba(120, 170, 220, 0.88)';
const TEAR_STROKE = '#2A5B90';
const BLUSH = 'rgba(200, 90, 80, 0.32)';

// ============================================================
//  PLAYER (Doodli)
//
//  The portrait is literally a zoomed-in version of the in-world Doodle —
//  same potato-blob silhouette, same face placement, same cowlick. Just bigger.
// ============================================================

// Same shape as Doodle's BODY_FRONT, scaled ×4 with a small downward offset so
// the body's bottom sits near the bottom of the portrait frame.
const PORTRAIT_S = 4;
const PORTRAIT_OFF_Y = 12;
const sx = (v) => v * PORTRAIT_S;
const sy = (v) => v * PORTRAIT_S + PORTRAIT_OFF_Y;

const PLAYER_BODY = [
  [sx(-15), sy(-12)],
  [sx(-19), sy(-22)],
  [sx(-16), sy(-34)],
  [sx( -8), sy(-42)],
  [sx(  4), sy(-44)],
  [sx( 14), sy(-40)],
  [sx( 19), sy(-30)],
  [sx( 18), sy(-18)],
  [sx( 14), sy(-10)],
  [sx(  8), sy( -8)],
  [sx( -4), sy( -8)],
  [sx(-12), sy(-10)],
];

export function drawPlayerPortrait(ctx, cx, cy, seed, expression = 'neutral') {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // soft body shadow on the paper below the doodle
  ctx.fillStyle = 'rgba(40, 25, 10, 0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 22, 70, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // -------- arms (drawn before body so the body covers their roots) --------
  ctx.strokeStyle = PAPER.ink;
  ctx.lineWidth = 5.5;
  wobbleLine(ctx, sx(-15), sy(-22), sx(-22), sy(-12), { wobble: 1.0, seed: seed + 21, segments: 6 });
  wobbleLine(ctx, sx( 17), sy(-22), sx( 24), sy(-12), { wobble: 1.0, seed: seed + 22, segments: 6 });
  // hands (tiny cream balls)
  wobbleCircle(ctx, sx(-22), sy(-12), 9, { wobble: 1.0, seed: seed + 23, segments: 12, fill: CREAM });
  ctx.strokeStyle = PAPER.ink;
  wobbleCircle(ctx, sx(-22), sy(-12), 9, { wobble: 1.0, seed: seed + 23, segments: 12, fill: null });
  wobbleCircle(ctx, sx( 24), sy(-12), 9, { wobble: 1.0, seed: seed + 24, segments: 12, fill: CREAM });
  ctx.strokeStyle = PAPER.ink;
  wobbleCircle(ctx, sx( 24), sy(-12), 9, { wobble: 1.0, seed: seed + 24, segments: 12, fill: null });

  // -------- body --------
  wobbleShape(ctx, PLAYER_BODY, {
    wobble: 3.0,
    seed: seed + 1,
    segments: 6,
    fill: CREAM,
  });
  ctx.strokeStyle = PAPER.ink;
  ctx.lineWidth = 5.5;
  wobbleShape(ctx, PLAYER_BODY, {
    wobble: 3.0,
    seed: seed + 1,
    segments: 6,
    fill: null,
  });

  // -------- cowlick on top --------
  ctx.lineWidth = 5;
  ctx.strokeStyle = PAPER.ink;
  wobblePath(ctx, [[sx(-1), sy(-44)], [sx(0), sy(-47)], [sx(2), sy(-45)]], {
    wobble: 0.9, seed: seed + 61, segments: 3,
  });

  // -------- face (expression-dependent) --------
  drawPlayerExpression(ctx, seed, expression);

  ctx.restore();
}

function drawPlayerExpression(ctx, seed, expr) {
  // All face coords are derived from the in-world doodle's face positions,
  // scaled with sx/sy so they sit on the new bigger body.
  const EYE_Y  = sy(-32);
  const MOUTH_Y = sy(-25);
  const EYE_X = sx(6);

  // permanent gentle blush (always drawn unless explicitly hidden)
  ctx.fillStyle = BLUSH;
  ctx.beginPath(); ctx.ellipse(sx(-10), sy(-27), 11, 6.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(sx( 10), sy(-27), 11, 6.4, 0, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.5;

  // helper: convert in-world face coords (small) to portrait coords (scaled).
  const fx = sx;       // in-world x  → portrait x
  const fy = sy;       // in-world y  → portrait y

  switch (expr) {
    case 'happy':
      // closed crescent eyes (^^)
      wobblePath(ctx, [[fx(-9), fy(-30)], [fx(-6), fy(-34)], [fx(-3), fy(-30)]], { wobble: 0.5, seed: seed + 41, segments: 4 });
      wobblePath(ctx, [[fx( 3), fy(-30)], [fx( 6), fy(-34)], [fx( 9), fy(-30)]], { wobble: 0.5, seed: seed + 42, segments: 4 });
      // big open smile (filled mouth)
      wobbleShape(ctx, [
        [fx(-6),  fy(-26)],
        [fx(-4),  fy(-23)],
        [fx(-2),  fy(-22)],
        [fx( 2),  fy(-22)],
        [fx( 4),  fy(-23)],
        [fx( 6),  fy(-26)],
        [fx( 3),  fy(-26.5)],
        [fx(-3),  fy(-26.5)],
      ], { wobble: 0.7, seed: seed + 51, segments: 4, fill: '#5C2418' });
      // sparkles
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = '#D8A02E';
      wobbleLine(ctx, fx(-16), fy(-42), fx(-13), fy(-46), { wobble: 0.4, seed: seed + 71, segments: 3 });
      wobbleLine(ctx, fx( 16), fy(-42), fx( 13), fy(-46), { wobble: 0.4, seed: seed + 72, segments: 3 });
      break;

    case 'sad':
      // downward eye arcs
      wobblePath(ctx, [[fx(-9), fy(-31)], [fx(-6), fy(-29)], [fx(-3), fy(-31)]], { wobble: 0.5, seed: seed + 41, segments: 4 });
      wobblePath(ctx, [[fx( 3), fy(-31)], [fx( 6), fy(-29)], [fx( 9), fy(-31)]], { wobble: 0.5, seed: seed + 42, segments: 4 });
      // concerned brows
      ctx.lineWidth = 3.5;
      wobbleLine(ctx, fx(-10), fy(-38), fx(-3), fy(-35), { wobble: 0.4, seed: seed + 31, segments: 4 });
      wobbleLine(ctx, fx(  3), fy(-35), fx( 10), fy(-38), { wobble: 0.4, seed: seed + 32, segments: 4 });
      // downturned mouth
      ctx.lineWidth = 4;
      wobblePath(ctx, [[fx(-5), fy(-23)], [fx(-2), fy(-26)], [fx(2), fy(-26)], [fx(5), fy(-23)]],
        { wobble: 0.5, seed: seed + 51, segments: 5 });
      // tear drop on the cheek
      ctx.fillStyle = TEAR;
      ctx.strokeStyle = TEAR_STROKE;
      ctx.lineWidth = 1.8;
      wobbleShape(ctx, [
        [fx(-10), fy(-28)],
        [fx(-12), fy(-25)],
        [fx(-11), fy(-22)],
        [fx( -8), fy(-24)],
        [fx( -8), fy(-27)],
      ], { wobble: 0.4, seed: seed + 81, segments: 3, fill: TEAR });
      break;

    case 'surprised':
      // big round eyes (cream filled with pupils)
      wobbleCircle(ctx, fx(-6), EYE_Y, 11, { wobble: 0.6, seed: seed + 41, segments: 16, fill: CREAM });
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      wobbleCircle(ctx, fx(-6), EYE_Y, 11, { wobble: 0.6, seed: seed + 41, segments: 16, fill: null });
      wobbleCircle(ctx, fx( 6), EYE_Y, 11, { wobble: 0.6, seed: seed + 42, segments: 16, fill: CREAM });
      wobbleCircle(ctx, fx( 6), EYE_Y, 11, { wobble: 0.6, seed: seed + 42, segments: 16, fill: null });
      // pupils
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(fx(-6), EYE_Y - 1, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(fx( 6), EYE_Y - 1, 4, 0, Math.PI * 2); ctx.fill();
      // O mouth
      ctx.lineWidth = 3.4;
      ctx.strokeStyle = INK;
      wobbleCircle(ctx, 0, fy(-23), 8, { wobble: 0.5, seed: seed + 51, segments: 14, fill: '#3a2010' });
      // surprise marks on the side
      ctx.strokeStyle = '#D8A02E';
      ctx.lineWidth = 3.2;
      wobbleLine(ctx, fx(22), fy(-38), fx(26), fy(-44), { wobble: 0.3, seed: seed + 71, segments: 3 });
      wobbleLine(ctx, fx(20), fy(-32), fx(25), fy(-34), { wobble: 0.3, seed: seed + 72, segments: 3 });
      wobbleLine(ctx, fx(-22), fy(-38), fx(-26), fy(-44), { wobble: 0.3, seed: seed + 73, segments: 3 });
      break;

    case 'worried':
      // small normal eyes
      wobbleCircle(ctx, fx(-6), EYE_Y, 6, { wobble: 0.5, seed: seed + 41, segments: 12, fill: INK });
      wobbleCircle(ctx, fx( 6), EYE_Y, 6, { wobble: 0.5, seed: seed + 42, segments: 12, fill: INK });
      // concerned brows (\\ //)
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      wobbleLine(ctx, fx(-11), fy(-39), fx(-3), fy(-35), { wobble: 0.5, seed: seed + 31, segments: 4 });
      wobbleLine(ctx, fx(  3), fy(-35), fx(11), fy(-39), { wobble: 0.5, seed: seed + 32, segments: 4 });
      // wavy worried mouth
      ctx.lineWidth = 3.4;
      wobblePath(ctx, [
        [fx(-6), fy(-25)],
        [fx(-3), fy(-24)],
        [fx( 0), fy(-26)],
        [fx( 3), fy(-24)],
        [fx( 6), fy(-25)],
      ], { wobble: 0.4, seed: seed + 51, segments: 4 });
      // sweat drop near temple
      ctx.fillStyle = TEAR;
      ctx.strokeStyle = TEAR_STROKE;
      ctx.lineWidth = 1.8;
      wobbleShape(ctx, [
        [fx(20), fy(-36)],
        [fx(18), fy(-32)],
        [fx(19), fy(-29)],
        [fx(22), fy(-31)],
      ], { wobble: 0.3, seed: seed + 81, segments: 3, fill: TEAR });
      break;

    case 'angry':
      // narrow eye slits
      ctx.lineWidth = 4.5;
      ctx.strokeStyle = INK;
      wobbleLine(ctx, fx(-9), fy(-31), fx(-3), fy(-32), { wobble: 0.4, seed: seed + 41, segments: 4 });
      wobbleLine(ctx, fx( 3), fy(-32), fx( 9), fy(-31), { wobble: 0.4, seed: seed + 42, segments: 4 });
      // V brows
      wobbleLine(ctx, fx(-11), fy(-39), fx(-3), fy(-34), { wobble: 0.5, seed: seed + 31, segments: 4 });
      wobbleLine(ctx, fx(  3), fy(-34), fx(11), fy(-39), { wobble: 0.5, seed: seed + 32, segments: 4 });
      // grimace mouth (filled, downward)
      wobbleShape(ctx, [
        [fx(-6), fy(-22)],
        [fx(-4), fy(-24)],
        [fx(-2), fy(-25)],
        [fx( 2), fy(-25)],
        [fx( 4), fy(-24)],
        [fx( 6), fy(-22)],
        [fx( 3), fy(-23)],
        [fx(-3), fy(-23)],
      ], { wobble: 0.5, seed: seed + 51, segments: 4, fill: '#3a1810' });
      // anger steam lines
      ctx.strokeStyle = '#C53A2E';
      ctx.lineWidth = 3.4;
      wobbleLine(ctx, fx(-18), fy(-46), fx(-14), fy(-50), { wobble: 0.3, seed: seed + 71, segments: 3 });
      wobbleLine(ctx, fx(-13), fy(-48), fx( -9), fy(-52), { wobble: 0.3, seed: seed + 72, segments: 3 });
      wobbleLine(ctx, fx( 13), fy(-48), fx(  9), fy(-52), { wobble: 0.3, seed: seed + 73, segments: 3 });
      break;

    case 'neutral':
    default:
      // standard round eyes with a little shine
      wobbleCircle(ctx, fx(-6), EYE_Y, 7, { wobble: 0.6, seed: seed + 41, segments: 14, fill: INK });
      wobbleCircle(ctx, fx( 6), EYE_Y, 7, { wobble: 0.6, seed: seed + 42, segments: 14, fill: INK });
      ctx.fillStyle = CREAM;
      ctx.beginPath(); ctx.arc(fx(-5.4), EYE_Y - 2, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(fx( 6.6), EYE_Y - 2, 2, 0, Math.PI * 2); ctx.fill();
      // soft smile
      ctx.lineWidth = 4;
      ctx.strokeStyle = INK;
      wobblePath(ctx, [
        [fx(-4.5), fy(-25)],
        [fx(-2),   fy(-23.5)],
        [fx( 2),   fy(-23.5)],
        [fx( 4.5), fy(-25)],
      ], { wobble: 0.45, seed: seed + 51, segments: 5 });
      break;
  }
}

// ============================================================
//  STICKMAN
// ============================================================

export function drawStickmanPortrait(ctx, cx, cy, seed, expression = 'neutral') {
  ctx.save();
  ctx.translate(cx, cy);

  // big head (front view, circle)
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = PAPER.ink;
  wobbleCircle(ctx, 0, -100, 70, {
    wobble: 1.8,
    seed: seed + 1,
    segments: 28,
    fill: CREAM,
  });
  ctx.strokeStyle = PAPER.ink;
  wobbleCircle(ctx, 0, -100, 70, {
    wobble: 1.8,
    seed: seed + 1,
    segments: 28,
    fill: null,
  });

  // neck (two parallel lines)
  ctx.lineWidth = 3.2;
  wobbleLine(ctx, -8, -32, -8, -10, { wobble: 0.4, seed: seed + 11, segments: 4, taper: false });
  wobbleLine(ctx,  8, -32,  8, -10, { wobble: 0.4, seed: seed + 12, segments: 4, taper: false });

  // shoulders / chest line
  wobbleLine(ctx, -50, 0, 50, 0, { wobble: 0.6, seed: seed + 13, segments: 5 });
  // little arm stubs going down off-frame
  wobbleLine(ctx, -50, 0, -68, 25, { wobble: 0.4, seed: seed + 14, segments: 4 });
  wobbleLine(ctx,  50, 0,  68, 25, { wobble: 0.4, seed: seed + 15, segments: 4 });

  drawStickmanExpression(ctx, seed, expression);

  ctx.restore();
}

function drawStickmanExpression(ctx, seed, expr) {
  const EYE_Y = -118;
  const MOUTH_Y = -78;

  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6;

  switch (expr) {
    case 'happy':
      wobblePath(ctx, [[-22, EYE_Y + 2], [-14, EYE_Y - 6], [-6, EYE_Y + 2]], { wobble: 0.4, seed: seed + 41, segments: 4 });
      wobblePath(ctx, [[  6, EYE_Y + 2], [ 14, EYE_Y - 6], [ 22, EYE_Y + 2]], { wobble: 0.4, seed: seed + 42, segments: 4 });
      wobblePath(ctx, [[-14, MOUTH_Y], [-6, MOUTH_Y + 8], [6, MOUTH_Y + 8], [14, MOUTH_Y]], { wobble: 0.5, seed: seed + 51, segments: 5 });
      break;

    case 'sad':
      wobblePath(ctx, [[-22, EYE_Y - 3], [-14, EYE_Y + 3], [-6, EYE_Y - 3]], { wobble: 0.4, seed: seed + 41, segments: 4 });
      wobblePath(ctx, [[  6, EYE_Y - 3], [ 14, EYE_Y + 3], [ 22, EYE_Y - 3]], { wobble: 0.4, seed: seed + 42, segments: 4 });
      wobblePath(ctx, [[-12, MOUTH_Y + 4], [-6, MOUTH_Y - 2], [6, MOUTH_Y - 2], [12, MOUTH_Y + 4]], { wobble: 0.4, seed: seed + 51, segments: 5 });
      // teardrop
      ctx.fillStyle = TEAR;
      ctx.strokeStyle = TEAR_STROKE;
      ctx.lineWidth = 1.5;
      wobbleShape(ctx, [
        [-25, EYE_Y + 10],
        [-28, EYE_Y + 18],
        [-26, EYE_Y + 26],
        [-22, EYE_Y + 18],
      ], { wobble: 0.3, seed: seed + 81, segments: 3, fill: TEAR });
      break;

    case 'surprised':
      wobbleCircle(ctx, -15, EYE_Y, 6, { wobble: 0.4, seed: seed + 41, segments: 12, fill: CREAM });
      ctx.strokeStyle = INK;
      wobbleCircle(ctx, -15, EYE_Y, 6, { wobble: 0.4, seed: seed + 41, segments: 12, fill: null });
      wobbleCircle(ctx,  15, EYE_Y, 6, { wobble: 0.4, seed: seed + 42, segments: 12, fill: CREAM });
      wobbleCircle(ctx,  15, EYE_Y, 6, { wobble: 0.4, seed: seed + 42, segments: 12, fill: null });
      ctx.fillStyle = INK;
      ctx.beginPath(); ctx.arc(-15, EYE_Y, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 15, EYE_Y, 2, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 2.8;
      wobbleCircle(ctx, 0, MOUTH_Y + 2, 5, { wobble: 0.3, seed: seed + 51, segments: 12, fill: '#3a2010' });
      break;

    case 'worried':
      wobbleCircle(ctx, -15, EYE_Y, 3.5, { wobble: 0.3, seed: seed + 41, segments: 10, fill: INK });
      wobbleCircle(ctx,  15, EYE_Y, 3.5, { wobble: 0.3, seed: seed + 42, segments: 10, fill: INK });
      ctx.lineWidth = 3;
      wobbleLine(ctx, -25, EYE_Y - 18, -10, EYE_Y - 10, { wobble: 0.4, seed: seed + 31, segments: 4 });
      wobbleLine(ctx,  10, EYE_Y - 10,  25, EYE_Y - 18, { wobble: 0.4, seed: seed + 32, segments: 4 });
      wobblePath(ctx, [
        [-12, MOUTH_Y + 2], [-6, MOUTH_Y + 6], [0, MOUTH_Y], [6, MOUTH_Y + 6], [12, MOUTH_Y + 2]
      ], { wobble: 0.3, seed: seed + 51, segments: 4 });
      // sweat
      ctx.fillStyle = TEAR;
      ctx.strokeStyle = TEAR_STROKE;
      ctx.lineWidth = 1.5;
      wobbleShape(ctx, [
        [50, -140], [44, -130], [46, -122], [54, -126]
      ], { wobble: 0.3, seed: seed + 81, segments: 3, fill: TEAR });
      break;

    case 'angry':
      ctx.lineWidth = 4;
      wobbleLine(ctx, -22, EYE_Y + 2, -8, EYE_Y - 1, { wobble: 0.3, seed: seed + 41, segments: 4 });
      wobbleLine(ctx,   8, EYE_Y - 1, 22, EYE_Y + 2, { wobble: 0.3, seed: seed + 42, segments: 4 });
      wobbleLine(ctx, -25, EYE_Y - 18,  -8, EYE_Y - 8, { wobble: 0.4, seed: seed + 31, segments: 4 });
      wobbleLine(ctx,   8, EYE_Y - 8,   25, EYE_Y - 18, { wobble: 0.4, seed: seed + 32, segments: 4 });
      wobblePath(ctx, [[-12, MOUTH_Y + 6], [-6, MOUTH_Y - 2], [6, MOUTH_Y - 2], [12, MOUTH_Y + 6]], { wobble: 0.4, seed: seed + 51, segments: 4 });
      ctx.strokeStyle = '#C53A2E';
      ctx.lineWidth = 2.8;
      wobbleLine(ctx, -50, -170, -38, -180, { wobble: 0.3, seed: seed + 71, segments: 3 });
      wobbleLine(ctx,  50, -170,  38, -180, { wobble: 0.3, seed: seed + 72, segments: 3 });
      break;

    case 'neutral':
    default:
      wobbleCircle(ctx, -15, EYE_Y, 4, { wobble: 0.3, seed: seed + 41, segments: 10, fill: INK });
      wobbleCircle(ctx,  15, EYE_Y, 4, { wobble: 0.3, seed: seed + 42, segments: 10, fill: INK });
      ctx.fillStyle = CREAM;
      ctx.beginPath(); ctx.arc(-13.5, EYE_Y - 1.5, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 16.5, EYE_Y - 1.5, 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.2;
      wobblePath(ctx, [[-10, MOUTH_Y], [-4, MOUTH_Y + 5], [4, MOUTH_Y + 5], [10, MOUTH_Y]], { wobble: 0.4, seed: seed + 51, segments: 4 });
      break;
  }
}

// ============================================================
//  Lookup
// ============================================================

const PORTRAITS = {
  player: drawPlayerPortrait,
  stickman: drawStickmanPortrait,
};

export function drawPortrait(ctx, speaker, cx, cy, seed, expression) {
  const fn = PORTRAITS[speaker];
  if (fn) fn(ctx, cx, cy, seed, expression);
}
