// All drawing for The Velvet Vault: the room, its people and cones, the HUD
// and every screen. One canvas, procedural art only — no image files.

import { PLAY } from './levels.js';
import { guardSuspicionColor, GUARD_RANGE, GUARD_HALF_ANGLE } from './guards.js';
import { CAMERA_HALF_ANGLE } from './cameras.js';
import { pointInRect } from './vision.js';

const W = 1280;
const H = 720;

function drawCone(ctx, x, y, angle, half, range, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFloor(ctx, level) {
  ctx.fillStyle = '#14141f';
  ctx.fillRect(0, 0, W, H);
  // Marble-ish tiles with a soft sheen.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = PLAY.x; x <= PLAY.x + PLAY.w; x += 77) {
    ctx.beginPath();
    ctx.moveTo(x, PLAY.y);
    ctx.lineTo(x, PLAY.y + PLAY.h);
    ctx.stroke();
  }
  for (let y = PLAY.y; y <= PLAY.y + PLAY.h; y += 76) {
    ctx.beginPath();
    ctx.moveTo(PLAY.x, y);
    ctx.lineTo(PLAY.x + PLAY.w, y);
    ctx.stroke();
  }
  // Warm pool of light in the middle of the room.
  const glow = ctx.createRadialGradient(640, 390, 60, 640, 390, 520);
  glow.addColorStop(0, 'rgba(255,196,110,0.07)');
  glow.addColorStop(1, 'rgba(255,196,110,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(PLAY.x, PLAY.y, PLAY.w, PLAY.h);

  // Shadow vents: dark pockets where the thief is harder to spot.
  for (const s of level.shadows) {
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    roundRect(ctx, s.x, s.y, s.w, s.h, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,170,255,0.35)';
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(140,170,255,0.55)';
    ctx.font = '11px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SHADOW', s.x + s.w / 2, s.y + s.h / 2 + 4);
  }
}

function drawWallsAndCrates(ctx, level) {
  ctx.fillStyle = '#2a2a3a';
  ctx.strokeStyle = '#4a4a62';
  ctx.lineWidth = 2;
  for (const w of level.walls) {
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeRect(w.x, w.y, w.w, w.h);
  }
  for (const c of level.crates) {
    ctx.fillStyle = '#3d2f1e';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#6b5326';
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + c.w, c.y + c.h);
    ctx.moveTo(c.x + c.w, c.y);
    ctx.lineTo(c.x, c.y + c.h);
    ctx.stroke();
    ctx.fillStyle = '#3d2f1e';
  }
  // Room border.
  ctx.strokeStyle = '#55556e';
  ctx.lineWidth = 4;
  ctx.strokeRect(PLAY.x - 4, PLAY.y - 4, PLAY.w + 8, PLAY.h + 8);
}

function drawExit(ctx, level, unlocked) {
  const e = level.exit;
  ctx.fillStyle = unlocked ? '#1f7a3a' : '#3a3a4a';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = unlocked ? '#7dffa8' : '#777';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = unlocked ? '#c9ffda' : '#aaa';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(unlocked ? 'EXIT' : 'LOCKED', e.x + e.w / 2, e.y + e.h / 2 + 4);
  if (unlocked) {
    ctx.fillStyle = 'rgba(125,255,168,0.15)';
    ctx.fillRect(e.x - 8, e.y - 8, e.w + 16, e.h + 16);
  }
}

