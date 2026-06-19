import { renderPaper, invalidatePaper } from './paper.js';
import { Doodle } from './doodle.js';
import { createInput } from './input.js';
import { buildScene1, buildScene2 } from './decor.js';
import { TileMap } from './tilemap.js';
import { Stickman } from './npc.js';
import { InkBlot } from './enemy.js';
import { Dialogue } from './dialogue.js';
import { PageTransition } from './transition.js';
import { Combat } from './combat.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ============================================================
//  Scripts and content
// ============================================================

const STICKY_SCRIPT = [
  { speaker: 'stickman', label: 'Sticky', expression: 'neutral',
    text: 'Eh... ¿también te despertaste hoy?' },
  { speaker: 'player',   label: '?',      expression: 'surprised',
    text: '¿Despertarme? Hace un segundo estaba en el margen, supongo. ¿Ahora estoy acá?' },

  { speaker: 'stickman', label: 'Sticky', expression: 'worried',
    text: 'Mi línea izquierda se borró durante la noche. Me dolió un poco. No sabía que podía doler.' },
  { speaker: 'player',   label: '?',      expression: 'worried',
    text: '¿Dolió? Yo no sentí nada cuando me dibujaron. Igual no me dibujaron con cuidado, eh.' },

  { speaker: 'stickman', label: 'Sticky', expression: 'sad',
    text: 'Cada mañana hay menos de nosotros. Margarita ya no está. La flor de allá tampoco.' },
  { speaker: 'player',   label: '?',      expression: 'sad',
    text: 'No la conocí. Pero igual lo siento. Suena horrible que te borren así, sin avisar.' },

  { speaker: 'stickman', label: 'Sticky', expression: 'surprised',
    text: '¡Pero esperá! ¿Vos no eras un doodle del margen? Los del margen no se borran nunca. ¿Cómo llegaste hasta acá?' },
  { speaker: 'player',   label: '?',      expression: 'neutral',
    text: 'No sé. Me desperté caminando hacia acá. Como si alguien me hubiera empujado fuera del margen.' },

  { speaker: 'stickman', label: 'Sticky', expression: 'happy',
    text: 'Hay rumores de un doodle al final del cuaderno, en la tapa. Dicen que sabe cómo evitar que el Borrador termine la obra.' },
  { speaker: 'player',   label: '?',      expression: 'happy',
    text: '¿La tapa? ¿En serio existe? Pensé que el cuaderno no terminaba nunca.' },

  { speaker: 'stickman', label: 'Sticky', expression: 'angry',
    text: 'Si vas... hacele esto al Borrador de mi parte. Me arruinó la sonrisa con su goma asquerosa.' },
  { speaker: 'player',   label: '?',      expression: 'angry',
    text: 'Lo voy a hacer. Por Margarita, por tu línea izquierda, por todos los garabatos borrados.' },
];

// ============================================================
//  Page builder
// ============================================================

function buildPage(pageNum, viewW, viewH, tilemap) {
  const midY = tilemap.minY + Math.floor((tilemap.maxY - tilemap.minY) * 0.55);

  if (pageNum === 1) {
    // Sticky lives 2 cells above the horizontal "highway" so he doesn't block it.
    const npcCellX = tilemap.minX + Math.floor((tilemap.maxX - tilemap.minX) * 0.55);
    const exits = [];
    for (let cy = tilemap.minY; cy <= tilemap.maxY; cy++) {
      exits.push({ cellX: tilemap.maxX, cellY: cy, direction: 'right', toPage: 2 });
    }
    return {
      pageNum: 1,
      scene: buildScene1(viewW, viewH),
      npcs: [new Stickman(npcCellX, midY - 3, tilemap, { label: 'Sticky', script: STICKY_SCRIPT })],
      enemies: [],
      exits,
      defaultEntry: { cellX: tilemap.minX + Math.floor((tilemap.maxX - tilemap.minX) * 0.42), cellY: midY, facing: 'down' },
    };
  }

  if (pageNum === 2) {
    // Ink blot off the direct entry row so the player has to choose to engage.
    const enemyCellX = tilemap.maxX - 10;
    const exits = [];
    for (let cy = tilemap.minY; cy <= tilemap.maxY; cy++) {
      exits.push({ cellX: tilemap.minX, cellY: cy, direction: 'left', toPage: 1 });
    }
    return {
      pageNum: 2,
      scene: buildScene2(viewW, viewH),
      npcs: [],
      enemies: [new InkBlot(enemyCellX, midY, tilemap)],
      exits,
      defaultEntry: { cellX: tilemap.minX, cellY: midY, facing: 'right' },
    };
  }
}

