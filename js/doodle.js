// The player doodle. Tile-based movement (cell snap with smooth interpolation),
// 4-directional views, all linework boils every frame.

import { wobbleShape, wobbleLine, wobbleCircle, wobblePath } from './sketch.js';
import { PAPER } from './paper.js';

const BODY_FRONT = [
  [-15, -12],
  [-19, -22],
  [-16, -34],
  [ -8, -42],
  [  4, -44],
  [ 14, -40],
  [ 19, -30],
  [ 18, -18],
  [ 14, -10],
  [  8,  -8],
  [ -4,  -8],
  [-12, -10],
];

const BODY_SIDE = [
  [-12, -12],
  [-15, -22],
  [-14, -34],
  [ -6, -42],
  [  6, -44],
  [ 14, -40],
  [ 16, -30],
  [ 15, -18],
  [ 12, -10],
  [  6,  -8],
  [ -4,  -8],
  [-10, -10],
];

const CREAM = '#FAF1D5';
const DIR = {
  left:  [-1, 0],
  right: [ 1, 0],
  up:    [0, -1],
  down:  [0,  1],
};
const DIRS = ['up', 'down', 'left', 'right'];

const MOVE_DURATION_WALK = 0.13;
const MOVE_DURATION_RUN  = 0.085;

const lerp = (a, b, t) => a + (b - a) * t;
// easeOutCubic: fast push-off, soft landing — reads as "stepping" instead of
// the symmetric ease-in-out that made movement feel robotic.
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export class Doodle {
  constructor(cellX, cellY, tilemap) {
    this.tilemap = tilemap;
    this.cellX = cellX;
    this.cellY = cellY;
    const p = tilemap.cellToPixel(cellX, cellY);
    this.x = p.x;
    this.y = p.y;
    this.startX = this.x;
    this.startY = this.y;
    this.targetX = this.x;
    this.targetY = this.y;
    this.destCellX = cellX;
    this.destCellY = cellY;
    this.moveT = 0;
    this.state = 'idle';        // 'idle' | 'moving'
    this.facing = 'down';
    this.walkT = 0;
    this.blink = 0;
    this.blinkT = 2 + Math.random() * 3;
    this._lastInput = { left: false, right: false, up: false, down: false };
    this._queuedDir = null;
    this.running = false;
    // One-shot events, consumed by main.js
    this.exitTriggered = null;
    this.encounterTriggered = null;

    // RPG stats
    this.maxHp = 20;
    this.hp = 20;
    this.maxMp = 8;
    this.mp = 8;
    this.atk = 3;
    this.def = 0;
  }

  // Draws the player in a battle pose (any facing) at the given screen
  // position with scale, without disturbing the in-world cell state.
  drawBattle(ctx, x, y, seed, scale = 2.2, facing = 'right') {
    const sx = this.x, sy = this.y;
    const sf = this.facing, ss = this.state, sw = this.walkT;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    this.x = 0;
    this.y = 0;
    this.facing = facing;
    this.state = 'idle';
    // A subtle breathing bob in battle stance.
    this.walkT = Math.sin(performance.now() * 0.003) * 0.3;
    this.draw(ctx, seed);
    this.x = sx; this.y = sy; this.facing = sf; this.state = ss; this.walkT = sw;
    ctx.restore();
  }

  get moving() { return this.state === 'moving'; }

  update(dt, input) {
    // Detect newly-pressed direction keys for diagonal-perpendicular switching.
    const newly = [];
    for (const d of DIRS) {
      if (input[d] && !this._lastInput[d]) newly.push(d);
    }
    this._lastInput.left  = input.left;
    this._lastInput.right = input.right;
    this._lastInput.up    = input.up;
    this._lastInput.down  = input.down;
    if (newly.length > 0) {
      this._queuedDir = newly[newly.length - 1];
    }
    this.running = !!input.run;

    // Blink timing
    this.blinkT -= dt;
    if (this.blink > 0) {
      this.blink -= dt * 7;
      if (this.blink < 0) this.blink = 0;
    } else if (this.blinkT <= 0) {
      this.blink = 1;
      this.blinkT = 2 + Math.random() * 3;
    }

    if (this.state === 'moving') {
      this.moveT += dt;
      const duration = this.running ? MOVE_DURATION_RUN : MOVE_DURATION_WALK;
      const t = Math.min(1, this.moveT / duration);
      const e = easeOut(t);
      this.x = lerp(this.startX, this.targetX, e);
      this.y = lerp(this.startY, this.targetY, e);
      this.walkT += dt * (this.running ? 15 : 9);
      if (t >= 1) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.cellX = this.destCellX;
        this.cellY = this.destCellY;
        this.state = 'idle';
        this._tryStartMove(input);
      }
    } else {
      this._tryStartMove(input);
      // ease the walk cycle back to neutral
      this.walkT *= 0.78;
    }
  }

  _tryStartMove(input) {
    // Build candidate directions in priority order:
    //   1. The most-recently-queued newly-pressed key
    //   2. The current facing (if still held — keeps chain-walking smooth)
    //   3. Any other held direction
    const candidates = [];
    if (this._queuedDir) candidates.push(this._queuedDir);
    this._queuedDir = null;
    if (input[this.facing] && !candidates.includes(this.facing)) {
      candidates.push(this.facing);
    }
    for (const d of DIRS) {
      if (input[d] && !candidates.includes(d)) candidates.push(d);
    }

    for (const dir of candidates) {
      const [dx, dy] = DIR[dir];
      const nx = this.cellX + dx;
      const ny = this.cellY + dy;

      // Exit takes priority over everything — stepping past the page edge
      // triggers a transition, not a wall-bump.
      const exit = this.tilemap.exitAt(this.cellX, this.cellY, dir);
      if (exit) {
        this.facing = dir;
        this.exitTriggered = exit;
        return;
      }

      // Walking INTO an enemy starts combat (Earthbound-style bump encounter).
      const enemy = this.tilemap.enemyAt(nx, ny);
      if (enemy) {
        this.facing = dir;
        this.encounterTriggered = enemy;
        return;
      }

      if (this.tilemap.isWalkable(nx, ny)) {
        this.facing = dir;
        this.startX = this.x;
        this.startY = this.y;
        this.destCellX = nx;
        this.destCellY = ny;
        const p = this.tilemap.cellToPixel(nx, ny);
        this.targetX = p.x;
        this.targetY = p.y;
        this.moveT = 0;
        this.state = 'moving';
        return;
      }
    }
    // No walkable direction. Still update facing if a key was held (so the
    // player can "look" at a wall).
    if (candidates.length > 0) this.facing = candidates[0];
  }

  draw(ctx, seed) {
    const bobAmp = this.running ? 4 : 2.5;
    const bob = this.moving ? Math.abs(Math.sin(this.walkT)) * bobAmp : 0;
    const swing = this.moving ? Math.sin(this.walkT) * (this.running ? 1.25 : 1) : 0;

    ctx.save();
    ctx.translate(this.x, this.y - bob);

    // ground shadow (anchored, not boiling)
    ctx.fillStyle = 'rgba(40, 25, 10, 0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 4 + bob * 0.5, 18 - bob * 0.4, 4 - bob * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (this.facing) {
      case 'down':
        this._legsFront(ctx, seed, swing);
        this._body(ctx, seed, BODY_FRONT);
        this._armsFront(ctx, seed, swing);
        this._faceFront(ctx, seed);
        this._cowlick(ctx, seed, 0);
        break;
      case 'up':
        this._legsFront(ctx, seed, swing);
        this._body(ctx, seed, BODY_FRONT);
        this._armsFront(ctx, seed, swing);
        this._backOfHead(ctx, seed);
        this._cowlick(ctx, seed, 0);
        break;
      case 'right':
      case 'left':
        if (this.facing === 'left') ctx.scale(-1, 1);
        this._legSideBack(ctx, seed, swing);
        this._armSideBack(ctx, seed, swing);
        this._body(ctx, seed, BODY_SIDE);
        this._armSideFront(ctx, seed, swing);
        this._legSideFront(ctx, seed, swing);
        this._faceSide(ctx, seed);
        this._cowlick(ctx, seed, 'side');
        break;
    }

    ctx.restore();
  }

  // --- shared parts ---

  _body(ctx, seed, pts) {
    wobbleShape(ctx, pts, { wobble: 1.3, seed: seed + 1, segments: 5, fill: CREAM });
    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.6;
    wobbleShape(ctx, pts, { wobble: 1.3, seed: seed + 1, segments: 5, fill: null });
  }

  _cowlick(ctx, seed, mode) {
    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.2;
    if (mode === 'side') {
      wobblePath(ctx, [[2, -44], [-1, -47], [2, -46]], { wobble: 0.4, seed: seed + 61, segments: 3 });
    } else {
      wobblePath(ctx, [[-1, -44], [0, -47], [2, -45]], { wobble: 0.4, seed: seed + 61, segments: 3 });
    }
  }

  // --- front/back legs and arms ---

  _legsFront(ctx, seed, swing) {
    const legTopY = -10;
    const footY = -2;
    const spread = 6;
    const lx = -spread + swing * 4;
    const rx =  spread - swing * 4;
    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.6;
    wobbleLine(ctx, -spread, legTopY, lx, footY, { wobble: 0.6, seed: seed + 11, segments: 5 });
    wobbleLine(ctx,  spread, legTopY, rx, footY, { wobble: 0.6, seed: seed + 12, segments: 5 });
    wobbleCircle(ctx, lx - 1, footY + 1, 2.4, { wobble: 0.5, seed: seed + 13, segments: 10, fill: PAPER.ink });
    wobbleCircle(ctx, rx + 1, footY + 1, 2.4, { wobble: 0.5, seed: seed + 14, segments: 10, fill: PAPER.ink });
  }

  _armsFront(ctx, seed, swing) {
    const ar = swing * 3.5;
    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.6;
    wobbleLine(ctx, -15, -22, -22 - ar, -12 + ar, { wobble: 0.6, seed: seed + 21, segments: 5 });
    wobbleLine(ctx,  17, -22,  24 + ar, -12 - ar, { wobble: 0.6, seed: seed + 22, segments: 5 });
    wobbleCircle(ctx, -22 - ar, -12 + ar, 2.6, { wobble: 0.5, seed: seed + 23, segments: 10, fill: CREAM });
    wobbleCircle(ctx,  24 + ar, -12 - ar, 2.6, { wobble: 0.5, seed: seed + 24, segments: 10, fill: CREAM });
  }

  _faceFront(ctx, seed) {
    const eyeY = -32;
    if (this.blink > 0.1) {
      ctx.strokeStyle = PAPER.inkDeep;
      ctx.lineWidth = 2.2;
      wobbleLine(ctx, -8.5, eyeY, -3.5, eyeY, { wobble: 0.3, seed: seed + 41, segments: 4, taper: false });
      wobbleLine(ctx,  3.5, eyeY,  8.5, eyeY, { wobble: 0.3, seed: seed + 42, segments: 4, taper: false });
    } else {
      wobbleCircle(ctx, -6, eyeY, 1.9, { wobble: 0.3, seed: seed + 41, segments: 10, fill: PAPER.inkDeep });
      wobbleCircle(ctx,  6, eyeY, 1.9, { wobble: 0.3, seed: seed + 42, segments: 10, fill: PAPER.inkDeep });
      ctx.fillStyle = CREAM;
      ctx.beginPath(); ctx.arc(-5.4, eyeY - 0.6, 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc( 6.6, eyeY - 0.6, 0.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = PAPER.inkDeep;
    ctx.lineWidth = 1.8;
    wobblePath(ctx, [[-4.5, -25], [-2, -23.5], [2, -23.5], [4.5, -25]], { wobble: 0.35, seed: seed + 51, segments: 4 });
    ctx.fillStyle = 'rgba(200, 90, 80, 0.25)';
    ctx.beginPath(); ctx.ellipse(-10, -27, 2.6, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse( 10, -27, 2.6, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  }

  _backOfHead(ctx, seed) {
    ctx.strokeStyle = 'rgba(31, 42, 74, 0.42)';
    ctx.lineWidth = 1.4;
    wobblePath(ctx, [[-5, -36], [-3, -30]],  { wobble: 0.3, seed: seed + 81, segments: 3 });
    wobblePath(ctx, [[-1, -37], [ 0, -30]],  { wobble: 0.3, seed: seed + 82, segments: 3 });
    wobblePath(ctx, [[ 3, -36], [ 4, -30]],  { wobble: 0.3, seed: seed + 83, segments: 3 });
    wobblePath(ctx, [[-3, -40], [-1, -36]],  { wobble: 0.3, seed: seed + 84, segments: 3 });
    wobblePath(ctx, [[ 1, -40], [ 3, -36]],  { wobble: 0.3, seed: seed + 85, segments: 3 });
    ctx.strokeStyle = 'rgba(31, 42, 74, 0.28)';
    ctx.lineWidth = 1.2;
    wobblePath(ctx, [[-10, -16], [-4, -14], [4, -14], [10, -16]], { wobble: 0.3, seed: seed + 86, segments: 3 });
  }

  // --- side view (designed facing right; left mirrors via scale) ---

  _legSideBack(ctx, seed, swing) {
    const x0 = -2, y0 = -10;
    const xEnd = -2 - swing * 5;
    const yEnd = -2;
    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.5;
    wobbleLine(ctx, x0, y0, xEnd, yEnd, { wobble: 0.6, seed: seed + 11, segments: 5 });
    wobbleCircle(ctx, xEnd - 1, yEnd + 1, 2.2, { wobble: 0.5, seed: seed + 13, segments: 10, fill: PAPER.ink });
  }

  _legSideFront(ctx, seed, swing) {
    const x0 = 4, y0 = -10;
    const xEnd = 4 + swing * 5;
    const yEnd = -2;
    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.6;
    wobbleLine(ctx, x0, y0, xEnd, yEnd, { wobble: 0.6, seed: seed + 12, segments: 5 });
    wobbleCircle(ctx, xEnd + 1, yEnd + 1, 2.4, { wobble: 0.5, seed: seed + 14, segments: 10, fill: PAPER.ink });
  }

  _armSideBack(ctx, seed, swing) {
    const x0 = 0, y0 = -22;
    const xEnd = -3 - swing * 4;
    const yEnd = -14 + swing * 2;
    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.3;
    wobbleLine(ctx, x0, y0, xEnd, yEnd, { wobble: 0.5, seed: seed + 25, segments: 4 });
    wobbleCircle(ctx, xEnd, yEnd, 2.1, { wobble: 0.4, seed: seed + 26, segments: 10, fill: CREAM });
  }

  _armSideFront(ctx, seed, swing) {
    const x0 = 8, y0 = -22;
    const xEnd = 10 - swing * 4;
    const yEnd = -14 - swing * 2;
    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 2.6;
    wobbleLine(ctx, x0, y0, xEnd, yEnd, { wobble: 0.6, seed: seed + 21, segments: 5 });
    wobbleCircle(ctx, xEnd, yEnd, 2.6, { wobble: 0.5, seed: seed + 23, segments: 10, fill: CREAM });
  }

  _faceSide(ctx, seed) {
    const eyeX = 5;
    const eyeY = -32;
    if (this.blink > 0.1) {
      ctx.strokeStyle = PAPER.inkDeep;
      ctx.lineWidth = 2.2;
      wobbleLine(ctx, eyeX - 2.5, eyeY, eyeX + 2.5, eyeY, { wobble: 0.3, seed: seed + 41, segments: 4, taper: false });
    } else {
      wobbleCircle(ctx, eyeX, eyeY, 2.0, { wobble: 0.3, seed: seed + 41, segments: 10, fill: PAPER.inkDeep });
      ctx.fillStyle = CREAM;
      ctx.beginPath(); ctx.arc(eyeX + 0.6, eyeY - 0.6, 0.55, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = PAPER.ink;
    ctx.lineWidth = 1.8;
    wobblePath(ctx, [[13, -30], [16, -28], [13, -26]], { wobble: 0.3, seed: seed + 71, segments: 3 });
    ctx.strokeStyle = PAPER.inkDeep;
    ctx.lineWidth = 1.6;
    wobblePath(ctx, [[8, -24.5], [11, -23], [13, -24.5]], { wobble: 0.3, seed: seed + 51, segments: 3 });
    ctx.fillStyle = 'rgba(200, 90, 80, 0.25)';
    ctx.beginPath(); ctx.ellipse(2, -27, 2.4, 1.4, 0, 0, Math.PI * 2); ctx.fill();
  }
}
