// Pulseweave's entry point: it builds the world, the renderer, the input and the sound, runs
// the fixed-step loop, and turns what the world reports (hits, chains, waves) into shake, flash
// and audio. With ?shot=start|play|end in the URL it stages that screenshot scene instead of
// waiting at the title, and keeps it alive behind the frame.

import { STEP } from './config.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createWorld, EVENT_HIT, EVENT_OVER } from './world.js';
import { autopilotControl, stageShot } from './shots.js';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

const audio = createAudio();
const input = createInput(canvas);
const renderer = createRenderer(canvas);
const world = createWorld(shotName ? seed : (Date.now() % 2147483647) + 1);
const state = world.state;

let screen = SCREEN_TITLE;
let paused = false;
let best = readBest();
let beat = 0;
let beatTimer = 0;

function readBest() {
  try {
    return Number(window.localStorage.getItem('pulseweave-best') ?? 0) || 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  best = Math.max(best, state.score);
  try {
    window.localStorage.setItem('pulseweave-best', String(best));
  } catch {
    // A browser that refuses storage still plays; the best score just lasts the session.
  }
}

function announce(message) {
  status.textContent = message;
}

function startRun() {
  world.reset();
  screen = SCREEN_PLAY;
  paused = false;
  audio.unlock();
  audio.start();
  announce(`Pulseweave started. Score ${state.score}, wave ${state.wave}, ${state.lives} lives.`);
}

/** Play the sound cues the world raised during a step, and feel the big ones. */
function playCues(events) {
  for (const [name, depth] of state.cues) {
    if (name === 'place') audio.place();
    else if (name === 'fuse') audio.fuseTick();
    else if (name === 'blast') {
      audio.blast(depth);
      renderer.addShake(0.12 + depth * 0.05);
      if (depth >= 3) renderer.addFlash('#ffd94f', 0.5);
    } else if (name === 'pop') audio.pop(depth);
    else if (name === 'hurt') audio.hurt();
    else if (name === 'wave') audio.wave();
    else if (name === 'over') audio.over();
  }
  if (events & EVENT_HIT) {
    renderer.addShake(0.65);
    renderer.addFlash('#ff3b5c', 0.7);
  }
  if (events & EVENT_OVER) {
    saveBest();
    screen = SCREEN_OVER;
    announce(`Game over. Final score ${state.score}, reached wave ${state.wave}. Press Enter to weave again.`);
  }
}

/** The control a live player is asking for this step: pointer first, keys when they are held. */
function playerControl() {
  let target = null;
  let dir = null;
  if (input.keyX !== 0 || input.keyY !== 0) {
    dir = { x: input.keyX, y: input.keyY };
  } else if (input.pointerSeen) {
    target = renderer.toField(input.pointerX, input.pointerY);
  }
  const control = { target, dir, dropMine: input.dropMine, harmless: false };
  input.dropMine = false;
  return control;
}

if (shotName) {
  const staged = stageShot(shotName, world);
  screen = staged.screen;
  best = Math.max(best, staged.best);
} else {
  // The title screen idles over an ambient field, like the start screenshot scene.
  stageShot('start', world);
  screen = SCREEN_TITLE;
}

window.addEventListener('resize', renderer.resize);
window.addEventListener('pointerdown', () => audio.unlock(), { once: true });
window.addEventListener('keydown', () => audio.unlock(), { once: true });

let last = performance.now();
let accumulator = 0;

function frame(now) {
  requestAnimationFrame(frame);
  let elapsed = (now - last) / 1000;
  last = now;
  if (elapsed > 0.25) elapsed = 0.25;
  accumulator += elapsed;

  if (input.mute) {
    input.mute = false;
    announce(audio.toggleMute() ? 'Sound off.' : 'Sound on.');
  }

  while (accumulator >= STEP) {
    accumulator -= STEP;
    if (shotName) {
      // Screenshot scenes stay alive behind the frame: the title drifts, play keeps weaving.
      if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
        const control = autopilotControl(state);
        if (screen === SCREEN_TITLE) {
          control.harmless = true;
          control.dropMine = false;
        }
        playCues(world.step(STEP, control));
        if (state.over) screen = SCREEN_OVER;
      }
      continue;
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (input.confirm) {
        input.confirm = false;
        startRun();
      } else if (screen === SCREEN_TITLE) {
        const control = autopilotControl(state);
        control.harmless = true;
        control.dropMine = false;
        world.step(STEP, control);
      }
      input.dropMine = false;
      continue;
    }
    if (input.pause) {
      input.pause = false;
      paused = !paused;
      announce(paused ? 'Paused.' : 'Playing.');
    }
    input.confirm = false;
    if (!paused) {
      playCues(world.step(STEP, playerControl()));
      beatTimer += STEP;
      if (beatTimer >= 0.48) {
        beatTimer = 0;
        beat += 1;
        audio.pulse(beat);
      }
    }
  }
  renderer.draw(state, screen, { best, muted: audio.muted, paused, now: now / 1000 });
}

requestAnimationFrame(frame);
