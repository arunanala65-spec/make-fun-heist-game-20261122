// Guards: patrol waypoints, vision cones, suspicion that builds yellow to
// amber to red, investigate the last-seen position, then chase the thief.

import { hasLineOfSight, inVisionCone, angleDifference } from './vision.js';

export const GUARD_RANGE = 200;
export const GUARD_HALF_ANGLE = 0.61; // ~35 degrees each side
export const GUARD_RADIUS = 15;

export function createGuard(def, id) {
  return {
    id,
    x: def.waypoints[0].x,
    y: def.waypoints[0].y,
    waypoints: def.waypoints,
    wpIndex: 1,
    speed: def.speed,
    angle: 0,
    suspicion: 0, // 0..100
    state: 'patrol', // patrol | investigate | chase
    lastSeen: null,
    loseTimer: 0,
    investigateTimer: 0,
    pauseTimer: 0,
    distracted: null, // {x, y, timer}
    alerted: false,
  };
}

function moveToward(g, tx, ty, speed, dt, solids) {
  const dx = tx - g.x;
  const dy = ty - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  const nx = g.x + (dx / dist) * step;
  const ny = g.y + (dy / dist) * step;
  g.angle = Math.atan2(dy, dx);
  // Slide along walls: try x then y.
  if (!hitsSolid(nx, g.y, solids)) g.x = nx;
  if (!hitsSolid(g.x, ny, solids)) g.y = ny;
  return dist <= step + 1;
}

function hitsSolid(x, y, solids) {
  for (const s of solids) {
    const nx = Math.max(s.x, Math.min(x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < GUARD_RADIUS * GUARD_RADIUS) return true;
  }
  return false;
}

// Update one guard. Returns 'spotted' when the guard has a clear view of the
// thief this frame (caller raises the alarm), and reports state changes.
export function updateGuard(g, dt, thief, solids, inShadow, smokeClouds) {
  const events = [];
  const blockedBySmoke = smokeClouds.some(
    (s) => Math.hypot(thief.x - s.x, thief.y - s.y) < s.r,
  );
  const canSee =
    !blockedBySmoke &&
    inVisionCone(g.x, g.y, g.angle, GUARD_HALF_ANGLE, GUARD_RANGE, thief.x, thief.y, solids);

  if (canSee) {
    const dist = Math.hypot(thief.x - g.x, thief.y - g.y);
    let rate = 55;
    if (dist < 90) rate = 110; // very close: spotted almost at once
    if (thief.sneaking) rate *= 0.55;
    if (inShadow) rate *= 0.4;
    g.suspicion = Math.min(100, g.suspicion + rate * dt);
    g.lastSeen = { x: thief.x, y: thief.y };
    g.loseTimer = 0;
    if (g.suspicion >= 100 && g.state !== 'chase') {
      g.state = 'chase';
      events.push('spotted');
    } else if (g.suspicion >= 45 && g.state === 'patrol') {
      g.state = 'investigate';
      g.investigateTimer = 0;
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - 22 * dt);
    if (g.state === 'chase') {
      g.loseTimer += dt;
      if (g.loseTimer > 2.5) {
        g.state = 'investigate';
        g.investigateTimer = 0;
      }
    }
  }

  // Distraction: a tossed coin pulls the guard off its patrol.
  if (g.distracted) {
    g.distracted.timer -= dt;
    const arrived = moveToward(g, g.distracted.x, g.distracted.y, g.speed * 1.35, dt, solids);
    if (g.distracted.timer <= 0 || arrived) {
      g.distracted = null;
      g.pauseTimer = 1.2;
    }
    return { events, seesThief: canSee };
  }

  if (g.state === 'patrol') {
    if (g.pauseTimer > 0) {
      g.pauseTimer -= dt;
    } else {
      const target = g.waypoints[g.wpIndex % g.waypoints.length];
      if (moveToward(g, target.x, target.y, g.speed, dt, solids)) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
        g.pauseTimer = 0.7;
      }
    }
  } else if (g.state === 'investigate') {
    g.investigateTimer += dt;
    if (g.lastSeen) {
      const arrived = moveToward(g, g.lastSeen.x, g.lastSeen.y, g.speed * 1.25, dt, solids);
      if (arrived) {
        // Look around, then give up and go back to patrol.
        g.angle += dt * 1.6;
        if (g.investigateTimer > 4) {
          g.state = 'patrol';
          g.suspicion = Math.max(0, g.suspicion - 30);
        }
      }
    } else {
      g.state = 'patrol';
    }
  } else if (g.state === 'chase') {
    moveToward(g, thief.x, thief.y, 205, dt, solids);
    if (!canSee && !hasLineOfSight(g.x, g.y, thief.x, thief.y, solids)) {
      // Chase to the last seen spot even without sight.
      if (g.lastSeen) moveToward(g, g.lastSeen.x, g.lastSeen.y, 205, dt, solids);
    }
  }

  return { events, seesThief: canSee };
}

export function guardSuspicionColor(g) {
  if (g.suspicion >= 80) return '#ff3b30';
  if (g.suspicion >= 45) return '#ff9f0a';
  if (g.suspicion > 5) return '#ffd60a';
  return '#8e8e93';
}

export function guardCaughtThief(g, thief) {
  return Math.hypot(g.x - thief.x, g.y - thief.y) < GUARD_RADIUS + 13;
}

export { angleDifference };
