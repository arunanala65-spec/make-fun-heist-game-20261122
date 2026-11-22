// Game state, loop, tools and the alarm for The Velvet Vault.

import { LEVELS, PLAY } from './levels.js';
import { createGuard, updateGuard, guardCaughtThief } from './guards.js';
import { createCamera, updateCamera, cameraSeesThief } from './cameras.js';
import { circleHitsRect, pointInRect } from './vision.js';
import {
  renderGame, renderTitle, renderBriefing, renderPause,
  renderCaught, renderLevelComplete, renderWin,
} from './render.js';
import * as audio from './audio.js';

export const TOOLS = [
  { key: '1', name: 'Coin toss', cost: 25 },
  { key: '2', name: 'Smoke', cost: 50 },
  { key: '3', name: 'EMP', cost: 75 },
];

const THIEF_RADIUS = 13;
const WALK_SPEED = 175;
const SNEAK_SPEED = 95;

export function createGame(canvas, input) {
  const ctx = canvas.getContext('2d');
  const game = {
    screen: 'title', // title | briefing | playing | paused | caught | levelComplete | win
    levelIndex: 0,
    level: LEVELS[0],
    thief: null,
    guards: [],
    cameras: [],
    loot: [],
    coinsOnFloor: [],
    smokeClouds: [],
    thrownCoin: null,
    alarm: 0,
    coins: 100,
    score: 0,
    lootTaken: 0,
    lootTakenTotal: 0,
    lootTotalAll: LEVELS.reduce((n, l) => n + l.loot.length, 0),
    selectedTool: '1',
    exitUnlocked: false,
    caughtReason: '',
    time: 0,
    lastTime: 0,
    spottedFlash: 0,
    frozen: false, // set by ?shot= staging so a screenshot frame stays put
  };

  function loadLevel(index) {
    const def = LEVELS[index];
    game.levelIndex = index;
    game.level = def;
    game.thief = {
      x: def.start.x, y: def.start.y, angle: -Math.PI / 2,
      sneaking: false, stepTimer: 0,
    };
    game.guards = def.guards.map((g, i) => createGuard(g, i));
    game.cameras = def.cameras.map(createCamera);
    game.loot = def.loot.map((l) => ({ ...l, taken: false }));
    game.coinsOnFloor = [];
    game.smokeClouds = [];
    game.thrownCoin = null;
    game.alarm = 0;
    game.coins = 100;
    game.lootTaken = 0;
    game.exitUnlocked = false;
    game.caughtReason = '';
  }

  function solids() {
    return [...game.level.walls, ...game.level.crates];
  }

  function thiefInShadow() {
    return game.level.shadows.some((s) => pointInRect(game.thief.x, game.thief.y, s));
  }

  function moveThief(dt) {
    const v = input.moveVector();
    const sneaking = input.sneaking();
    game.thief.sneaking = sneaking;
    const speed = sneaking ? SNEAK_SPEED : WALK_SPEED;
    if (v.x !== 0 || v.y !== 0) {
      game.thief.angle = Math.atan2(v.y, v.x);
      const nx = game.thief.x + v.x * speed * dt;
      const ny = game.thief.y + v.y * speed * dt;
      const solidsList = solids();
      const blocked = (x, y) =>
        x < PLAY.x + THIEF_RADIUS || x > PLAY.x + PLAY.w - THIEF_RADIUS ||
        y < PLAY.y + THIEF_RADIUS || y > PLAY.y + PLAY.h - THIEF_RADIUS ||
        solidsList.some((s) => circleHitsRect(x, y, THIEF_RADIUS, s));
      if (!blocked(nx, game.thief.y)) game.thief.x = nx;
      if (!blocked(game.thief.x, ny)) game.thief.y = ny;
      game.thief.stepTimer -= dt;
      if (game.thief.stepTimer <= 0) {
        game.thief.stepTimer = sneaking ? 0.55 : 0.32;
        audio.playStep();
      }
    }
  }

  function useToolAt(x, y) {
    const tool = TOOLS.find((t) => t.key === game.selectedTool);
    if (!tool || game.coins < tool.cost) {
      audio.playClick();
      return;
    }
    game.coins -= tool.cost;
    if (tool.key === '1') {
      game.thrownCoin = { x: game.thief.x, y: game.thief.y, tx: x, ty: y, t: 0 };
      audio.playDistract();
    } else if (tool.key === '2') {
      game.smokeClouds.push({ x, y, r: 90, timer: 6 });
      audio.playSmoke();
    } else if (tool.key === '3') {
      for (const cam of game.cameras) cam.frozen = 8;
      audio.playEmp();
    }
  }

  function updateThrownCoin(dt) {
    const c = game.thrownCoin;
    if (!c) return;
    c.t += dt * 2.2;
    const k = Math.min(1, c.t);
    c.x = c.x + (c.tx - c.x) * Math.min(1, dt * 8);
    c.y = c.y + (c.ty - c.y) * Math.min(1, dt * 8);
    if (k >= 1) {
      // The clink pulls every guard in earshot to the landing spot.
      for (const g of game.guards) {
        if (Math.hypot(g.x - c.x, g.y - c.y) < 320) {
          g.distracted = { x: c.x, y: c.y, timer: 5 };
          g.state = 'patrol';
          g.suspicion = Math.max(0, g.suspicion - 40);
        }
      }
      game.thrownCoin = null;
    }
  }

  function updatePlaying(dt) {
    moveThief(dt);
    updateThrownCoin(dt);

    for (const s of game.smokeClouds) s.timer -= dt;
    game.smokeClouds = game.smokeClouds.filter((s) => s.timer > 0);

    const shadow = thiefInShadow();
    const solidList = solids();
    let anySees = false;
    let anyChase = false;
    for (const g of game.guards) {
      const res = updateGuard(g, dt, game.thief, solidList, shadow, game.smokeClouds);
      if (res.seesThief) anySees = true;
      if (g.state === 'chase') anyChase = true;
      for (const e of res.events) {
        if (e === 'spotted') audio.playSpotted();
      }
      if (guardCaughtThief(g, game.thief)) {
        return caught('A guard grabbed you in the open.');
      }
    }

    let cameraSees = false;
    for (const cam of game.cameras) {
      updateCamera(cam, dt);
      if (cameraSeesThief(cam, game.thief, solidList, game.smokeClouds)) cameraSees = true;
    }

    // The alarm climbs while anyone has eyes on the thief.
    if (anySees || cameraSees) {
      game.alarm = Math.min(100, game.alarm + (anyChase ? 26 : 14) * dt);
    } else {
      game.alarm = Math.max(0, game.alarm - 2.2 * dt);
    }
    if (game.alarm >= 75) audio.startAlarmPulse();
    else audio.stopAlarmPulse();

    if (game.alarm >= 100) {
      return caught('The alarm hit 100% — the whole building locked down.');
    }

    // Loot pickup.
    for (const item of game.loot) {
      if (item.taken) continue;
      if (Math.hypot(game.thief.x - item.x, game.thief.y - item.y) < 30) {
        item.taken = true;
        game.lootTaken++;
        game.lootTakenTotal++;
        game.score += item.value;
        game.coins += Math.round(item.value / 4);
        audio.playPickup();
        if (item.main) game.exitUnlocked = true;
      }
    }

    // Coins on the floor (left by a tossed coin's change — none spawn yet).
    for (const c of game.coinsOnFloor) {
      if (!c.taken && Math.hypot(game.thief.x - c.x, game.thief.y - c.y) < 24) {
        c.taken = true;
        game.coins += 10;
        audio.playCoin();
      }
    }
    game.coinsOnFloor = game.coinsOnFloor.filter((c) => !c.taken);

    // The getaway.
    if (game.exitUnlocked && pointInRect(game.thief.x, game.thief.y, game.level.exit)) {
      audio.stopAlarmPulse();
      if (game.levelIndex + 1 >= LEVELS.length) {
        game.screen = 'win';
        audio.playWin();
      } else {
        game.screen = 'levelComplete';
        audio.playLevelClear();
      }
      return;
    }
  }

  function caught(reason) {
    game.caughtReason = reason;
    game.screen = 'caught';
    audio.stopAlarmPulse();
    audio.playCaught();
  }

  function handleKeys() {
    if (input.consume('p')) {
      if (game.screen === 'playing') game.screen = 'paused';
      else if (game.screen === 'paused') game.screen = 'playing';
    }
    if (input.consume('r')) {
      if (game.screen === 'playing' || game.screen === 'paused' || game.screen === 'caught') {
        loadLevel(game.levelIndex);
        game.screen = 'playing';
      }
    }
    if (input.consume('escape')) {
      if (game.screen === 'paused' || game.screen === 'caught') {
        game.screen = 'title';
      }
    }
    for (const tool of TOOLS) {
      if (input.consume(tool.key)) game.selectedTool = tool.key;
    }
    if (input.consume('enter') || input.consume(' ')) {
      advance();
    }
  }

  function advance() {
    audio.ensureAudio();
    if (game.screen === 'title') {
      game.screen = 'briefing';
    } else if (game.screen === 'briefing') {
      loadLevel(game.levelIndex);
      game.screen = 'playing';
    } else if (game.screen === 'levelComplete') {
      game.levelIndex++;
      game.screen = 'briefing';
    } else if (game.screen === 'win') {
      game.score = 0;
      game.lootTakenTotal = 0;
      game.levelIndex = 0;
      game.screen = 'briefing';
    }
  }

  function handleClick() {
    const click = input.consumeClick();
    if (!click) return;
    audio.ensureAudio();
    if (game.screen === 'title' || game.screen === 'briefing' ||
        game.screen === 'levelComplete' || game.screen === 'win') {
      advance();
      return;
    }
    if (game.screen === 'playing') {
      useToolAt(click.x, click.y);
    }
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - game.lastTime) / 1000 || 0.016);
    game.lastTime = now;
    game.time += dt;
    handleKeys();
    handleClick();
    if (game.screen === 'playing' && !game.frozen) updatePlaying(dt);

    const hudState = {
      alarm: game.alarm,
      coins: game.coins,
      score: game.score,
      lootTaken: game.lootTaken,
      lootTotal: game.level.loot.length,
      lootTakenTotal: game.lootTakenTotal,
      lootTotalAll: game.lootTotalAll,
      caughtReason: game.caughtReason,
      level: game.level,
      tools: TOOLS.map((t) => ({ ...t, afford: game.coins >= t.cost })),
      selectedTool: game.selectedTool,
      time: game.time,
    };
    const view = {
      ...hudState,
      guards: game.guards,
      cameras: game.cameras,
      loot: game.loot,
      coinsOnFloor: game.coinsOnFloor,
      smokeClouds: game.smokeClouds,
      thief: game.thief || { x: 0, y: 0, angle: 0, sneaking: false },
      thrownCoin: game.thrownCoin,
      exitUnlocked: game.exitUnlocked,
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (game.screen === 'playing' || game.screen === 'paused' || game.screen === 'caught') {
      renderGame(ctx, view, game.time);
    } else {
      // A quiet room behind the menus.
      renderGame(ctx, view, game.time);
    }
    if (game.screen === 'title') renderTitle(ctx, view);
    else if (game.screen === 'briefing') renderBriefing(ctx, view);
    else if (game.screen === 'paused') renderPause(ctx, view);
    else if (game.screen === 'caught') renderCaught(ctx, view);
    else if (game.screen === 'levelComplete') renderLevelComplete(ctx, view);
    else if (game.screen === 'win') renderWin(ctx, view);

    requestAnimationFrame(frame);
  }

  loadLevel(0);

  // ---- Test & screenshot staging API (used by the maker's own playtests) ----
  // URL params: ?level=1..3 starts a level at once; ?shot=cover|tense|tools|win
  // stages a frame for a screenshot. These are part of the shipped game.
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const levelParam = parseInt(params.get('level') || '', 10);
  if (shot || (levelParam >= 1 && levelParam <= 3)) {
    const idx = shot === 'win' ? 2 : (levelParam >= 1 ? levelParam - 1 : 0);
    loadLevel(idx);
    game.screen = 'playing';
    if (shot) {
      // Freeze the simulation so the staged frame cannot play itself
      // into a caught screen before the screenshot lands.
      game.frozen = true;
    }
    if (shot === 'cover') {
      game.thief.x = 560;
      game.thief.y = 480;
      game.thief.angle = Math.PI / 4;
      game.guards[0].x = 500;
      game.guards[0].y = 380;
      game.guards[0].angle = Math.PI / 2;
      game.guards[0].suspicion = 25;
      game.guards[1].x = 1000;
      game.guards[1].y = 300;
      game.guards[1].angle = Math.PI;
      game.guards[1].suspicion = 10;
      game.alarm = 32;
      game.coins = 150;
    } else if (shot === 'tense') {
      game.thief.x = 660;
      game.thief.y = 330;
      game.thief.angle = -Math.PI / 2;
      game.guards[0].x = 640;
      game.guards[0].y = 260;
      game.guards[0].angle = Math.PI / 2;
      game.guards[0].suspicion = 100;
      game.guards[0].state = 'chase';
      game.guards[0].lastSeen = { x: 660, y: 330 };
      game.alarm = 68;
      game.coins = 75;
    } else if (shot === 'tools') {
      game.thief.x = 480;
      game.thief.y = 500;
      game.thief.angle = 0;
      game.smokeClouds.push({ x: 560, y: 420, r: 90, timer: 5 });
      game.loot[0].taken = true;
      game.lootTaken = 1;
      game.lootTakenTotal = 1;
      game.score = game.loot[0].value;
      game.exitUnlocked = true;
      game.alarm = 45;
      game.coins = 120;
      game.selectedTool = '2';
    } else if (shot === 'win') {
      for (const item of game.loot) item.taken = true;
      game.lootTaken = game.loot.length;
      game.score = 2450;
      game.lootTakenTotal = 9;
      game.screen = 'win';
    }
  }

  // Debug handle for scripted playtests: window.__heist
  window.__heist = {
    game,
    startLevel(i) {
      loadLevel(i);
      game.screen = 'playing';
    },
    state() {
      return {
        screen: game.screen,
        levelIndex: game.levelIndex,
        alarm: game.alarm,
        coins: game.coins,
        score: game.score,
        lootTaken: game.lootTaken,
        exitUnlocked: game.exitUnlocked,
        thief: { x: game.thief.x, y: game.thief.y },
        guards: game.guards.map((g) => ({ x: g.x, y: g.y, state: g.state, suspicion: g.suspicion })),
      };
    },
  };

  requestAnimationFrame(frame);
  return game;
}
