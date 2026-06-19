// Dialogue system. Script-driven, Golden Sun-style: large portrait + sticky
// text panel at the bottom. Portrait reacts to each line's expression. The
// whole UI is "taped" to the page (diegetic).

import { wobbleShape } from './sketch.js';
import { PAPER } from './paper.js';
import { drawPortrait } from './portrait.js';

const CHARS_PER_SEC = 38;

// Panel layout — measured in CSS pixels. Computed responsively in draw().
const PORTRAIT_BOX = { w: 210, h: 220 };
const TEXT_BOX = { hMin: 200 };
const PANEL_PADDING = 26;

const FONT_NAME = "'Caveat'";
const FONT_BODY = "'Patrick Hand'";

export class Dialogue {
  constructor(script) {
    this.script = script;
    this.frame = 0;
    this.charsShown = 0;
    this.done = false;
    this.blinkT = 0;
  }

  get current() { return this.script[this.frame]; }

  isFullyShown() {
    return this.charsShown >= this.current.text.length;
  }

  update(dt) {
    if (this.done) return;
    if (!this.isFullyShown()) {
      this.charsShown = Math.min(this.current.text.length, this.charsShown + dt * CHARS_PER_SEC);
    } else {
      this.blinkT += dt;
    }
  }

  advance() {
    if (this.done) return;
    if (!this.isFullyShown()) {
      this.charsShown = this.current.text.length;
    } else {
      this.frame++;
      this.charsShown = 0;
      this.blinkT = 0;
      if (this.frame >= this.script.length) this.done = true;
    }
  }

  draw(ctx, viewW, viewH, seed) {
    if (this.done) return;
    const line = this.current;

    // Layout: portrait left, text panel taking the rest. Margins from edges.
    const SIDE_MARGIN = 36;
    const BOTTOM_MARGIN = 30;
    const GAP = 24;

    const portraitX = SIDE_MARGIN;
    const portraitY = viewH - BOTTOM_MARGIN - PORTRAIT_BOX.h;

    const textX = portraitX + PORTRAIT_BOX.w + GAP;
    const textW = viewW - textX - SIDE_MARGIN;
    const textH = PORTRAIT_BOX.h - 20;
    const textY = portraitY + 10;

    // dim the world subtly
    ctx.save();
    ctx.fillStyle = 'rgba(20, 15, 10, 0.18)';
    ctx.fillRect(0, viewH - PORTRAIT_BOX.h - 80, viewW, PORTRAIT_BOX.h + 80);
    ctx.restore();

    drawStickyPanel(ctx, portraitX, portraitY, PORTRAIT_BOX.w, PORTRAIT_BOX.h, seed + 100, {
      tilt: -0.024,
      tapeColor: 'rgba(232, 200, 90, 0.62)',
    });
    drawStickyPanel(ctx, textX, textY, textW, textH, seed + 200, {
      tilt: 0.014,
      tapeColor: 'rgba(232, 200, 90, 0.62)',
    });

    // --- portrait inside its frame ---
    ctx.save();
    // re-apply the same tilt the frame used so the portrait sits inside it.
    ctx.translate(portraitX + PORTRAIT_BOX.w / 2, portraitY + PORTRAIT_BOX.h / 2);
    ctx.rotate(-0.024);
    // Portrait anchor is bottom-center; the bust extends upward from there.
    drawPortrait(ctx, line.speaker, 0, PORTRAIT_BOX.h / 2 - 16, seed, line.expression || 'neutral');
    ctx.restore();

    // --- text panel content ---
    ctx.save();
    ctx.translate(textX + textW / 2, textY + textH / 2);
    ctx.rotate(0.014);

    const innerX = -textW / 2 + PANEL_PADDING;
    const innerY = -textH / 2 + PANEL_PADDING;
    const innerW = textW - PANEL_PADDING * 2;

    // speaker name (top)
    ctx.fillStyle = '#1F2A4A';
    ctx.font = `700 30px ${FONT_NAME}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const speakerLabel = line.label || line.speaker;
    ctx.fillText(speakerLabel, innerX, innerY);

    // a small underline-squiggle below the name
    ctx.strokeStyle = '#1F2A4A';
    ctx.lineWidth = 1.6;
    const nameW = ctx.measureText(speakerLabel).width;
    const yLine = innerY + 36;
    ctx.beginPath();
    ctx.moveTo(innerX, yLine);
    for (let x = innerX; x <= innerX + nameW + 8; x += 4) {
      ctx.lineTo(x, yLine + Math.sin((x - innerX) * 0.6) * 1.2);
    }
    ctx.stroke();

    // body text — typewriter
    ctx.fillStyle = '#2A2010';
    ctx.font = `400 28px ${FONT_BODY}`;
    const bodyY = innerY + 54;
    const lineHeight = 36;
    drawTypewriter(ctx, line.text, this.charsShown, innerX, bodyY, innerW, lineHeight);

    // continue indicator (blinking ▼) bottom-right
    if (this.isFullyShown()) {
      const alpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(this.blinkT * 5));
      ctx.fillStyle = `rgba(31, 42, 74, ${alpha})`;
      ctx.font = `700 24px ${FONT_NAME}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      const arrow = (this.frame === this.script.length - 1) ? '✕' : '▼';
      ctx.fillText(arrow, textW / 2 - PANEL_PADDING, textH / 2 - PANEL_PADDING / 2);
    }

