import { CELL, MARGIN_X } from './paper.js';

export class TileMap {
  constructor(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
    this.cols = Math.floor(viewW / CELL);
    this.rows = Math.floor(viewH / CELL);
    this.minX = Math.ceil((MARGIN_X + 8) / CELL);
    this.maxX = this.cols - 1;
    this.minY = 2;
    this.maxY = this.rows - 2;
    this.blockers = [];
    this.enemies  = [];
    this.exits    = [];
  }

  isWalkable(cx, cy) {
    if (!(cx >= this.minX && cx <= this.maxX && cy >= this.minY && cy <= this.maxY)) return false;
    for (const b of this.blockers) {
      if (b.cellX === cx && b.cellY === cy) return false;
    }
    return true;
  }

  setBlockers(blockers) { this.blockers = blockers; }
  setEnemies(enemies)   { this.enemies   = enemies; }
  setExits(exits)       { this.exits     = exits; }

  cellToPixel(cx, cy) {
    return {
      x: cx * CELL + CELL / 2,
      y: cy * CELL + CELL * 0.7,
    };
  }

  enemyAt(cx, cy) {
    for (const e of this.enemies) {
      if (e.cellX === cx && e.cellY === cy) return e;
    }
    return null;
  }

  exitAt(cx, cy, direction) {
    for (const ex of this.exits) {
      if (ex.cellX === cx && ex.cellY === cy && ex.direction === direction) return ex;
    }
    return null;
  }
}
