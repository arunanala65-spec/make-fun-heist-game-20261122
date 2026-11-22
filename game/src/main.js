// Bootstrap for The Velvet Vault: wire the canvas, input and game loop.

import { createInput } from './input.js';
import { createGame } from './game.js';
import { ensureAudio } from './audio.js';

const canvas = document.getElementById('game');
const fallback = document.getElementById('fallback');

if (!canvas || !canvas.getContext) {
  if (fallback) fallback.style.display = 'block';
} else {
  const input = createInput(canvas);
  createGame(canvas, input);
  // Audio needs a user gesture; warm it up on the first one.
  window.addEventListener('pointerdown', ensureAudio, { once: true });
  window.addEventListener('keydown', ensureAudio, { once: true });
}
