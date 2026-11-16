// Keyboard and mouse state for the game: main.js reads the plain object this builds each frame
// and turns it into a control for the world, so the simulation itself never touches the DOM.

export function createInput(canvas) {
  const input = {
    /** Pointer position in field units; main.js rescales it from client coordinates. */
    pointerX: 0,
    pointerY: 0,
    pointerSeen: false,
    /** Held movement keys, as a direction the player is asking for. */
    keyX: 0,
    keyY: 0,
    /** One-shot requests, set on the press and cleared by main.js once it has used them. */
    dropMine: false,
    confirm: false,
    pause: false,
    mute: false,
  };
  const held = new Set();

  function direction() {
    input.keyX = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    input.keyY = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
  }

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
  };

  window.addEventListener('keydown', (event) => {
    const mapped = KEYMAP[event.code];
    if (mapped) {
      held.add(mapped);
      direction();
      event.preventDefault();
    } else if (event.code === 'Space') {
      input.dropMine = true;
      event.preventDefault();
    } else if (event.code === 'Enter') {
      input.confirm = true;
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      input.pause = true;
    } else if (event.code === 'KeyM') {
      input.mute = true;
    }
  });
  window.addEventListener('keyup', (event) => {
    const mapped = KEYMAP[event.code];
    if (mapped) {
      held.delete(mapped);
      direction();
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    input.pointerX = event.clientX;
    input.pointerY = event.clientY;
    input.pointerSeen = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    input.pointerX = event.clientX;
    input.pointerY = event.clientY;
    input.pointerSeen = true;
    input.dropMine = true;
    input.confirm = true;
  });
  return input;
}
