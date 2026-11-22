// Security cameras: wall-mounted, sweeping cones. An EMP freezes them;
// smoke blocks their view of the thief.

import { inVisionCone } from './vision.js';

export const CAMERA_HALF_ANGLE = 0.5;

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    speed: def.speed,
    range: def.range,
    angle: def.baseAngle,
    frozen: 0, // seconds left frozen by an EMP
    phase: Math.random() * Math.PI * 2,
  };
}

export function updateCamera(cam, dt) {
  if (cam.frozen > 0) {
    cam.frozen -= dt;
    return;
  }
  cam.phase += dt * cam.speed;
  cam.angle = cam.baseAngle + Math.sin(cam.phase) * cam.sweep;
}

export function cameraSeesThief(cam, thief, solids, smokeClouds) {
  if (cam.frozen > 0) return false;
  const inSmoke = smokeClouds.some(
    (s) => Math.hypot(thief.x - s.x, thief.y - s.y) < s.r,
  );
  if (inSmoke) return false;
  return inVisionCone(
    cam.x, cam.y, cam.angle, CAMERA_HALF_ANGLE, cam.range,
    thief.x, thief.y, solids,
  );
}