function entryFromExit(exit, newTilemap) {
  if (exit.direction === 'right') return { cellX: newTilemap.minX, cellY: exit.cellY, facing: 'right' };
  if (exit.direction === 'left')  return { cellX: newTilemap.maxX, cellY: exit.cellY, facing: 'left' };
  if (exit.direction === 'down')  return { cellX: exit.cellX, cellY: newTilemap.minY, facing: 'down' };
  if (exit.direction === 'up')    return { cellX: exit.cellX, cellY: newTilemap.maxY, facing: 'up' };
}

// ============================================================
//  Global state
// ============================================================

let viewW = 0, viewH = 0, dpr = 1;
let tilemap = null;
let currentPage = null;
let player = null;
let dialogue = null;
let pageTransition = null;
let combat = null;

const input = createInput();

const DIR_VEC = {
  left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1],
};

function applyPage(page) {
  currentPage = page;
  tilemap.setBlockers([...page.npcs, ...page.enemies]);
  tilemap.setEnemies(page.enemies);
  tilemap.setExits(page.exits);
}

function resize() {
  dpr = window.devicePixelRatio || 1;
  viewW = window.innerWidth;
  viewH = window.innerHeight;
  canvas.width = Math.ceil(viewW * dpr);
  canvas.height = Math.ceil(viewH * dpr);
  canvas.style.width = viewW + 'px';
  canvas.style.height = viewH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  invalidatePaper();

  tilemap = new TileMap(viewW, viewH);

  if (!player) {
    const page1 = buildPage(1, viewW, viewH, tilemap);
    applyPage(page1);
    const e = page1.defaultEntry;
    player = new Doodle(e.cellX, e.cellY, tilemap);
    player.facing = e.facing;
    window.__doodli = {
      player, input,
      getCurrentPage: () => currentPage,
      getDialogue: () => dialogue,
      getCombat: () => combat,
      getTransition: () => pageTransition,
    };
  } else {
    // Rebuild current page with new viewport size
    const pageNum = currentPage.pageNum;
    const page = buildPage(pageNum, viewW, viewH, tilemap);
    applyPage(page);
    player.tilemap = tilemap;
    player.cellX = Math.max(tilemap.minX, Math.min(tilemap.maxX, player.cellX));
    player.cellY = Math.max(tilemap.minY, Math.min(tilemap.maxY, player.cellY));
    const p = tilemap.cellToPixel(player.cellX, player.cellY);
    player.x = p.x; player.y = p.y; player.state = 'idle';
  }
}

window.addEventListener('resize', resize);
resize();

// ============================================================
//  Page transition trigger
// ============================================================

