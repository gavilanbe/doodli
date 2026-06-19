export function createInput() {
  const state = {
    left: false, right: false, up: false, down: false,
    run: false,
    // Edge-triggered: consumer reads then resets to false.
    talkPressed: false,
  };
  const held = {
    ArrowLeft: 'left',  KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up',      KeyW: 'up',
    ArrowDown: 'down',  KeyS: 'down',
    ShiftLeft: 'run',   ShiftRight: 'run',
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) {
      if (held[e.code]) e.preventDefault();
      return;
    }
    const k = held[e.code];
    if (k) { state[k] = true; e.preventDefault(); return; }
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyZ') {
      state.talkPressed = true;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = held[e.code];
    if (k) { state[k] = false; e.preventDefault(); }
  });
  window.addEventListener('blur', () => {
    state.left = state.right = state.up = state.down = false;
    state.run = false;
  });
  return state;
}
