// Keyboard and mouse input for The Velvet Vault.

export function createInput(canvas) {
  const keys = new Set();
  // Keys pressed since the last consume: a quick tap lands between frames,
  // so keyup must not erase it before the game reads it.
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: null, down: false };

  function canvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height),
    };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    keys.add(e.key.toLowerCase());
    pressed.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const p = canvasPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = canvasPos(e);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = { x: p.x, y: p.y };
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });

  return {
    keys,
    mouse,
    // Movement vector from WASD / arrows, normalised.
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    sneaking() {
      return keys.has('shift');
    },
    // One-shot helpers: consume a pressed key.
    consume(key) {
      key = key.toLowerCase();
      if (pressed.has(key)) {
        pressed.delete(key);
        return true;
      }
      return false;
    },
    consumeClick() {
      const c = mouse.clicked;
      mouse.clicked = null;
      return c;
    },
  };
}
