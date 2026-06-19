// Turn-based combat scene. Three pillars:
//   1. Golden Sun-style intro: ink-slash wipes, flash, springy entrances.
//   2. Four-panel HUD: separate player/enemy stat panels, command + message.
//   3. Per-attack visual flair: pencil strike, highlighter, ink splash, floating damage numbers.

import { wobbleShape, wobbleLine, wobblePath, wobbleCircle } from './sketch.js';
import { PAPER } from './paper.js';
import { drawBattleStage, drawBattleDim, drawStunAura } from './battle_stage.js';
import { drawPlayerPortrait } from './portrait.js';

const S = {
  INTRO_WIPE:      'intro-wipe',
  INTRO_FLASH:     'intro-flash',
  INTRO_ENTRANCE:  'intro-entrance',
  INTRO_TEXT:      'intro-text',
  MENU:            'menu',
  PLAYER_ATTACK:   'player-attack',
  ENEMY_ATTACK:    'enemy-attack',
  PLAYER_FLEE:     'player-flee',
  WIN:             'win',
  LOSE:            'lose',
};

const WIPE_DUR     = 0.42;
const FLASH_DUR    = 0.14;
const ENTRANCE_DUR = 0.55;
const TEXT_DUR     = 1.6;

const SKILLS = {
  'Atacar':   { type: 'pencil',      cost: 0, minDmg: 2, maxDmg: 4, msg: 'Rayazo de lápiz' },
  'Subrayar': { type: 'highlighter', cost: 2, minDmg: 4, maxDmg: 6, msg: 'Subrayazo brillante' },
  'Tachar':   { type: 'x-strike',    cost: 3, minDmg: 5, maxDmg: 7, msg: 'Tachón doble',     stunChance: 0.35 },
  'Espiral':  { type: 'spiral',      cost: 1, minDmg: 1, maxDmg: 2, msg: 'Espiral hipnótica', stunChance: 1.0 },
};

const MENU_MAIN     = ['Atacar', 'Técnicas', 'Huir'];
const MENU_TECNICAS = ['Subrayar', 'Tachar', 'Espiral', '← volver'];
const MENU_TREE = { main: MENU_MAIN, tecnicas: MENU_TECNICAS };

export class Combat {
  constructor(player, enemy, onEnd) {
    this.player = player;
    this.enemy = enemy;
    this.onEnd = onEnd;

    this.state = S.INTRO_WIPE;
    this.stateT = 0;

    this.menuLevel = 'main';
    this.menuSelected = 0;
    this.menuOptions = MENU_MAIN;

    this.message = '';

    this.playerShakeT = 0;
    this.enemyShakeT  = 0;
    this.playerLungeT = 0;
    this.enemyLungeT  = 0;
    this.flashT = 0;

    // attack vfx
    this.attackVfx = null;      // { kind, t, duration, ... }
    this.damageNumbers = [];    // floating numbers

    // camera shake
    this.cameraShakeT = 0;
    this.cameraShakeStrength = 0;

    // turn banner ("tu turno" / "turno de la mancha")
    this.banner = null;         // { text, side, t, duration }

    // intro ink-slashes
    this.slashes = makeSlashes();

    this._dealt = false;
    this._fleeResolved = false;
    this._fleeOutcome = null;
    this._lastInput = { up: false, down: false, left: false, right: false };
  }

  goto(state) {
    this.state = state;
    this.stateT = 0;
    this._dealt = false;
    if (state === S.MENU) {
      // Always come back to the main menu when it's the player's turn again.
      this.menuLevel = 'main';
      this.menuOptions = MENU_MAIN;
      this.menuSelected = 0;
      this.banner = { text: 'tu turno', side: 'left',  t: 0, duration: 0.85 };
    } else if (state === S.ENEMY_ATTACK) {
      this.banner = { text: 'turno de ' + this.enemy.name.toLowerCase(), side: 'right', t: 0, duration: 0.85 };
    }
  }

  shakeCamera(strength = 1, duration = 0.4) {
    this.cameraShakeT = duration;
    this.cameraShakeStrength = strength;
  }

