// Page-flip transition. The outgoing page is pre-rendered to an offscreen
// canvas, then animated as if it were physically hinged at the spine (left
// edge of the page) and being lifted to reveal the incoming page underneath.

export class PageTransition {
  constructor(opts) {
    this.duration = opts.duration ?? 0.65;
    this.fromImage = opts.fromImage;   // offscreen canvas: outgoing page WITH player
    this.toImage = opts.toImage;       // offscreen canvas: incoming page (no player)
    this.newTilemap = opts.newTilemap;
    this.toPage = opts.toPage;
    this.entry = opts.entry;
    this.t = 0;
    this.done = false;
  }

  update(dt) {
    this.t = Math.min(1, this.t + dt / this.duration);
    if (this.t >= 1) this.done = true;
  }

  // ease-in then accelerate — the page is "lifted" with effort, then snaps over.
  // Maps linear time → flip angle from 0 to π/2 (90°). Beyond that the page is
  // edge-on and the incoming page is fully revealed.
  progress() {
    const t = this.t;
    return t * t;     // easeInQuad — slow lift, fast snap
  }
}
