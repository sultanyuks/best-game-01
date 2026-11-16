// A small seeded random number generator (mulberry32): the same seed always gives the same
// stream, which is what makes the screenshot scenes repeatable and the spawns testable.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random float in [min, max) from the given stream. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** A random integer in [min, max] (both ends included) from the given stream. */
export function whole(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}