  update(dt, input) {
    this.stateT += dt;

    // tick global anim timers
    if (this.playerShakeT > 0) this.playerShakeT = Math.max(0, this.playerShakeT - dt);
    if (this.enemyShakeT  > 0) this.enemyShakeT  = Math.max(0, this.enemyShakeT  - dt);
    if (this.flashT       > 0) this.flashT       = Math.max(0, this.flashT       - dt);
    if (this.playerLungeT > 0) this.playerLungeT = Math.max(0, this.playerLungeT - dt * 2.6);
    if (this.enemyLungeT  > 0) this.enemyLungeT  = Math.max(0, this.enemyLungeT  - dt * 2.6);
    if (this.cameraShakeT > 0) this.cameraShakeT = Math.max(0, this.cameraShakeT - dt);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t >= this.banner.duration) this.banner = null;
    }

    // attack vfx
    if (this.attackVfx) {
      this.attackVfx.t += dt;
      if (this.attackVfx.t >= this.attackVfx.duration) this.attackVfx = null;
    }

    // damage numbers
    for (const d of this.damageNumbers) d.t += dt;
    this.damageNumbers = this.damageNumbers.filter(d => d.t < d.duration);

    // input
    const ne = (k) => input[k] && !this._lastInput[k];
    const upE = ne('up'), downE = ne('down');
    const advance = !!input.talkPressed;
    if (advance) input.talkPressed = false;
    this._lastInput.up = input.up;
    this._lastInput.down = input.down;
    this._lastInput.left = input.left;
    this._lastInput.right = input.right;

    switch (this.state) {
      case S.INTRO_WIPE:
        if (this.stateT >= WIPE_DUR) {
          this.flashT = FLASH_DUR;
          this.goto(S.INTRO_FLASH);
        }
        break;
      case S.INTRO_FLASH:
        if (this.stateT >= FLASH_DUR) this.goto(S.INTRO_ENTRANCE);
        break;
      case S.INTRO_ENTRANCE:
        if (this.stateT >= ENTRANCE_DUR) {
          this.message = `¡Una ${this.enemy.name} salió de la página!`;
          this.goto(S.INTRO_TEXT);
        }
        break;
      case S.INTRO_TEXT:
        if (advance || this.stateT >= TEXT_DUR) {
          this.message = '';
          this.goto(S.MENU);
        }
        break;

      case S.MENU:
        if (upE)   this.menuSelected = (this.menuSelected + this.menuOptions.length - 1) % this.menuOptions.length;
        if (downE) this.menuSelected = (this.menuSelected + 1) % this.menuOptions.length;
        if (advance) this.handleMenuSelect();
        break;

      case S.PLAYER_ATTACK:
        if (this.stateT >= 0.32 && !this._dealt) {
          this._dealt = true;
          this.applyPlayerAttack();
        }
        if (this.stateT >= 1.15) {
          if (this.enemy.hp <= 0) {
            this.enemy.alive = false;
            this.message = `La ${this.enemy.name} se evaporó.`;
            this.goto(S.WIN);
          } else {
            this.enemyLungeT = 1;
            this.goto(S.ENEMY_ATTACK);
          }
        }
        break;

      case S.ENEMY_ATTACK:
        // If the enemy is stunned, it skips this turn.
        if (this.enemy.skipNextTurn) {
          if (!this._dealt) {
            this._dealt = true;
            this.enemy.skipNextTurn = false;
            this.enemyLungeT = 0;
            this.message = `¡${this.enemy.name} está mareada!`;
          }
          if (this.stateT >= 1.3) {
            this.message = '';
            this.goto(S.MENU);
          }
          break;
        }
        if (this.stateT >= 0.32 && !this._dealt) {
          this._dealt = true;
          this.applyEnemyAttack();
        }
        if (this.stateT >= 1.15) {
          if (this.player.hp <= 0) {
            this.message = '¡Casi te borran por completo!';
            this.goto(S.LOSE);
          } else {
            this.message = '';
            this.goto(S.MENU);
          }
        }
        break;

      case S.PLAYER_FLEE:
        if (this.stateT >= 0.4 && !this._fleeResolved) {
          this._fleeResolved = true;
          if (Math.random() < 0.65) {
            this.message = '¡Te escapaste por el margen!';
            this._fleeOutcome = 'flee';
          } else {
            this.message = 'No pudiste escapar...';
            this._fleeOutcome = 'fail';
          }
        }
        if (this.stateT >= 1.3) {
          if (this._fleeOutcome === 'flee') {
            this.onEnd('flee');
          } else {
            this._fleeResolved = false;
            this.enemyLungeT = 1;
            this.goto(S.ENEMY_ATTACK);
          }
        }
        break;

      case S.WIN:
        if (this.stateT >= 1.8 || advance) this.onEnd('win');
        break;
      case S.LOSE:
        if (this.stateT >= 2.2 || advance) this.onEnd('lose');
        break;
    }
  }

  handleMenuSelect() {
    const choice = this.menuOptions[this.menuSelected];

    if (this.menuLevel === 'main') {
      if (choice === 'Atacar') {
        this._pendingSkill = 'Atacar';
        this.playerLungeT = 1;
        this.message = '';
        this.goto(S.PLAYER_ATTACK);
      } else if (choice === 'Técnicas') {
        // open submenu
        this.menuLevel = 'tecnicas';
        this.menuOptions = MENU_TECNICAS;
        this.menuSelected = 0;
      } else if (choice === 'Huir') {
        this.goto(S.PLAYER_FLEE);
      }
      return;
    }

    if (this.menuLevel === 'tecnicas') {
      if (choice === '← volver') {
        this.menuLevel = 'main';
        this.menuOptions = MENU_MAIN;
        this.menuSelected = 1; // park cursor back on "Técnicas"
        return;
      }
      const skill = SKILLS[choice];
      if (!skill) return;
      if (skill.cost > 0 && this.player.mp < skill.cost) {
        this.message = '¡No tenés tinta suficiente!';
        return;
      }
      this._pendingSkill = choice;
      this.playerLungeT = 1;
      this.message = '';
      this.goto(S.PLAYER_ATTACK);
    }
  }

  applyPlayerAttack() {
    const skill = SKILLS[this._pendingSkill || 'Atacar'];
    this.player.mp = Math.max(0, this.player.mp - skill.cost);
    const range = skill.maxDmg - skill.minDmg;
    let dmg = Math.max(1, skill.minDmg + Math.floor(Math.random() * (range + 1)) + this.player.atk - 3 - this.enemy.def);
    const isCrit = Math.random() < 0.12;
    if (isCrit) dmg *= 2;
    this.enemy.hp = Math.max(0, this.enemy.hp - dmg);
    this.enemyShakeT = isCrit ? 0.55 : 0.36;
    this.flashT = isCrit ? 0.18 : 0.10;
    this.shakeCamera(isCrit ? 14 : (dmg >= 5 ? 8 : 4), isCrit ? 0.5 : 0.32);
    // chance of inflicting stun
    let stunned = false;
    if (skill.stunChance && Math.random() < skill.stunChance) {
      this.enemy.skipNextTurn = true;
      stunned = true;
    }
    let suffix = '';
    if (isCrit) suffix += '  ¡crítico!';
    if (stunned) suffix += '  ¡mareada!';
    this.message = `${skill.msg}   −${dmg}${suffix}`;
    this.spawnAttackVfx(skill.type);
    this.spawnDamageNumber('enemy', dmg, isCrit ? '#F9D85A' : '#1F2A4A', isCrit);
  }

  applyEnemyAttack() {
    const dmg = Math.max(0, this.enemy.atk + Math.floor(Math.random() * 2) - this.player.def);
    this.player.hp = Math.max(0, this.player.hp - dmg);
    this.playerShakeT = 0.36;
    this.shakeCamera(dmg >= 4 ? 8 : 4, 0.30);
    this.message = `Te salpicó tinta   −${dmg}`;
    this.spawnAttackVfx('ink-splash');
    this.spawnDamageNumber('player', dmg, '#C53A2E');
  }

  spawnAttackVfx(kind) {
    this.attackVfx = { kind, t: 0, duration: 0.55, seed: Math.floor(Math.random() * 10000) };
  }

  spawnDamageNumber(target, value, color, isCrit = false) {
    this.damageNumbers.push({
      target, value, color, isCrit,
      t: 0, duration: isCrit ? 1.3 : 0.95,
    });
  }

  // -----------------------------------------------------------------
  //  Layout — computed per draw so it scales with the viewport
  // -----------------------------------------------------------------

  layout(viewW, viewH) {
    const charW = 360;
    const charH = 160;
    const cmdH = 160;
    const cmdY = viewH - 36 - cmdH;
    return {
      // Over-the-shoulder composition: player in the foreground (closer, larger),
      // enemy in the background (further, smaller). The arena bridges them.
      playerX: viewW * 0.30,
      playerY: viewH * 0.66,
      playerScale: 3.0,
      enemyX:  viewW * 0.68,
      enemyY:  viewH * 0.36,
      enemyScale: 1.8,
      // Bottom-left: character window with mini portrait + stats.
      char:   { x: 36, y: viewH - 36 - charH, w: charW, h: charH },
      // Bottom-right: command menu OR message panel (same slot, content swaps).
      cmd:    { x: 36 + charW + 24, y: cmdY, w: viewW - 36 - 36 - charW - 24, h: cmdH },
      // Floating enemy info above the enemy sprite.
      eInfo:  { w: 260, h: 70 },
    };
  }

  draw(ctx, viewW, viewH, seed, drawWorld, drawPlayerSprite, drawEnemySprite) {
    const L = this.layout(viewW, viewH);

    // Camera shake offset (applied to world/stage/fighters/vfx, NOT the HUD).
    let shx = 0, shy = 0;
    if (this.cameraShakeT > 0) {
      const k = this.cameraShakeStrength;
      const t = this.cameraShakeT;
      shx = Math.sin(t * 70) * k;
      shy = Math.cos(t * 55) * (k * 0.7);
    }
    ctx.save();
    ctx.translate(shx, shy);

    // ---------- background ----------
    if (this.state === S.INTRO_WIPE) {
      // Show the overworld lightly dimmed while the ink slashes draw across it.
      drawWorld();
      ctx.fillStyle = 'rgba(20, 12, 4, 0.20)';
      ctx.fillRect(0, 0, viewW, viewH);
      drawIntroSlashes(ctx, this.slashes, this.stateT, viewW, viewH);
    } else {
      // The battle happens ON the actual page where the enemy lives.
      // World is rendered, then dimmed, then battle decorations composed on top.
      let zoom = 1;
      if (this.state === S.INTRO_FLASH) {
        zoom = 1.18;
      } else if (this.state === S.INTRO_ENTRANCE) {
        const p = Math.min(1, this.stateT / 0.30);
        zoom = 1.18 - p * 0.18;
      }
      if (zoom !== 1) {
        ctx.save();
        ctx.translate(viewW / 2, viewH / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-viewW / 2, -viewH / 2);
        drawWorld();
        drawBattleDim(ctx, viewW, viewH);
        drawBattleStage(ctx, viewW, viewH, seed, L.playerX, L.playerY, L.enemyX, L.enemyY);
        ctx.restore();
      } else {
        drawWorld();
        drawBattleDim(ctx, viewW, viewH);
        drawBattleStage(ctx, viewW, viewH, seed, L.playerX, L.playerY, L.enemyX, L.enemyY);
      }
    }

    // ---------- intro flash ----------
    if (this.flashT > 0) {
      ctx.fillStyle = `rgba(255, 245, 210, ${Math.min(0.9, this.flashT / FLASH_DUR)})`;
      ctx.fillRect(0, 0, viewW, viewH);
    }

    // ---------- fighters ----------
    // skip drawing during wipe (world hasn't transitioned yet)
    if (this.state !== S.INTRO_WIPE) {
      const intro = this.state === S.INTRO_ENTRANCE;
      const introP = intro ? this.stateT / ENTRANCE_DUR : 1;
      const eEnt = easeOutBack(Math.min(1, introP));

      const playerOffX = intro ? -300 * (1 - eEnt) : 0;
      const enemyOffX  = intro ?  300 * (1 - eEnt) : 0;

      const ps = this.playerShakeT > 0 ? Math.sin(this.playerShakeT * 60) * 7 : 0;
      const es = this.enemyShakeT  > 0 ? Math.sin(this.enemyShakeT  * 60) * 7 : 0;
      const pLunge = this.playerLungeT > 0 ? Math.sin(this.playerLungeT * Math.PI) *  80 : 0;
      const eLunge = this.enemyLungeT  > 0 ? Math.sin(this.enemyLungeT  * Math.PI) * -80 : 0;

      // enemy goes first (further back, so player can render in front of attacks if needed)
      if (this.enemy.alive) {
        drawEnemySprite(ctx, L.enemyX + es + eLunge + enemyOffX, L.enemyY, seed, L.enemyScale);
      } else if (this.state === S.WIN && this.stateT < 0.9) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - this.stateT / 0.9);
        drawEnemySprite(ctx, L.enemyX + es + eLunge, L.enemyY, seed, L.enemyScale);
        ctx.restore();
      }

      // stun aura over the enemy's head
      if (this.enemy.alive && this.enemy.skipNextTurn) {
        drawStunAura(ctx, L.enemyX + es + eLunge + enemyOffX, L.enemyY, performance.now() * 0.003);
      }

      // attack vfx (drawn between enemy and player so it reads as "hitting the enemy")
      drawAttackVfx(ctx, this.attackVfx, L, seed);

      // player in the foreground (back view, large)
      drawPlayerSprite(ctx, L.playerX + ps + pLunge + playerOffX, L.playerY, seed, L.playerScale);

      // damage numbers (above everything)
      for (const d of this.damageNumbers) drawDamageNumber(ctx, d, L);
    }

    // ---------- enemy announcement banner ----------
    if (this.state === S.INTRO_ENTRANCE || this.state === S.INTRO_TEXT) {
      drawAnnouncement(ctx, viewW, viewH, this.enemy.name, this.state, this.stateT, seed);
    }

    // End camera-shake region.
    ctx.restore();

    // ---------- HUD (stable, no shake) ----------
    if (this.state !== S.INTRO_WIPE) {
      drawHUD(ctx, viewW, viewH, seed, this, L);
    }

    // ---------- turn banner ----------
    if (this.banner && (this.state === S.MENU || this.state === S.ENEMY_ATTACK)) {
      drawTurnBanner(ctx, viewW, viewH, this.banner);
    }
  }
}

