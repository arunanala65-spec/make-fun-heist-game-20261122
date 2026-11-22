// Procedural WebAudio sounds for The Velvet Vault — no audio files.
// Every sound is a short oscillator/filter envelope built on the fly.

let ctx = null;
let master = null;
let alarmTimer = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);
}

function tone(freq, dur, type, vol, slideTo, delay = 0) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, freq, delay = 0) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
}

export function playPickup() {
  tone(880, 0.12, 'sine', 0.5);
  tone(1318, 0.18, 'sine', 0.4, null, 0.07);
}

export function playCoin() {
  tone(1568, 0.09, 'triangle', 0.4);
  tone(2093, 0.14, 'triangle', 0.3, null, 0.06);
}

export function playDistract() {
  tone(2400, 0.07, 'square', 0.18);
  tone(2400, 0.07, 'square', 0.18, null, 0.18);
}

export function playSmoke() {
  noiseBurst(0.5, 0.35, 900);
}

export function playEmp() {
  tone(1200, 0.5, 'sawtooth', 0.25, 90);
  noiseBurst(0.3, 0.2, 2400, 0.05);
}

export function playSpotted() {
  tone(440, 0.16, 'square', 0.3, 660);
  tone(660, 0.16, 'square', 0.3, 440, 0.16);
}

export function playCaught() {
  tone(220, 0.7, 'sawtooth', 0.4, 55);
  noiseBurst(0.4, 0.3, 500, 0.1);
}

export function playWin() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.4, null, i * 0.13));
}

export function playLevelClear() {
  [392, 523, 659].forEach((f, i) => tone(f, 0.22, 'triangle', 0.35, null, i * 0.11));
}

export function playStep() {
  noiseBurst(0.05, 0.08, 400);
}

export function playClick() {
  tone(1200, 0.05, 'square', 0.15);
}

// A soft two-note alarm pulse while the alarm meter is high.
export function startAlarmPulse() {
  if (!ctx || alarmTimer !== null) return;
  alarmTimer = window.setInterval(() => {
    tone(520, 0.14, 'sine', 0.22, 700);
  }, 700);
}

export function stopAlarmPulse() {
  if (alarmTimer !== null) {
    window.clearInterval(alarmTimer);
    alarmTimer = null;
  }
}
