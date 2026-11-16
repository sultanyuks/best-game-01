// The screenshot scenes behind ?shot=start|play|end. Each plays the real simulation forward from
// a fresh world, steered by a simple autopilot (flee the nearest motes, lay a mine when a cluster
// is in reach, then run), so every frame is a frame the game itself can produce, and the same
// seed always stages the same scene.

import { FIELD, MINE, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** A control that keeps the weaver alive: flee crowds, mine clusters, drift back to the middle. */
export function autopilotControl(state) {
  const player = state.player;
  let fleeX = 0;
  let fleeY = 0;
  let near = 0;
  let inBlast = 0;
  for (const mote of state.motes) {
    const dx = player.x - mote.x;
    const dy = player.y - mote.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < 190) {
      const weight = (190 - distance) / 190;
      fleeX += (dx / distance) * weight;
      fleeY += (dy / distance) * weight;
      near += 1;
    }
    if (distance < MINE.blastRadius * 0.95) inBlast += 1;
  }
  const mined = state.mines.length > 0;
  const dropMine = !mined && inBlast >= 2 && state.charges > 0;
  let target;
  if (near > 0 || mined) {
    // Flee, but lean back toward the middle: a weaver that only runs ends up cornered.
    target = {
      x: (player.x + fleeX * 260) * 0.72 + FIELD.width * 0.5 * 0.28,
      y: (player.y + fleeY * 260) * 0.72 + FIELD.height * 0.5 * 0.28,
    };
  } else {
    // Drift on a slow patrol around the middle of the field while it is quiet.
    target = {
      x: FIELD.width / 2 + Math.cos(state.time * 0.35) * 260,
      y: FIELD.height / 2 + Math.sin(state.time * 0.5) * 170,
    };
  }
  return { target, dropMine, harmless: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and return the
 * screen to draw over it and the best score to show beside it.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'play') {
    // Play until a pulse is live on screen, the score proves the loop, and the action sits in
    // the middle of the field where a screenshot reads best — or the run ends first.
    for (let index = 0; index < 55 / STEP; index += 1) {
      world.step(STEP, autopilotControl(state));
      if (state.over) break;
      const player = state.player;
      const centred = player.x > 240 && player.x < 1040 && player.y > 180 && player.y < 620;
      if (state.score >= 300 && state.blasts.length > 0 && state.motes.length >= 5 && centred) break;
    }
    return { screen: state.over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
  }
  if (name === 'end') {
    // A real run first — the autopilot weaves and scores — then the player gives up the controls
    // and the motes finish it, so the end screen carries a score worth showing.
    for (let index = 0; index < 40 / STEP && state.score < 600; index += 1) {
      world.step(STEP, autopilotControl(state));
      if (state.over) break;
    }
    const still = { target: null, dir: null, dropMine: false, harmless: false };
    for (let index = 0; index < 240 / STEP && !state.over; index += 1) {
      world.step(STEP, still);
    }
    return { screen: SCREEN_OVER, best: state.score };
  }
  // The title: an ambient field of motes drifting behind the name, nobody in danger.
  for (let index = 0; index < 7 / STEP; index += 1) {
    const control = autopilotControl(state);
    control.harmless = true;
    control.dropMine = false;
    world.step(STEP, control);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