// ============================================================
//  Enemy name announcement (big stamped title)
// ============================================================

function drawAnnouncement(ctx, viewW, viewH, name, state, stateT, seed) {
  let alpha = 1;
  let scale = 1;
  let rotation = -0.04;

  if (state === S.INTRO_ENTRANCE) {
    // Stamps in at ~25% into entrance with overshoot.
    const p = stateT / ENTRANCE_DUR;
    if (p < 0.20) { alpha = 0; }
    else {
      const sp = Math.min(1, (p - 0.20) / 0.60);
      const eb = easeOutBack(sp);
      scale = 0.4 + eb * 0.7;     // 0.4 → 1.1 (overshoot)
      alpha = Math.min(1, sp * 2);
    }
  } else if (state === S.INTRO_TEXT) {
    // Holds, then fades out at the end.
    const p = stateT / TEXT_DUR;
    scale = 1.10 + Math.sin(stateT * 4) * 0.012;
    if (p > 0.75) alpha = Math.max(0, (1 - p) / 0.25);
  }

  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(viewW * 0.5, viewH * 0.28);
  ctx.scale(scale, scale);
  ctx.rotate(rotation);

  ctx.font = "900 86px 'Caveat'";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = '¡' + name + '!';

  // soft glow halo
  ctx.shadowColor = 'rgba(250, 200, 80, 0.75)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = 'rgba(250, 200, 80, 0.0001)';
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0;

  // outline
  ctx.strokeStyle = '#1A1004';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 0, 0);
  // inner outline (cream)
  ctx.strokeStyle = '#FAF1D5';
  ctx.lineWidth = 4;
  ctx.strokeText(text, 0, 0);
  // gold fill gradient
  const grad = ctx.createLinearGradient(0, -50, 0, 50);
  grad.addColorStop(0, '#F9D85A');
  grad.addColorStop(0.55, '#E8A930');
  grad.addColorStop(1, '#A86C10');
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ============================================================
//  Intro slashes
// ============================================================

