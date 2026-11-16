// The things that live in the field: plain objects made by the factories here and moved by
// world.js. Nothing here knows about the DOM or the canvas; render.js draws what it finds.

export const KIND_CHASER = 'chaser';
export const KIND_DART = 'dart';
export const KIND_SPLITTER = 'splitter';
export const KIND_BULWARK = 'bulwark';

/** Per-kind shape and temperament: radius, base speed, score weight and how it steers. */
export const MOTE_KINDS = {
  [KIND_CHASER]: { radius: 15, speed: 74, sides: 3, turn: 2.6 },
  [KIND_DART]: { radius: 9, speed: 148, sides: 4, turn: 0 },
  [KIND_SPLITTER]: { radius: 19, speed: 46, sides: 6, turn: 1.4 },
  [KIND_BULWARK]: { radius: 27, speed: 34, sides: 5, turn: 1.1 },
};

export function makePlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0,
    radius: 14,
    /** Seconds of post-hit invulnerability left. */
    invulnerable: 0,
    /** Total seconds alive this run, for the weave ring's spin. */
    age: 0,
  };
}

export function makeMote(kind, x, y, angle, speedScale, random) {
  const spec = MOTE_KINDS[kind];
  return {
    kind,
    x, y,
    vx: Math.cos(angle) * spec.speed * speedScale,
    vy: Math.sin(angle) * spec.speed * speedScale,
    radius: spec.radius,
    spin: range2(random, -1.4, 1.4),
    rotation: random() * Math.PI * 2,
    /** Bulwarks take two pulses; everything else takes one. */
    hull: kind === KIND_BULWARK ? 2 : 1,
    /** Set when a pulse has caught this mote: seconds until it bursts, and the chain depth. */
    doom: 0,
    doomDepth: 0,
    wobble: random() * Math.PI * 2,
  };
}

export function makeMine(x, y, fuseSeconds) {
  return { x, y, fuse: fuseSeconds, beeped: false };
}

/** A live pulse: grows from its heart to full radius, then fades; world.js tests motes against it. */
export function makeBlast(x, y, maxRadius, depth) {
  return { x, y, radius: 8, maxRadius, depth, age: 0 };
}

/** One spark of a burst: a short-lived glowing point with drag. */
export function makeParticle(x, y, angle, speed, life, colour, size) {
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life, maxLife: life, colour, size,
  };
}

/** A shockwave ring that only decorates: it expands and thins, it never harms. */
export function makeRing(x, y, maxRadius, colour) {
  return { x, y, radius: 10, maxRadius, colour, age: 0, life: 0.45 };
}

/** A floating score note ("+150 ×3") that rises and fades where a mote burst. */
export function makeText(x, y, label, colour) {
  return { x, y, label, colour, age: 0, life: 0.9 };
}

function range2(random, min, max) {
  return min + random() * (max - min);
}