    ctx.restore();
  }
}

// ============================================================
//  Sticky panel (the diegetic "tape it to the page" box)
// ============================================================

function drawStickyPanel(ctx, x, y, w, h, seed, opts = {}) {
  const tilt = opts.tilt ?? 0;
  const fill = opts.fill ?? '#FAF2D6';
  const tapeColor = opts.tapeColor ?? 'rgba(232, 200, 90, 0.6)';

  ctx.save();
  // operate from the center so rotation feels natural
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(tilt);

  // drop shadow
  ctx.save();
  ctx.translate(5, 7);
  ctx.fillStyle = 'rgba(30, 18, 8, 0.28)';
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.fill();
  ctx.restore();

  // panel cream fill
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.fill();

  // soft inner gradient (vignette inside the panel)
  const g = ctx.createRadialGradient(0, 0, Math.min(w, h) * 0.2, 0, 0, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(255, 250, 220, 0)');
  g.addColorStop(1, 'rgba(80, 50, 20, 0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  // wobble border drawn slightly inset
  const corners = [
    [-w / 2 + 1, -h / 2 + 1],
    [ w / 2 - 1, -h / 2 + 1],
    [ w / 2 - 1,  h / 2 - 1],
    [-w / 2 + 1,  h / 2 - 1],
  ];
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#5A4020';
  wobbleShape(ctx, corners, { wobble: 1.6, seed: seed + 1, segments: 10, fill: null });

  // tape strips at top-left and top-right (slightly off the top edge)
  drawTapeStrip(ctx, -w / 2 + 32, -h / 2 + 2, 58, 18, -0.22, seed + 7, tapeColor);
  drawTapeStrip(ctx,  w / 2 - 32, -h / 2 + 2, 58, 18,  0.20, seed + 8, tapeColor);

  ctx.restore();
}

function drawTapeStrip(ctx, cx, cy, w, h, rot, seed, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(140, 110, 40, 0.55)';
  ctx.lineWidth = 0.8;
  // slightly torn edges with tiny offsets
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, -h / 2 + 1);
  ctx.lineTo( w / 2 - 1, -h / 2 - 1);
  ctx.lineTo( w / 2 - 2,  h / 2);
  ctx.lineTo(-w / 2 + 1,  h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // tiny shine streak
  ctx.fillStyle = 'rgba(255, 250, 200, 0.32)';
  ctx.fillRect(-w / 2 + 4, -h / 2 + 3, w - 8, 2);
  ctx.restore();
}

// ============================================================
//  Text wrap + typewriter draw
// ============================================================

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawTypewriter(ctx, fullText, charsShown, x, y, maxWidth, lineHeight) {
  const lines = wrapText(ctx, fullText, maxWidth);
  let remaining = Math.floor(charsShown);
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (remaining >= ln.length) {
      ctx.fillText(ln, x, y + i * lineHeight);
      // account for the space that separates lines (1 char in original text)
      remaining -= ln.length + (i < lines.length - 1 ? 1 : 0);
    } else {
      ctx.fillText(ln.substring(0, Math.max(0, remaining)), x, y + i * lineHeight);
      break;
    }
  }
}