function makeSlashes() {
  // 7 ink slashes at staggered angles + offsets, growing from the center out.
  const slashes = [];
  const angles = [-0.32, 0.18, -0.55, 0.42, 0.05, -0.18, 0.30];
  for (let i = 0; i < angles.length; i++) {
    slashes.push({
      delay: i * 0.045,
      duration: 0.22,
      angle: angles[i],
      offsetX: (Math.random() - 0.5) * 0.4,
      offsetY: (Math.random() - 0.5) * 0.4,
      seed: Math.floor(Math.random() * 9999),
      thickness: 8 + Math.random() * 6,
    });
  }
  return slashes;
}

function drawIntroSlashes(ctx, slashes, t, viewW, viewH) {
  for (const s of slashes) {
    const local = (t - s.delay) / s.duration;
    if (local <= 0) continue;
    const p = Math.min(1, local);

    // line through center with given angle, growing from middle out
    const cx = viewW * (0.5 + s.offsetX);
    const cy = viewH * (0.5 + s.offsetY);
    const halfLen = viewW * 0.9 * p;
    const dx = Math.cos(s.angle) * halfLen;
    const dy = Math.sin(s.angle) * halfLen;

    ctx.save();
    // ink shadow underneath for "wet" feel
    ctx.globalAlpha = Math.min(1, p * 1.5) * 0.9;
    ctx.strokeStyle = '#06060F';
    ctx.lineWidth = s.thickness + 4;
    ctx.lineCap = 'round';
    wobbleLine(ctx, cx - dx, cy - dy, cx + dx, cy + dy, {
      wobble: 3, seed: s.seed, segments: 16, taper: false,
    });

    // ink main stroke
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1A2240';
    ctx.lineWidth = s.thickness;
    wobbleLine(ctx, cx - dx, cy - dy, cx + dx, cy + dy, {
      wobble: 2.2, seed: s.seed + 1, segments: 16, taper: false,
    });

    // bright "wet ink" highlight on the stroke (subtle)
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = 'rgba(180, 200, 255, 0.5)';
    ctx.lineWidth = s.thickness * 0.3;
    wobbleLine(ctx, cx - dx * 0.9, cy - dy * 0.9, cx + dx * 0.9, cy + dy * 0.9, {
      wobble: 1.4, seed: s.seed + 2, segments: 12, taper: false,
    });
    ctx.restore();
  }
}

// ============================================================
//  Attack VFX (pencil strike, highlighter, ink splash)
// ============================================================

