// Level layouts for The Velvet Vault: three rooms, each one big space with
// several routes (walls, crates for cover, shadow vents), patrols, cameras,
// loot and a getaway exit. Coordinates are canvas pixels; the play area is
// x 24..1256, y 84..692, with the HUD drawn above it.

export const PLAY = { x: 24, y: 84, w: 1232, h: 608 };

function rect(x, y, w, h) {
  return { x, y, w, h };
}

export const LEVELS = [
  {
    name: 'I — The Gallery',
    briefing:
      'The Marlowe Gallery, after midnight. Lift the Sunflower Portrait, ' +
      'then slip out the service door. Guards walk the floor and the cameras sweep — ' +
      'stay out of the cones, or the alarm will climb.',
    start: { x: 90, y: 620 },
    exit: rect(1180, 96, 56, 44),
    walls: [
      rect(320, 200, 24, 240),
      rect(640, 420, 24, 220),
      rect(900, 160, 24, 220),
      rect(480, 140, 300, 24),
      rect(180, 480, 220, 24),
    ],
    crates: [
      rect(420, 300, 64, 64),
      rect(760, 220, 64, 64),
      rect(1020, 460, 64, 64),
      rect(560, 540, 64, 64),
      rect(180, 200, 64, 64),
    ],
    shadows: [
      rect(700, 500, 200, 90),
      rect(180, 300, 130, 90),
      rect(1000, 160, 160, 90),
    ],
    guards: [
      { waypoints: [{ x: 500, y: 320 }, { x: 500, y: 660 }, { x: 880, y: 660 }, { x: 880, y: 320 }], speed: 72 },
      { waypoints: [{ x: 1150, y: 240 }, { x: 1150, y: 600 }, { x: 960, y: 600 }, { x: 960, y: 240 }], speed: 66 },
    ],
    cameras: [
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 1.1, speed: 0.45, range: 240 },
    ],
    loot: [
      { id: 'portrait', kind: 'painting', name: 'Sunflower Portrait', x: 620, y: 230, value: 400, main: true },
      { id: 'gem', kind: 'gem', name: 'Amber Gem', x: 1060, y: 620, value: 150 },
      { id: 'vase', kind: 'vase', name: 'Celadon Vase', x: 130, y: 140, value: 120 },
    ],
  },
  {
    name: 'II — The Vault',
    briefing:
      'The Meridian Bank vault floor. Two cameras, three guards, and the ' +
      'Star Sapphire behind the vault door. Coin tosses buy you a distraction — ' +
      'spend them wisely.',
    start: { x: 90, y: 620 },
    exit: rect(1180, 96, 56, 44),
    walls: [
      rect(280, 140, 24, 300),
      rect(560, 380, 24, 260),
      rect(860, 140, 24, 300),
      rect(400, 560, 320, 24),
      rect(980, 420, 200, 24),
    ],
    crates: [
      rect(380, 220, 64, 64),
      rect(660, 220, 64, 64),
      rect(960, 540, 64, 64),
      rect(180, 420, 64, 64),
      rect(1120, 300, 64, 64),
    ],
    shadows: [
      rect(320, 480, 190, 90),
      rect(880, 220, 180, 90),
      rect(620, 120, 180, 80),
    ],
    guards: [
      { waypoints: [{ x: 340, y: 180 }, { x: 340, y: 660 }, { x: 760, y: 660 }, { x: 760, y: 180 }], speed: 78 },
      { waypoints: [{ x: 940, y: 180 }, { x: 940, y: 620 }], speed: 72 },
      { waypoints: [{ x: 140, y: 120 }, { x: 140, y: 620 }, { x: 340, y: 620 }, { x: 340, y: 120 }], speed: 66 },
    ],
    cameras: [
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 1.2, speed: 0.55, range: 250 },
      { x: 1180, y: 640, baseAngle: -Math.PI / 2, sweep: 1.0, speed: 0.5, range: 240 },
    ],
    loot: [
      { id: 'sapphire', kind: 'gem', name: 'Star Sapphire', x: 700, y: 130, value: 600, main: true },
      { id: 'bars', kind: 'bars', name: 'Gold Bars', x: 120, y: 160, value: 250 },
      { id: 'pearl', kind: 'gem', name: 'Black Pearl', x: 1120, y: 140, value: 200 },
      { id: 'watch', kind: 'watch', name: 'Complication Watch', x: 480, y: 640, value: 180 },
    ],
  },
  {
    name: 'III — The Penthouse',
    briefing:
      'The Aurelia Penthouse, top floor. The Heart of Aurelia diamond waits ' +
      'in the glass case. The patrol is tight and the cameras never blink — ' +
      'use smoke and the EMP, then vanish through the roof door.',
    start: { x: 90, y: 620 },
    exit: rect(1180, 96, 56, 44),
    walls: [
      rect(360, 160, 24, 280),
      rect(700, 420, 24, 240),
      rect(1000, 160, 24, 280),
      rect(500, 140, 260, 24),
      rect(240, 520, 260, 24),
      rect(820, 520, 200, 24),
    ],
    crates: [
      rect(460, 300, 64, 64),
      rect(820, 260, 64, 64),
      rect(1120, 520, 64, 64),
      rect(180, 260, 64, 64),
      rect(620, 620, 64, 48),
    ],
    shadows: [
      rect(180, 400, 170, 90),
      rect(560, 480, 180, 90),
      rect(1060, 260, 150, 90),
    ],
    guards: [
      { waypoints: [{ x: 580, y: 220 }, { x: 580, y: 600 }, { x: 680, y: 600 }, { x: 680, y: 220 }], speed: 84 },
      { waypoints: [{ x: 1060, y: 120 }, { x: 1060, y: 620 }, { x: 800, y: 620 }, { x: 800, y: 120 }], speed: 78 },
      { waypoints: [{ x: 160, y: 120 }, { x: 160, y: 460 }, { x: 420, y: 460 }, { x: 420, y: 120 }], speed: 72 },
    ],
    cameras: [
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 1.3, speed: 0.6, range: 260 },
      { x: 96, y: 640, baseAngle: 0, sweep: 1.1, speed: 0.55, range: 240 },
    ],
    loot: [
      { id: 'diamond', kind: 'diamond', name: 'Heart of Aurelia', x: 700, y: 230, value: 900, main: true },
      { id: 'crown', kind: 'crown', name: 'Aurelia Tiara', x: 120, y: 140, value: 350 },
      { id: 'jade', kind: 'gem', name: 'Jade Idol', x: 1140, y: 620, value: 280 },
      { id: 'scroll', kind: 'scroll', name: 'Illuminated Scroll', x: 400, y: 640, value: 220 },
    ],
  },
];