function renderPageToImage(page, includePlayer) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(viewW * dpr);
  c.height = Math.ceil(viewH * dpr);
  const oc = c.getContext('2d');
  oc.setTransform(dpr, 0, 0, dpr, 0, 0);

  renderPaper(oc, viewW, viewH, dpr);

  const items = [];
  for (const d of page.scene) items.push({ y: d.y, render: () => d.draw(oc, d.x, d.y, boilSeed) });
  for (const n of page.npcs)  items.push({ y: n.y, render: () => n.draw(oc, boilSeed) });
  for (const e of page.enemies) items.push({ y: e.y, render: () => e.draw(oc, boilSeed) });
  if (includePlayer) items.push({ y: player.y, render: () => player.draw(oc, boilSeed) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.render();

  return c;
}

function startPageTransition(exit) {
  // Pre-render the outgoing page with the player at the exit cell.
  const fromImage = renderPageToImage(currentPage, true);

  // Build the destination page.
  const newTilemap = new TileMap(viewW, viewH);
  const toPage = buildPage(exit.toPage, viewW, viewH, newTilemap);
  const entry = entryFromExit(exit, newTilemap);

  // Pre-render the destination page WITHOUT the player (he'll appear after flip).
  const toImage = renderPageToImage(toPage, false);

  pageTransition = new PageTransition({
    duration: 0.7,
    fromImage,
    toImage,
    newTilemap,
    toPage,
    entry,
  });
}

// ============================================================
//  Combat trigger
// ============================================================

function startCombat(enemy) {
  // Hide the enemy from the world render so it doesn't double-draw behind the battle.
  enemy._inCombat = true;
  combat = new Combat(player, enemy, (result) => {
    enemy._inCombat = false;
    combat = null;
    if (result === 'win') {
      // remove the dead enemy from the world
      currentPage.enemies = currentPage.enemies.filter(e => e !== enemy);
      applyPage(currentPage);
    } else if (result === 'lose') {
      // respawn at default entry of page 1
      const page1 = buildPage(1, viewW, viewH, tilemap);
      applyPage(page1);
      const e = page1.defaultEntry;
      player.cellX = e.cellX; player.cellY = e.cellY;
      const p = tilemap.cellToPixel(player.cellX, player.cellY);
      player.x = p.x; player.y = p.y;
      player.facing = e.facing; player.state = 'idle';
      player.hp = player.maxHp;
      player.mp = player.maxMp;
    } else if (result === 'flee') {
      // step the player one cell back (away from the enemy) if possible
      const back = oppositeOf(player.facing);
      const [dx, dy] = DIR_VEC[back];
      const nx = player.cellX + dx, ny = player.cellY + dy;
      if (tilemap.isWalkable(nx, ny)) {
        player.cellX = nx; player.cellY = ny;
        const p = tilemap.cellToPixel(player.cellX, player.cellY);
        player.x = p.x; player.y = p.y;
      }
      player.facing = back;
    }
  });
}

function oppositeOf(dir) {
  return { left: 'right', right: 'left', up: 'down', down: 'up' }[dir];
}

// ============================================================
//  Frame loop
// ============================================================

const BOIL_HZ = 8;
const BOIL_INTERVAL = 1 / BOIL_HZ;
let boilSeed = Math.floor(Math.random() * 1e6);
let boilAcc = 0;
let lastTime = performance.now();

function drawWorld() {
  ctx.clearRect(0, 0, viewW, viewH);
  renderPaper(ctx, viewW, viewH, dpr);

  const items = [];
  for (const d of currentPage.scene) items.push({ y: d.y, render: () => d.draw(ctx, d.x, d.y, boilSeed) });
  for (const n of currentPage.npcs) items.push({ y: n.y, render: () => n.draw(ctx, boilSeed) });
  for (const e of currentPage.enemies) {
    if (e._inCombat) continue;
    items.push({ y: e.y, render: () => e.draw(ctx, boilSeed) });
  }
  items.push({ y: player.y, render: () => player.draw(ctx, boilSeed) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.render();
}

function drawTransitionFrame() {
  const p = pageTransition.progress();
  const angle = p * Math.PI / 2;       // 0 → 90°
  const scaleX = Math.cos(angle);      // 1 → 0

  // Destination page underneath.
  ctx.drawImage(pageTransition.toImage, 0, 0, viewW, viewH);

  // Soft shadow on the revealed page next to the lifting edge.
  const edgeX = viewW * scaleX;
  if (scaleX > 0 && scaleX < 1) {
    const shadowAlpha = (1 - scaleX) * 0.45;
    const grad = ctx.createLinearGradient(edgeX, 0, edgeX + 90, 0);
    grad.addColorStop(0, `rgba(20, 12, 4, ${shadowAlpha})`);
    grad.addColorStop(1, 'rgba(20, 12, 4, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(edgeX, 0, 90, viewH);
  }

  // Lifting page (outgoing) — horizontally compressed around the spine (x = 0).
  if (scaleX > 0.005) {
    ctx.save();
    ctx.scale(scaleX, 1);
    ctx.drawImage(pageTransition.fromImage, 0, 0, viewW, viewH);

    // Darken as it tilts away.
    ctx.fillStyle = `rgba(20, 12, 4, ${(1 - scaleX) * 0.55})`;
    ctx.fillRect(0, 0, viewW, viewH);

    // Soft crease shadow near the spine.
    const fold = ctx.createLinearGradient(0, 0, 70, 0);
    fold.addColorStop(0, `rgba(0, 0, 0, ${0.25 * (1 - scaleX)})`);
    fold.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fold;
    ctx.fillRect(0, 0, 70, viewH);

    ctx.restore();
  }
}

function drawPlayerForCombat(c, x, y, seed, scale) {
  // Back view (we see the player from behind, looking "into" the screen at the enemy).
  // Golden Sun-style over-the-shoulder framing.
  player.drawBattle(c, x, y, seed, scale, 'up');
}
function drawEnemyForCombat(c, x, y, seed, scale) {
  combat.enemy.drawBig(c, x, y, seed, scale);
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  boilAcc += dt;
  if (boilAcc >= BOIL_INTERVAL) {
    boilAcc -= BOIL_INTERVAL;
    boilSeed = (boilSeed + 1 + Math.floor(Math.random() * 7919)) | 0;
  }

  // ----- update -----
  if (pageTransition) {
    pageTransition.update(dt);
    if (pageTransition.done) {
      // swap to new page
      const t = pageTransition;
      tilemap = t.newTilemap;
      applyPage(t.toPage);
      player.tilemap = tilemap;
      player.cellX = t.entry.cellX;
      player.cellY = t.entry.cellY;
      player.facing = t.entry.facing;
      player.state = 'idle';
      const p = tilemap.cellToPixel(player.cellX, player.cellY);
      player.x = p.x; player.y = p.y;
      pageTransition = null;
    }
  } else if (combat) {
    combat.update(dt, input);
  } else if (dialogue) {
    dialogue.update(dt);
    if (input.talkPressed) {
      input.talkPressed = false;
      dialogue.advance();
      if (dialogue.done) dialogue = null;
    }
  } else {
    // overworld
    if (input.talkPressed) {
      input.talkPressed = false;
      const [dx, dy] = DIR_VEC[player.facing];
      const tx = player.cellX + dx;
      const ty = player.cellY + dy;
      const npc = currentPage.npcs.find(n => n.cellX === tx && n.cellY === ty);
      if (npc && npc.script && npc.script.length) {
        dialogue = new Dialogue(npc.script);
      }
    }
    player.update(dt, input);
    for (const n of currentPage.npcs) n.update(dt);
    for (const e of currentPage.enemies) e.update(dt);

    if (player.exitTriggered) {
      const exit = player.exitTriggered;
      player.exitTriggered = null;
      startPageTransition(exit);
    }
    if (player.encounterTriggered) {
      const enemy = player.encounterTriggered;
      player.encounterTriggered = null;
      startCombat(enemy);
    }
  }

  // ----- render -----
  if (pageTransition) {
    drawTransitionFrame();
  } else if (combat) {
    combat.draw(ctx, viewW, viewH, boilSeed, drawWorld, drawPlayerForCombat, drawEnemyForCombat);
  } else {
    drawWorld();
    if (dialogue) dialogue.draw(ctx, viewW, viewH, boilSeed);
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