function drawAttackVfx(ctx, fx, L, seed) {
  if (!fx) return;
  const p = fx.t / fx.duration;

  if (fx.kind === 'pencil') {
    // 1) anticipation marks (tiny radial scribbles before impact)
    // 2) the slash itself in 3 layers (shadow / pencil / graphite shine)
    // 3) graphite-dust burst from the impact center
    // 4) lingering scratch
    const ex = L.enemyX, ey = L.enemyY - 30;
    const len = 130;
    const angle = -0.65;
    const x1 = ex - Math.cos(angle) * len;
    const y1 = ey - Math.sin(angle) * len;
    const x2 = ex + Math.cos(angle) * len;
    const y2 = ey + Math.sin(angle) * len;
    const drawP = Math.min(1, p / 0.32);
    const fadeP = Math.max(0, (p - 0.55) / 0.45);
    const ex2 = x1 + (x2 - x1) * drawP;
    const ey2 = y1 + (y2 - y1) * drawP;

    // anticipation (only during first 12%)
    if (p < 0.12) {
      const ap = p / 0.12;
      ctx.save();
      ctx.globalAlpha = 1 - ap;
      ctx.strokeStyle = '#1F2A4A';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = 60 + 20 * ap;
        const x = ex + Math.cos(a) * r;
        const y = ey + Math.sin(a) * r;
        wobbleLine(ctx, x, y, ex + Math.cos(a) * (r - 12), ey + Math.sin(a) * (r - 12),
          { wobble: 0.5, seed: fx.seed + i * 5, segments: 2, taper: false });
      }
      ctx.restore();
    }

    // the slash
    ctx.save();
    ctx.globalAlpha = 1 - fadeP;
    ctx.strokeStyle = '#06060F';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    wobbleLine(ctx, x1, y1, ex2, ey2, { wobble: 3, seed: fx.seed, segments: 14, taper: false });
    ctx.strokeStyle = '#1F2A4A';
    ctx.lineWidth = 7;
    wobbleLine(ctx, x1, y1, ex2, ey2, { wobble: 2, seed: fx.seed + 1, segments: 14, taper: false });
    ctx.strokeStyle = 'rgba(220, 220, 240, 0.5)';
    ctx.lineWidth = 2;
    wobbleLine(ctx, x1, y1, ex2, ey2, { wobble: 1, seed: fx.seed + 2, segments: 12, taper: false });
    ctx.restore();

    // graphite dust burst from the impact center, only after the stroke reaches its peak
    if (p >= 0.30 && p < 0.7) {
      const bp = (p - 0.30) / 0.4;
      ctx.save();
      ctx.globalAlpha = 1 - bp;
      ctx.fillStyle = '#1A1A28';
      const dustCount = 14;
      for (let i = 0; i < dustCount; i++) {
        const a = (i / dustCount) * Math.PI * 2 + i * 0.7;
        const dist = bp * (50 + (i % 4) * 12);
        const dx = Math.cos(a) * dist;
        const dy = Math.sin(a) * dist;
        const r = Math.max(0.4, 3 - bp * 2.5 - (i % 3) * 0.3);
        ctx.beginPath();
        ctx.arc(ex + dx, ey + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // tiny scribble marks
      ctx.strokeStyle = '#1F2A4A';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        const r = 22 + bp * 18;
        const lx = ex + Math.cos(a) * r;
        const ly = ey + Math.sin(a) * r;
        wobbleLine(ctx, lx, ly, lx + Math.cos(a) * 8, ly + Math.sin(a) * 8,
          { wobble: 0.5, seed: fx.seed + 60 + i, segments: 2, taper: false });
      }
      ctx.restore();
    }
  }

  if (fx.kind === 'highlighter') {
    // 1) pre-glow / anticipation strip
    // 2) yellow streak grows from left to right, with a brighter leading edge
    // 3) emphasis lines + sparks at the moving edge
    // 4) lingering ghost strip
    const ex = L.enemyX, ey = L.enemyY - 30;
    const len = 150;
    const x1 = ex - len, y1 = ey;
    const x2 = ex + len, y2 = ey;
    const drawP = Math.min(1, p / 0.30);
    const fadeP = Math.max(0, (p - 0.55) / 0.45);
    const ex2 = x1 + (x2 - x1) * drawP;
    const ey2 = y1 + (y2 - y1) * drawP;

    // pre-glow guide line
    if (p < 0.15) {
      ctx.save();
      ctx.globalAlpha = (p / 0.15) * 0.35;
      ctx.strokeStyle = '#FFE890';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      wobbleLine(ctx, x1, y1, x2, y2, { wobble: 1.2, seed: fx.seed + 99, segments: 12, taper: true });
      ctx.restore();
    }

    // main yellow streak (multiply)
    ctx.save();
    ctx.globalAlpha = (1 - fadeP) * 0.85;
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = '#F9D85A';
    ctx.lineWidth = 36;
    ctx.lineCap = 'butt';
    wobbleLine(ctx, x1, y1, ex2, ey2, { wobble: 3.5, seed: fx.seed, segments: 14, taper: false });
    ctx.restore();

    // bright leading edge while drawing
    if (drawP < 1) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#FFF8D0';
      ctx.beginPath();
      ctx.arc(ex2, ey2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 120, 0.5)';
      ctx.beginPath();
      ctx.arc(ex2, ey2, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // star marks above for extra punch
    ctx.save();
    ctx.globalAlpha = 1 - fadeP;
    ctx.strokeStyle = '#C58A1A';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i++) {
      const sx2 = ex - 60 + i * 30;
      const sy2 = ey - 50 - (i % 2) * 14;
      wobbleLine(ctx, sx2 - 7, sy2, sx2 + 7, sy2, { wobble: 0.6, seed: fx.seed + 10 + i, segments: 3 });
      wobbleLine(ctx, sx2, sy2 - 7, sx2, sy2 + 7, { wobble: 0.6, seed: fx.seed + 20 + i, segments: 3 });
    }
    ctx.restore();
  }

  if (fx.kind === 'x-strike') {
    // Two diagonal slashes forming an X on the enemy. Each slash grows then both fade.
    const ex = L.enemyX, ey = L.enemyY - 20;
    const len = 75;
    const slashes = [
      { angle: -0.6, start: 0.00, end: 0.22, seedOff: 0  },
      { angle:  0.6, start: 0.14, end: 0.36, seedOff: 50 },
    ];
    const fadeP = Math.max(0, (p - 0.62) / 0.38);

    for (const s of slashes) {
      const localP = (p - s.start) / (s.end - s.start);
      if (localP <= 0) continue;
      const drawP = Math.min(1, localP);
      const x1 = ex - Math.cos(s.angle) * len;
      const y1 = ey - Math.sin(s.angle) * len;
      const x2 = ex + Math.cos(s.angle) * len;
      const y2 = ey + Math.sin(s.angle) * len;
      const ex2 = x1 + (x2 - x1) * drawP;
      const ey2 = y1 + (y2 - y1) * drawP;

      ctx.save();
      ctx.globalAlpha = 1 - fadeP;
      ctx.strokeStyle = '#06060F';
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      wobbleLine(ctx, x1, y1, ex2, ey2, { wobble: 3, seed: fx.seed + s.seedOff, segments: 12, taper: false });
      ctx.strokeStyle = '#7C2218';
      ctx.lineWidth = 7;
      wobbleLine(ctx, x1, y1, ex2, ey2, { wobble: 2, seed: fx.seed + s.seedOff + 1, segments: 12, taper: false });
      ctx.restore();
    }

    // red ink splatter at the center of the X (when both slashes have impacted)
    if (p >= 0.36 && p < 0.85) {
      const sp = (p - 0.36) / 0.49;
      ctx.save();
      ctx.globalAlpha = 1 - sp;
      ctx.fillStyle = '#7C2218';
      const droplets = 11;
      for (let i = 0; i < droplets; i++) {
        const a = (i / droplets) * Math.PI * 2 + i * 1.4;
        const dist = sp * (45 + (i % 3) * 14);
        const dx = Math.cos(a) * dist;
        const dy = Math.sin(a) * dist;
        const r = Math.max(0.5, 6 - sp * 4 - (i % 3) * 0.5);
        ctx.beginPath();
        ctx.arc(ex + dx, ey + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // central red blot
      ctx.fillStyle = `rgba(124, 34, 24, ${(1 - sp) * 0.85})`;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ink drips falling from the slash lines (gravity feel)
    if (p >= 0.45) {
      const dripP = Math.min(1, (p - 0.45) / 0.45);
      ctx.save();
      ctx.fillStyle = '#7C2218';
      ctx.globalAlpha = 1 - dripP;
      const drips = [
        [ex - 22, ey + 18, dripP * 28],
        [ex + 26, ey + 22, dripP * 22],
        [ex - 4,  ey + 28, dripP * 18],
      ];
      for (const [dx, dy, dlen] of drips) {
        ctx.beginPath();
        ctx.ellipse(dx, dy + dlen, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // tiny tail
        ctx.fillRect(dx - 1, dy, 2, dlen);
      }
      ctx.restore();
    }
  }

  if (fx.kind === 'spiral') {
    // Animated spiral drawn from center outward over the enemy.
    const cx = L.enemyX, cy = L.enemyY - 20;
    const drawP = Math.min(1, p / 0.45);
    const fadeP = Math.max(0, (p - 0.65) / 0.35);

    ctx.save();
    ctx.globalAlpha = 1 - fadeP;
    ctx.strokeStyle = '#A86C10';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const turns = 3.2;
    const maxR = 70;
    const steps = 90;
    const last = Math.floor(steps * drawP);
    ctx.beginPath();
    for (let i = 0; i <= last; i++) {
      const t = i / steps;
      const a = t * turns * Math.PI * 2;
      const r = t * maxR;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // golden glow on top
    ctx.strokeStyle = '#F9D85A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= last; i++) {
      const t = i / steps;
      const a = t * turns * Math.PI * 2;
      const r = t * maxR;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // tiny glints on the head of the spiral as it draws
    if (last < steps) {
      const t = last / steps;
      const a = t * turns * Math.PI * 2;
      const r = t * maxR;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      ctx.fillStyle = '#FFEFB5';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // concentric ripple rings emanating outward from the spiral center
    if (p >= 0.30 && p < 0.95) {
      const rp = (p - 0.30) / 0.65;
      ctx.save();
      ctx.strokeStyle = '#F9D85A';
      ctx.lineWidth = 2;
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const phase = (rp + i * 0.18) % 1;
        const ringR = 30 + phase * 70;
        const ringAlpha = (1 - phase) * 0.65;
        ctx.globalAlpha = ringAlpha;
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // flying gold sparks orbiting outward
    if (p >= 0.35 && p < 0.9) {
      const sp2 = (p - 0.35) / 0.55;
      ctx.save();
      ctx.fillStyle = '#FFEFB5';
      ctx.globalAlpha = 1 - sp2;
      const sparkCount = 8;
      for (let i = 0; i < sparkCount; i++) {
        const a = (i / sparkCount) * Math.PI * 2 + sp2 * 3;
        const dist = 40 + sp2 * 70;
        const x = cx + Math.cos(a) * dist;
        const y = cy + Math.sin(a) * dist;
        const r = Math.max(0.3, 3 - sp2 * 2);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  if (fx.kind === 'ink-splash') {
    // dark droplets radiate from enemy to player, splatter on player
    const sx = L.enemyX, sy = L.enemyY - 30;
    const tx = L.playerX, ty = L.playerY - 50;

    if (p < 0.5) {
      // projectile phase: ink blob travels
      const pp = p / 0.5;
      const blobX = sx + (tx - sx) * pp;
      const blobY = sy + (ty - sy) * pp;
      ctx.save();
      ctx.fillStyle = '#0F1530';
      ctx.beginPath();
      ctx.arc(blobX, blobY, 12 - pp * 4, 0, Math.PI * 2);
      ctx.fill();
      // trailing drops
      for (let i = 0; i < 4; i++) {
        const tp = Math.max(0, pp - i * 0.08);
        const trailX = sx + (tx - sx) * tp;
        const trailY = sy + (ty - sy) * tp;
        ctx.globalAlpha = (1 - i / 4) * 0.7;
        ctx.beginPath();
        ctx.arc(trailX, trailY, 4 + i * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      // splatter phase: droplets radiate from impact point
      const sp = (p - 0.5) / 0.5;
      ctx.save();
      const drops = 9;
      for (let i = 0; i < drops; i++) {
        const a = (i / drops) * Math.PI * 2 + i * 1.3;
        const dist = sp * (45 + (i % 3) * 18);
        const dx = Math.cos(a) * dist;
        const dy = Math.sin(a) * dist;
        const r = Math.max(0.3, (1 - sp) * 7 - i * 0.3);
        ctx.fillStyle = `rgba(15, 21, 48, ${1 - sp})`;
        ctx.beginPath();
        ctx.arc(tx + dx, ty + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // central splotch
      ctx.fillStyle = `rgba(15, 21, 48, ${(1 - sp) * 0.7})`;
      ctx.beginPath();
      ctx.ellipse(tx, ty, 18, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// ============================================================
//  Damage numbers
// ============================================================

function drawDamageNumber(ctx, d, L) {
  const p = d.t / d.duration;
  const baseX = d.target === 'enemy' ? L.enemyX : L.playerX;
  const baseY = (d.target === 'enemy' ? L.enemyY : L.playerY) - 90;
  const offsetY = -p * (d.isCrit ? 90 : 60);
  let alpha = 1;
  if (p < 0.12) alpha = p / 0.12;
  if (p > 0.7)  alpha = (1 - p) / 0.3;
  const baseSize = d.isCrit ? 60 : 38;
  let scale = 1.2;
  if (p < 0.2) scale = 0.4 + (p / 0.2) * 1.2;
  else if (p < 0.4) scale = 1.6 - ((p - 0.2) / 0.2) * 0.4;
  else scale = 1.2;
  if (d.isCrit) scale *= 1.1;

  ctx.save();
  ctx.translate(baseX, baseY + offsetY);
  ctx.scale(scale, scale);
  ctx.globalAlpha = Math.max(0, alpha);

  if (d.isCrit) {
    ctx.font = "700 22px 'Caveat'";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('¡crítico!', 0, -38);
    ctx.fillStyle = '#F9D85A';
    ctx.fillText('¡crítico!', 0, -38);
  }

  ctx.font = `900 ${baseSize}px 'Caveat'`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = `−${d.value}`;
  ctx.strokeStyle = d.isCrit ? '#1A1004' : 'rgba(255, 250, 230, 0.9)';
  ctx.lineWidth = d.isCrit ? 7 : 5;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = d.color;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// ============================================================
//  HUD — Golden Sun-style: character window + floating enemy info
// ============================================================

function drawHUD(ctx, viewW, viewH, seed, combat, L) {
  const entering = combat.state === S.INTRO_ENTRANCE;
  const introP = entering ? combat.stateT / ENTRANCE_DUR : 1;
  const e = easeOutBack(Math.min(1, introP));
  const downOff = entering ?  (260 * (1 - e)) : 0;   // bottom panels slide UP from below
  const upOff   = entering ? -(140 * (1 - e)) : 0;   // floating enemy info slides DOWN from above

  // Floating enemy info above the enemy
  const eInfoX = L.enemyX - L.eInfo.w / 2;
  const eInfoY = L.enemyY - 150 + upOff;
  drawFloatingEnemyInfo(ctx, eInfoX, eInfoY, L.eInfo.w, L.eInfo.h, seed + 110, combat.enemy);

  // Bottom-left character window
  drawCharacterWindow(ctx, L.char.x, L.char.y + downOff, L.char.w, L.char.h, seed + 100, combat.player, combat);

  // Bottom-right: command menu OR message panel (content swaps by state)
  drawCommandOrMessagePanel(ctx, L.cmd.x, L.cmd.y + downOff, L.cmd.w, L.cmd.h, seed + 120, combat);
}

function drawCharacterWindow(ctx, x, y, w, h, seed, player, combat) {
  drawStickyPanel(ctx, x, y, w, h, seed, { tilt: -0.012 });
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(-0.012);

  // Mini player portrait on the left
  const portW = h - 18;
  const portCx = -w / 2 + 14 + portW / 2;
  ctx.save();
  ctx.translate(portCx, h / 2 - 12);
  const portraitScale = (portW - 14) / 200;
  ctx.scale(portraitScale, portraitScale);
  // expression based on combat state
  let expr = 'neutral';
  const hpR = player.hp / player.maxHp;
  if (combat && combat.playerShakeT > 0.05) expr = 'surprised';
  else if (hpR < 0.25)                       expr = 'worried';
  else if (combat && combat.state === 'win') expr = 'happy';
  drawPlayerPortrait(ctx, 0, 0, seed, expr);
  ctx.restore();

  // Right side: name, class, HP, MP
  const tx = -w / 2 + portW + 26;
  const innerW = w - (portW + 26) - 20;

  ctx.font = "700 30px 'Caveat'";
  ctx.fillStyle = '#1F2A4A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('?', tx, -h / 2 + 12);

  ctx.font = "400 14px 'Patrick Hand'";
  ctx.fillStyle = 'rgba(40, 30, 15, 0.65)';
  ctx.fillText('lv. 1 · doodle del margen', tx + 24, -h / 2 + 22);

  drawLabeledBar(ctx, tx, -h / 2 + 50, innerW, 16, player.hp, player.maxHp, '#C53A2E', 'HP',    seed + 1);
  drawLabeledBar(ctx, tx, -h / 2 + 78, innerW, 13, player.mp, player.maxMp, '#3a8FCB', 'Tinta', seed + 2);

  ctx.restore();
}

function drawFloatingEnemyInfo(ctx, x, y, w, h, seed, enemy) {
  drawStickyPanel(ctx, x, y, w, h, seed, { tilt: 0.018, fill: '#F0E6CA' });
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(0.018);

  ctx.font = "700 22px 'Caveat'";
  ctx.fillStyle = '#1F2A4A';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(enemy.name, -w / 2 + 14, -h / 2 + 8);

  drawLabeledBar(ctx, -w / 2 + 14, -h / 2 + 36, w - 28, 14, enemy.hp, enemy.maxHp, '#C53A2E', 'HP', seed + 1);

  ctx.restore();
}

function drawLabeledBar(ctx, x, y, w, h, current, max, color, label, seed) {
  ctx.font = "700 13px 'Patrick Hand'";
  ctx.fillStyle = '#2A2010';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(label, x, y - 1);
  const barX = x + 50;
  const barW = w - 50;

  // bg
  ctx.fillStyle = 'rgba(40, 25, 10, 0.25)';
  ctx.fillRect(barX, y, barW, h);
  // fill
  const ratio = Math.max(0, current / max);
  ctx.fillStyle = color;
  ctx.fillRect(barX + 1, y + 1, (barW - 2) * ratio, h - 2);
  // wobble border
  ctx.strokeStyle = '#5A4020';
  ctx.lineWidth = 1.4;
  wobbleShape(ctx, [
    [barX, y], [barX + barW, y], [barX + barW, y + h], [barX, y + h],
  ], { wobble: 0.5, seed, segments: 6 });
  // value text
  ctx.font = "700 12px 'Patrick Hand'";
  ctx.fillStyle = '#FAF1D5';
  ctx.textAlign = 'right';
  ctx.fillText(`${current}/${max}`, barX + barW - 4, y);
}

function drawCommandOrMessagePanel(ctx, x, y, w, h, seed, combat) {
  drawStickyPanel(ctx, x, y, w, h, seed, { tilt: 0.012 });
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(0.012);

  if (combat.state === S.MENU) {
    // Title with breadcrumb when in a submenu
    ctx.font = "700 22px 'Caveat'";
    ctx.fillStyle = '#1F2A4A';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const title = combat.menuLevel === 'tecnicas' ? 'comando · técnicas' : 'comando';
    ctx.fillText(title, -w / 2 + 18, -h / 2 + 10);

    // Two-column grid: 5 options across 3 rows × 2 columns
    ctx.font = "400 22px 'Patrick Hand'";
    ctx.textBaseline = 'middle';
    const itemsTop = -h / 2 + 50;
    const colCount = 2;
    const colW = (w - 30) / colCount;
    const rowH = 34;
    const cursorPulse = 0.7 + 0.3 * Math.sin(performance.now() * 0.008);

    for (let i = 0; i < combat.menuOptions.length; i++) {
      const opt = combat.menuOptions[i];
      const skill = SKILLS[opt];
      const sel = combat.menuSelected === i;
      const col = i % colCount;
      const row = Math.floor(i / colCount);
      const baseX = -w / 2 + 18 + col * colW;
      const yPos = itemsTop + row * rowH;
      const insufficientMp = skill && skill.cost > 0 && combat.player.mp < skill.cost;

      if (sel) {
        ctx.fillStyle = `rgba(31, 42, 74, ${cursorPulse})`;
        ctx.font = "700 24px 'Caveat'";
        ctx.textAlign = 'left';
        ctx.fillText('▶', baseX, yPos);
        ctx.font = "400 22px 'Patrick Hand'";
      }

      // icon
      let iconKind;
      if (opt === 'Huir') iconKind = 'flee';
      else if (opt === 'Técnicas') iconKind = 'tecnicas';
      else if (opt === '← volver') iconKind = 'back';
      else iconKind = skill && skill.type;
      drawSkillIcon(ctx, baseX + 30, yPos, iconKind, seed + 50 + i, insufficientMp);

      // label
      ctx.fillStyle = insufficientMp ? 'rgba(80, 55, 30, 0.45)' : (sel ? '#1F2A4A' : 'rgba(50, 35, 18, 0.85)');
      ctx.textAlign = 'left';
      ctx.fillText(opt, baseX + 46, yPos);

      // cost
      if (skill && skill.cost > 0) {
        ctx.font = "400 15px 'Patrick Hand'";
        ctx.fillStyle = insufficientMp ? 'rgba(80, 55, 30, 0.45)' : 'rgba(58, 143, 203, 0.85)';
        ctx.textAlign = 'right';
        ctx.fillText(`${skill.cost} t`, baseX + colW - 22, yPos);
        ctx.font = "400 22px 'Patrick Hand'";
      }
    }
  } else {
    // Message mode
    ctx.font = "400 28px 'Patrick Hand'";
    ctx.fillStyle = '#2A2010';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (combat.message) {
      ctx.fillText(combat.message, 0, 0);
    } else {
      ctx.font = "400 24px 'Patrick Hand'";
      ctx.fillStyle = 'rgba(60, 40, 20, 0.55)';
      ctx.fillText('. . .', 0, 0);
    }
  }

  ctx.restore();
}

function drawSkillIcon(ctx, x, y, kind, seed, dim) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = dim ? 0.4 : 1;
  switch (kind) {
    case 'pencil': {
      ctx.strokeStyle = '#1F2A4A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      wobbleLine(ctx, -7, 6, 7, -6, { wobble: 0.3, seed, segments: 3, taper: false });
      ctx.fillStyle = '#1F2A4A';
      ctx.beginPath();
      ctx.moveTo(7, -6); ctx.lineTo(11, -9); ctx.lineTo(4, -2);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'highlighter': {
      ctx.fillStyle = '#F9D85A';
      ctx.strokeStyle = '#A86C10';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.rect(-9, -4, 18, 8);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'x-strike': {
      ctx.strokeStyle = '#7C2218';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      wobbleLine(ctx, -8, -8, 8, 8, { wobble: 0.3, seed, segments: 3, taper: false });
      wobbleLine(ctx, 8, -8, -8, 8, { wobble: 0.3, seed: seed + 1, segments: 3, taper: false });
      break;
    }
    case 'spiral': {
      ctx.strokeStyle = '#A86C10';
      ctx.lineWidth = 2;
      const turns = 1.4;
      const steps = 24;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = t * turns * Math.PI * 2;
        const r = t * 9;
        const xx = Math.cos(a) * r;
        const yy = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(xx, yy);
        else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
      break;
    }
    case 'flee': {
      ctx.strokeStyle = '#1F2A4A';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      wobbleLine(ctx, -8, 0, 8, 0, { wobble: 0.3, seed, segments: 3, taper: false });
      wobbleLine(ctx, 8, 0, 3, -5, { wobble: 0.3, seed: seed + 1, segments: 2, taper: false });
      wobbleLine(ctx, 8, 0, 3, 5,  { wobble: 0.3, seed: seed + 2, segments: 2, taper: false });
      break;
    }
    case 'tecnicas': {
      // a small cluster of stars/sparkles
      ctx.strokeStyle = '#A86C10';
      ctx.fillStyle = '#F9D85A';
      ctx.lineWidth = 1.4;
      const sparkAt = (x, y, sz) => {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4;
          const r = (i % 2 === 0) ? sz : sz * 0.45;
          const px = x + Math.cos(a) * r;
          const py = y + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };
      sparkAt( 0, -5, 5);
      sparkAt(-6,  4, 3.5);
      sparkAt( 6,  4, 3.5);
      break;
    }
    case 'back': {
      ctx.strokeStyle = '#5A4020';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      wobbleLine(ctx,  8, 0, -8, 0, { wobble: 0.3, seed, segments: 3, taper: false });
      wobbleLine(ctx, -8, 0, -3, -5, { wobble: 0.3, seed: seed + 1, segments: 2, taper: false });
      wobbleLine(ctx, -8, 0, -3, 5,  { wobble: 0.3, seed: seed + 2, segments: 2, taper: false });
      break;
    }
  }
  ctx.restore();
}

function drawTurnBanner(ctx, viewW, viewH, banner) {
  const p = banner.t / banner.duration;
  const dir = banner.side === 'left' ? -1 : 1;
  let xOff = 0;
  if (p < 0.30) xOff = dir * (1 - p / 0.30) * 260;
  else if (p > 0.70) xOff = dir * ((p - 0.70) / 0.30) * 260;
  const alpha = p < 0.15 ? p / 0.15 : (p > 0.85 ? (1 - p) / 0.15 : 1);

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(viewW / 2 + xOff, viewH * 0.16);
  ctx.rotate(dir * 0.02);

  ctx.font = "700 52px 'Caveat'";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(banner.text, 4, 5);
  // dark outline
  ctx.strokeStyle = '#1A1004';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.strokeText(banner.text, 0, 0);
  // cream inner outline
  ctx.strokeStyle = '#FAF1D5';
  ctx.lineWidth = 3.5;
  ctx.strokeText(banner.text, 0, 0);
  // gold gradient fill
  const grad = ctx.createLinearGradient(0, -32, 0, 32);
  grad.addColorStop(0, '#F9D85A');
  grad.addColorStop(0.55, '#E8A930');
  grad.addColorStop(1, '#A86C10');
  ctx.fillStyle = grad;
  ctx.fillText(banner.text, 0, 0);

  ctx.restore();
}

// ============================================================
//  Sticky panel helpers (local copies for self-containment)
// ============================================================

function drawStickyPanel(ctx, x, y, w, h, seed, opts = {}) {
  const tilt = opts.tilt ?? 0;
  const fill = opts.fill ?? '#FAF2D6';
  const tapeColor = opts.tapeColor ?? 'rgba(232, 200, 90, 0.62)';
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(tilt);
  // shadow
  ctx.save();
  ctx.translate(5, 7);
  ctx.fillStyle = 'rgba(30, 18, 8, 0.32)';
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.fill();
  ctx.restore();
  // body
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.rect(-w / 2, -h / 2, w, h);
  ctx.fill();
  const corners = [
    [-w / 2 + 1, -h / 2 + 1],
    [ w / 2 - 1, -h / 2 + 1],
    [ w / 2 - 1,  h / 2 - 1],
    [-w / 2 + 1,  h / 2 - 1],
  ];
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#5A4020';
  wobbleShape(ctx, corners, { wobble: 1.6, seed: seed + 1, segments: 10, fill: null });
  drawTape(ctx, -w / 2 + 32, -h / 2 + 2, 50, 16, -0.22, tapeColor);
  drawTape(ctx,  w / 2 - 32, -h / 2 + 2, 50, 16,  0.20, tapeColor);
  ctx.restore();
}

function drawTape(ctx, cx, cy, w, h, rot, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(140, 110, 40, 0.55)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 2, -h / 2 + 1);
  ctx.lineTo( w / 2 - 1, -h / 2 - 1);
  ctx.lineTo( w / 2 - 2,  h / 2);
  ctx.lineTo(-w / 2 + 1,  h / 2 - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ============================================================
//  Easing
// ============================================================

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