function drawLoot(ctx, loot, time) {
  for (const item of loot) {
    if (item.taken) continue;
    const pulse = 0.5 + 0.5 * Math.sin(time * 3 + item.x);
    const glow = ctx.createRadialGradient(item.x, item.y, 4, item.x, item.y, 46 + pulse * 10);
    glow.addColorStop(0, 'rgba(255,214,10,0.5)');
    glow.addColorStop(1, 'rgba(255,214,10,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(item.x, item.y, 46 + pulse * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd60a';
    ctx.strokeStyle = '#8a6d00';
    ctx.lineWidth = 2;
    if (item.kind === 'painting') {
      ctx.fillRect(item.x - 20, item.y - 14, 40, 28);
      ctx.strokeRect(item.x - 20, item.y - 14, 40, 28);
      ctx.fillStyle = '#ff9f0a';
      ctx.beginPath();
      ctx.arc(item.x, item.y - 2, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 14);
      ctx.lineTo(item.x + 14, item.y);
      ctx.lineTo(item.x, item.y + 14);
      ctx.lineTo(item.x - 14, item.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (item.kind === 'bars') {
      for (let i = -1; i <= 1; i++) {
        ctx.fillRect(item.x + i * 12 - 5, item.y - 6 + Math.abs(i) * 4, 10, 8);
        ctx.strokeRect(item.x + i * 12 - 5, item.y - 6 + Math.abs(i) * 4, 10, 8);
      }
    } else if (item.kind === 'crown') {
      ctx.beginPath();
      ctx.moveTo(item.x - 14, item.y + 8);
      ctx.lineTo(item.x - 14, item.y - 6);
      ctx.lineTo(item.x - 7, item.y + 2);
      ctx.lineTo(item.x, item.y - 10);
      ctx.lineTo(item.x + 7, item.y + 2);
      ctx.lineTo(item.x + 14, item.y - 6);
      ctx.lineTo(item.x + 14, item.y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // gem, vase, watch, scroll, pearl: a glowing orb with a ring.
      ctx.beginPath();
      ctx.arc(item.x, item.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(item.x - 3, item.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (item.main) {
      ctx.fillStyle = '#ffd60a';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('★ THE SCORE ★', item.x, item.y - 26);
    }
  }
}

function drawSmoke(ctx, clouds) {
  for (const s of clouds) {
    const g = ctx.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
    g.addColorStop(0, 'rgba(200,200,210,0.55)');
    g.addColorStop(1, 'rgba(200,200,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCoins(ctx, coins) {
  for (const c of coins) {
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d00';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawCameras(ctx, cameras, time) {
  for (const cam of cameras) {
    const frozen = cam.frozen > 0;
    const color = frozen ? 'rgba(120,200,255,0.16)' : 'rgba(255,59,48,0.13)';
    drawCone(ctx, cam.x, cam.y, cam.angle, CAMERA_HALF_ANGLE, cam.range, color);
    // Mount + lens.
    ctx.fillStyle = '#3a3a4a';
    ctx.strokeStyle = frozen ? '#78c8ff' : '#ff3b30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const lx = cam.x + Math.cos(cam.angle) * 14;
    const ly = cam.y + Math.sin(cam.angle) * 14;
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = frozen ? '#78c8ff' : '#ff3b30';
    ctx.fill();
    if (frozen) {
      ctx.fillStyle = '#78c8ff';
      ctx.font = 'bold 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMP ' + Math.ceil(cam.frozen) + 's', cam.x, cam.y - 16);
    }
  }
}

function drawGuards(ctx, guards, time) {
  for (const g of guards) {
    const susp = g.suspicion;
    const coneColor =
      g.state === 'chase'
        ? 'rgba(255,59,48,0.30)'
        : susp >= 45
          ? 'rgba(255,159,10,0.24)'
          : susp > 5
            ? 'rgba(255,214,10,0.18)'
            : 'rgba(255,214,10,0.10)';
    drawCone(ctx, g.x, g.y, g.angle, GUARD_HALF_ANGLE, GUARD_RANGE, coneColor);
    // Body: dark uniform, red trim when alerted.
    ctx.fillStyle = g.state === 'chase' ? '#5a1a1a' : '#23232e';
    ctx.strokeStyle = guardSuspicionColor(g);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Facing tick.
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + Math.cos(g.angle) * 20, g.y + Math.sin(g.angle) * 20);
    ctx.strokeStyle = '#e5e5ea';
    ctx.stroke();
    // Suspicion arc above the guard.
    if (susp > 2) {
      ctx.beginPath();
      ctx.arc(g.x, g.y, 21, -Math.PI / 2, -Math.PI / 2 + (susp / 100) * Math.PI * 2);
      ctx.strokeStyle = guardSuspicionColor(g);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    if (g.state === 'chase') {
      ctx.fillStyle = '#ff3b30';
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 26);
    } else if (g.state === 'investigate') {
      ctx.fillStyle = '#ff9f0a';
      ctx.font = 'bold 12px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 26);
    }
  }
}

function drawThief(ctx, thief, time) {
  // Soft shadow under the thief.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(thief.x, thief.y + 12, 14, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Hooded figure: dark cloak, pale face, gold trim.
  ctx.fillStyle = '#1c1c26';
  ctx.strokeStyle = '#ffd60a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(thief.x, thief.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f5e6c8';
  ctx.beginPath();
  ctx.arc(thief.x + Math.cos(thief.angle) * 4, thief.y + Math.sin(thief.angle) * 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1c26';
  ctx.beginPath();
  ctx.arc(thief.x + Math.cos(thief.angle) * 6, thief.y + Math.sin(thief.angle) * 6 - 2, 1.6, 0, Math.PI * 2);
  ctx.arc(thief.x + Math.cos(thief.angle) * 6, thief.y + Math.sin(thief.angle) * 6 + 2, 1.6, 0, Math.PI * 2);
  ctx.fill();
  if (thief.sneaking) {
    ctx.fillStyle = 'rgba(140,170,255,0.8)';
    ctx.font = '10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAKING', thief.x, thief.y - 20);
  }
}

function drawHud(ctx, state) {
  const { alarm, coins, lootTaken, lootTotal, level, tools, selectedTool, time } = state;
  // Top bar.
  ctx.fillStyle = 'rgba(8,8,14,0.92)';
  ctx.fillRect(0, 0, W, 64);
  ctx.strokeStyle = '#3a3a4a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 64);
  ctx.lineTo(W, 64);
  ctx.stroke();

  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('THE VELVET VAULT', 24, 28);
  ctx.fillStyle = '#a9a9b8';
  ctx.font = '13px Georgia, serif';
  ctx.fillText(level.name + '  ·  ' + lootTaken + '/' + lootTotal + ' loot', 24, 50);

  // Alarm meter.
  const ax = 480;
  const aw = 320;
  ctx.fillStyle = '#1c1c26';
  roundRect(ctx, ax, 18, aw, 26, 6);
  ctx.fill();
  const alarmColor = alarm >= 75 ? '#ff3b30' : alarm >= 40 ? '#ff9f0a' : '#ffd60a';
  ctx.fillStyle = alarmColor;
  if (alarm > 0.5) {
    roundRect(ctx, ax + 2, 20, (aw - 4) * Math.min(1, alarm / 100), 22, 5);
    ctx.fill();
  }
  ctx.strokeStyle = alarm >= 75 ? '#ff3b30' : '#55556e';
  ctx.lineWidth = 2;
  roundRect(ctx, ax, 18, aw, 26, 6);
  ctx.stroke();
  // Alarm label: pale text stays readable on both the fill and the empty bar.
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM ' + Math.round(alarm) + '%', ax + 6, 36);
  if (alarm >= 75) {
    ctx.fillStyle = '#ff3b30';
    ctx.fillText('!!', ax + aw + 10, 36);
  }

  // Coins.
  ctx.fillStyle = '#ffd60a';
  ctx.beginPath();
  ctx.arc(860, 31, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1c26';
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('¢', 860, 35);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(coins), 876, 36);

  // Tool bar: 1 coin toss, 2 smoke, 3 EMP.
  let tx = 950;
  for (const tool of tools) {
    const selected = tool.key === selectedTool;
    ctx.fillStyle = selected ? '#3a2f10' : '#1c1c26';
    roundRect(ctx, tx, 12, 96, 40, 6);
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffd60a' : '#55556e';
    ctx.lineWidth = selected ? 2 : 1;
    roundRect(ctx, tx, 12, 96, 40, 6);
    ctx.stroke();
    ctx.fillStyle = tool.afford ? '#f5e6c8' : '#777';
    ctx.font = 'bold 12px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('[' + tool.key + '] ' + tool.name, tx + 8, 29);
    ctx.fillStyle = tool.afford ? '#ffd60a' : '#777';
    ctx.font = '11px Georgia, serif';
    ctx.fillText(tool.cost + '¢', tx + 8, 45);
    tx += 104;
  }

  // Bottom hint bar.
  ctx.fillStyle = 'rgba(8,8,14,0.85)';
  ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = '#a9a9b8';
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'WASD / arrows move · Shift sneak · 1/2/3 pick a tool · click to use it · P pause · R restart level',
    W / 2,
    H - 9,
  );
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(5,5,10,0.72)';
  ctx.fillRect(0, 0, W, H);
}

function panel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(12,12,20,0.96)';
  roundRect(ctx, 290, 130, 700, 460, 12);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  roundRect(ctx, 290, 130, 700, 460, 12);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 640, 190);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = '16px Georgia, serif';
  let y = 232;
  for (const line of lines) {
    ctx.fillText(line, 640, y);
    y += 28;
  }
  return y;
}

export function renderTitle(ctx, state) {
  dim(ctx);
  const y = panel(
    ctx,
    'THE VELVET VAULT',
    [
      'A top-down heist in three rooms.',
      'Cross the floor. Dodge the cones. Take the score.',
      'Reach the green EXIT once the main loot is yours.',
      '',
      'WASD / arrows — move      Shift — sneak',
      '1 coin toss · 2 smoke · 3 EMP — click to use',
      'Tools cost coins. Being seen raises the ALARM.',
      'At 100% alarm the job is blown.',
      '',
      'Click or press Enter to begin.',
    ],
    '#ffd60a',
  );
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText('Best played with keyboard and mouse · sound on', 640, y + 30);
}

export function renderBriefing(ctx, state) {
  dim(ctx);
  const level = state.level;
  const y = panel(
    ctx,
    level.name,
    [
      ...wrapText(level.briefing, 62),
      '',
      'Loot in this room: ' + level.loot.map((l) => l.name).join(' · '),
      'Guards: ' + level.guards.length + '   Cameras: ' + level.cameras.length,
      '',
      'Click or press Enter to start the job.',
    ],
    '#ffd60a',
  );
  ctx.fillStyle = '#a9a9b8';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('Tip: shadow vents slow detection. Crates block sight.', 640, y + 30);
}

function wrapText(text, width) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > width) {
      lines.push(line.trim());
      line = word;
    } else {
      line += ' ' + word;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

export function renderPause(ctx, state) {
  dim(ctx);
  panel(
    ctx,
    'PAUSED',
    ['The crew waits in the dark.', '', 'P — resume      R — restart this level', 'Esc — back to the title'],
    '#8e8e93',
  );
}

export function renderCaught(ctx, state) {
  dim(ctx);
  const y = panel(
    ctx,
    'CAUGHT!',
    [
      state.caughtReason,
      '',
      'Loot taken: ' + state.lootTaken + ' of ' + state.lootTotal,
      'Alarm hit ' + Math.round(state.alarm) + '%.',
      '',
      'R — try the room again      Esc — title',
    ],
    '#ff3b30',
  );
  ctx.fillStyle = '#ff6b61';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('The vault keeps its secrets. For now.', 640, y + 30);
}

export function renderLevelComplete(ctx, state) {
  dim(ctx);
  const y = panel(
    ctx,
    'CLEAN GETAWAY',
    [
      state.level.name + ' — cleared.',
      'Loot taken: ' + state.lootTaken + ' of ' + state.lootTotal,
      'Take: $' + state.score.toLocaleString() + '   Coins left: ' + state.coins + '¢',
      '',
      'Click or press Enter for the next room.',
    ],
    '#7dffa8',
  );
  ctx.fillStyle = '#7dffa8';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('One room down. The next one is tighter.', 640, y + 30);
}

export function renderWin(ctx, state) {
  dim(ctx);
  const y = panel(
    ctx,
    'THE VAULT IS YOURS',
    [
      'Three rooms. Three scores. No alarm ever stood a chance.',
      '',
      'Total take: $' + state.score.toLocaleString(),
      'Loot: ' + state.lootTakenTotal + ' of ' + state.lootTotalAll + ' pieces',
      '',
      'Click or press Enter to run it again.',
    ],
    '#ffd60a',
  );
  ctx.fillStyle = '#ffd60a';
  ctx.font = '15px Georgia, serif';
  ctx.fillText('The Velvet Vault — a clean job, start to finish.', 640, y + 30);
}

// The live game frame: room, cones, people, loot, HUD.
export function renderGame(ctx, state, time) {
  const level = state.level;
  drawFloor(ctx, level);
  drawWallsAndCrates(ctx, level);
  drawExit(ctx, level, state.exitUnlocked);
  drawLoot(ctx, state.loot, time);
  drawCoins(ctx, state.coinsOnFloor);
  drawSmoke(ctx, state.smokeClouds);
  drawCameras(ctx, state.cameras, time);
  drawGuards(ctx, state.guards, time);
  drawThief(ctx, state.thief, time);
  // Thrown coin in flight.
  if (state.thrownCoin) {
    const c = state.thrownCoin;
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6d00';
    ctx.stroke();
  }
  drawHud(ctx, state);
  // "SPOTTED" flash at the top when a guard is chasing.
  if (state.guards.some((g) => g.state === 'chase')) {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 18px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('— SPOTTED — RUN! —', 640, 96);
  }
}

export { pointInRect };
