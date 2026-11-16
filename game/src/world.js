// The Pulseweave simulation: spawning, steering, pulses and chains, hits and score. It advances
// in fixed steps, takes a plain control object, and reports what happened as event flags and a
// list of sound cues, so main.js can play the sounds and render.js can shake and flash.

import { FIELD, MINE, PLAYER, WAVE } from './config.js';
import {
  KIND_BULWARK, KIND_CHASER, KIND_DART, KIND_SPLITTER, MOTE_KINDS,
  makeBlast, makeMine, makeMote, makeParticle, makePlayer, makeRing, makeText,
} from './entities.js';
import { createRandom, range } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE = 4;

const TAU = Math.PI * 2;

export function createWorld(seed) {
  const random = createRandom(seed);
  const state = {
    player: makePlayer(FIELD.width / 2, FIELD.height / 2),
    motes: [],
    mines: [],
    blasts: [],
    particles: [],
    rings: [],
    texts: [],
    /** Sound cues raised by the last step, as [name, depth] pairs for main.js to play. */
    cues: [],
    score: 0,
    lives: PLAYER.startLives,
    wave: 1,
    waveTime: 0,
    spawnTimer: 1,
    charges: MINE.maxCharges,
    rechargeTimer: 0,
    time: 0,
    /** The deepest chain of the last pulse, and how long its banner still shows. */
    lastChain: 0,
    chainBanner: 0,
    over: false,
  };

  function reset() {
    state.player = makePlayer(FIELD.width / 2, FIELD.height / 2);
    state.motes.length = 0;
    state.mines.length = 0;
    state.blasts.length = 0;
    state.particles.length = 0;
    state.rings.length = 0;
    state.texts.length = 0;
    state.cues.length = 0;
    state.score = 0;
    state.lives = PLAYER.startLives;
    state.wave = 1;
    state.waveTime = 0;
    state.spawnTimer = 1;
    state.charges = MINE.maxCharges;
    state.rechargeTimer = 0;
    state.time = 0;
    state.lastChain = 0;
    state.chainBanner = 0;
    state.over = false;
  }

  function spawnGap() {
    return Math.max(WAVE.minSpawnSeconds, WAVE.firstSpawnSeconds * Math.pow(WAVE.spawnShrink, state.wave - 1));
  }

  function pickKind() {
    const roll = random();
    if (state.wave >= 3 && roll < 0.12) return KIND_BULWARK;
    if (state.wave >= 2 && roll < 0.3) return KIND_SPLITTER;
    if (roll < 0.58) return KIND_DART;
    return KIND_CHASER;
  }

  /** A mote drifts in from a random point on the field's edge, aimed loosely at the weaver. */
  function spawnMote() {
    const side = Math.floor(random() * 4);
    let x = 0;
    let y = 0;
    if (side === 0) { x = range(random, 0, FIELD.width); y = -30; }
    else if (side === 1) { x = FIELD.width + 30; y = range(random, 0, FIELD.height); }
    else if (side === 2) { x = range(random, 0, FIELD.width); y = FIELD.height + 30; }
    else { x = -30; y = range(random, 0, FIELD.height); }
    const kind = pickKind();
    const aim = Math.atan2(state.player.y - y, state.player.x - x) + range(random, -0.5, 0.5);
    const speedScale = (1 + WAVE.speedGrowth * (state.wave - 1)) * range(random, 0.85, 1.15);
    state.motes.push(makeMote(kind, x, y, aim, speedScale, random));
  }

  function burstParticles(x, y, colour, count, speed) {
    for (let index = 0; index < count; index += 1) {
      const angle = random() * TAU;
      state.particles.push(makeParticle(x, y, angle, range(random, speed * 0.3, speed), range(random, 0.3, 0.8), colour, range(random, 1.5, 3.4)));
    }
  }

  /** A mote caught by a pulse: it bursts, pays out, and fires a pulse of its own a beat later. */
  function burstMote(mote, depth) {
    const gained = MINE.baseScore * depth;
    state.score += gained;
    if (depth > state.lastChain) {
      state.lastChain = depth;
      state.chainBanner = 1.4;
    }
    burstParticles(mote.x, mote.y, moteColour(mote.kind), 14, 260);
    state.rings.push(makeRing(mote.x, mote.y, MINE.blastRadius * 0.55, moteColour(mote.kind)));
    state.texts.push(makeText(mote.x, mote.y - mote.radius, depth > 1 ? `+${gained} ×${depth}` : `+${gained}`, moteColour(mote.kind)));
    state.cues.push(['pop', depth]);
    if (mote.kind === KIND_SPLITTER) {
      for (let index = 0; index < 2; index += 1) {
        const angle = random() * TAU;
        const child = makeMote(KIND_DART, mote.x, mote.y, angle, 1 + WAVE.speedGrowth * (state.wave - 1), random);
        child.x += Math.cos(angle) * 12;
        child.y += Math.sin(angle) * 12;
        state.motes.push(child);
      }
    }
    // The chain itself: this mote's own pulse, one chain-step deeper than the one that caught it.
    state.blasts.push(makeBlast(mote.x, mote.y, MINE.blastRadius, depth + 1));
  }

  function moteColour(kind) {
    return { chaser: '#ff5470', dart: '#ffb347', splitter: '#b388ff', bulwark: '#ff7847' }[kind];
  }

  /** Fire a mine: its pulse goes live and the chain begins at depth 1. */
  function fireMine(mine) {
    state.blasts.push(makeBlast(mine.x, mine.y, MINE.blastRadius, 1));
    state.rings.push(makeRing(mine.x, mine.y, MINE.blastRadius, '#ffd94f'));
    burstParticles(mine.x, mine.y, '#ffd94f', 10, 200);
    state.cues.push(['blast', 1]);
    state.lastChain = 0;
  }

  function step(dt, control) {
    let events = 0;
    state.cues.length = 0;
    if (state.over) return events;
    state.time += dt;
    const player = state.player;
    player.age += dt;
    if (player.invulnerable > 0) player.invulnerable -= dt;
    if (state.chainBanner > 0) state.chainBanner -= dt;

    // Steering: a target point (the pointer) wins; otherwise the held keys push.
    let moveX = 0;
    let moveY = 0;
    if (control.target) {
      moveX = control.target.x - player.x;
      moveY = control.target.y - player.y;
      const distance = Math.hypot(moveX, moveY);
      if (distance > 4) {
        const stepLength = Math.min(distance, PLAYER.speed * dt);
        player.x += (moveX / distance) * stepLength;
        player.y += (moveY / distance) * stepLength;
      }
    } else if (control.dir && (control.dir.x !== 0 || control.dir.y !== 0)) {
      const length = Math.hypot(control.dir.x, control.dir.y);
      player.x += (control.dir.x / length) * PLAYER.speed * dt;
      player.y += (control.dir.y / length) * PLAYER.speed * dt;
    }
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y));
    // A short weave of sparks trails the core as it moves.
    if ((control.target || (control.dir && (control.dir.x || control.dir.y))) && random() < 0.5) {
      state.particles.push(makeParticle(player.x, player.y, random() * TAU, 26, 0.35, '#3ef2e4', 1.8));
    }

    // Mines: drop on request while a charge lasts; tick the fuses down to firing.
    if (control.dropMine && state.charges > 0) {
      state.charges -= 1;
      state.mines.push(makeMine(player.x, player.y, MINE.fuseSeconds));
      state.cues.push(['place', 0]);
    }
    if (state.charges < MINE.maxCharges) {
      state.rechargeTimer += dt;
      if (state.rechargeTimer >= MINE.rechargeSeconds) {
        state.rechargeTimer = 0;
        state.charges += 1;
      }
    }
    for (let index = state.mines.length - 1; index >= 0; index -= 1) {
      const mine = state.mines[index];
      mine.fuse -= dt;
      if (mine.fuse < 0.35 && !mine.beeped) {
        mine.beeped = true;
        state.cues.push(['fuse', 0]);
      }
      if (mine.fuse <= 0) {
        state.mines.splice(index, 1);
        fireMine(mine);
      }
    }

    // Waves and spawning.
    state.waveTime += dt;
    if (state.waveTime >= WAVE.seconds) {
      state.waveTime -= WAVE.seconds;
      state.wave += 1;
      events |= EVENT_WAVE;
      state.cues.push(['wave', 0]);
      state.texts.push(makeText(FIELD.width / 2, 150, `WAVE ${state.wave}`, '#e8e6ff'));
    }
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.motes.length < WAVE.maxAlive) {
      state.spawnTimer = spawnGap() * range(random, 0.75, 1.25);
      spawnMote();
    }

    // Pulses grow; a mote a pulse reaches is doomed, and bursts a beat later, deeper in the chain.
    for (let index = state.blasts.length - 1; index >= 0; index -= 1) {
      const blast = state.blasts[index];
      blast.age += dt;
      blast.radius = Math.min(blast.maxRadius, blast.radius + (blast.maxRadius / (MINE.blastSeconds * 0.6)) * dt);
      if (blast.age >= MINE.blastSeconds) state.blasts.splice(index, 1);
    }
    for (const mote of state.motes) {
      if (mote.doom !== 0) continue; // already bursting, or a bulwark still ringing from a hit
      for (const blast of state.blasts) {
        const reach = blast.radius + mote.radius;
        if (Math.hypot(mote.x - blast.x, mote.y - blast.y) < reach) {
          if (mote.hull > 1) {
            mote.hull -= 1;
            mote.radius = 19;
            mote.doom = -1; // knocked, not doomed: immune to this pulse only via the age check below
            mote.immuneUntil = state.time + MINE.blastSeconds;
            burstParticles(mote.x, mote.y, moteColour(mote.kind), 8, 200);
          } else {
            mote.doom = MINE.chainDelaySeconds;
            mote.doomDepth = blast.depth;
          }
          break;
        }
      }
    }

    // Motes steer and drift; doomed ones count down to bursting.
    for (let index = state.motes.length - 1; index >= 0; index -= 1) {
      const mote = state.motes[index];
      if (mote.doom > 0) {
        mote.doom -= dt;
        if (mote.doom <= 0) {
          state.motes.splice(index, 1);
          burstMote(mote, mote.doomDepth);
        }
        continue;
      }
      if (mote.doom === -1 && state.time > (mote.immuneUntil ?? 0)) mote.doom = 0;
      const spec = MOTE_KINDS[mote.kind];
      if (spec.turn > 0) {
        const wanted = Math.atan2(player.y - mote.y, player.x - mote.x);
        const current = Math.atan2(mote.vy, mote.vx);
        let turn = wanted - current;
        while (turn > Math.PI) turn -= TAU;
        while (turn < -Math.PI) turn += TAU;
        const next = current + Math.max(-spec.turn * dt, Math.min(spec.turn * dt, turn));
        const speed = Math.hypot(mote.vx, mote.vy);
        mote.vx = Math.cos(next) * speed;
        mote.vy = Math.sin(next) * speed;
      }
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      mote.rotation += mote.spin * dt;
      mote.wobble += dt * 3;
      // A mote that crossed the whole field and left the far side is gone for good.
      if (mote.x < -70 || mote.x > FIELD.width + 70 || mote.y < -70 || mote.y > FIELD.height + 70) {
        state.motes.splice(index, 1);
      }
    }

    // The weaver's own body is the only thing a mote can hurt.
    if (player.invulnerable <= 0 && !control.harmless) {
      for (const mote of state.motes) {
        if (mote.doom > 0) continue;
        if (Math.hypot(mote.x - player.x, mote.y - player.y) < mote.radius + player.radius - 2) {
          state.lives -= 1;
          events |= EVENT_HIT;
          state.cues.push(['hurt', 0]);
          burstParticles(player.x, player.y, '#ff3b5c', 26, 320);
          state.rings.push(makeRing(player.x, player.y, 90, '#ff3b5c'));
          // The shock of the hit scatters every mote touching distance away.
          for (const near of state.motes) {
            const dx = near.x - player.x;
            const dy = near.y - player.y;
            const distance = Math.hypot(dx, dy) || 1;
            if (distance < 170) {
              near.x = player.x + (dx / distance) * 190;
              near.y = player.y + (dy / distance) * 190;
            }
          }
          if (state.lives <= 0) {
            state.over = true;
            events |= EVENT_OVER;
            state.cues.push(['over', 0]);
          } else {
            player.invulnerable = PLAYER.invulnerableSeconds;
          }
          break;
        }
      }
    }

    // Decoration ages out.
    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const particle = state.particles[index];
      particle.life -= dt;
      if (particle.life <= 0) { state.particles.splice(index, 1); continue; }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.92;
      particle.vy *= 0.92;
    }
    for (let index = state.rings.length - 1; index >= 0; index -= 1) {
      const ring = state.rings[index];
      ring.age += dt;
      ring.radius += (ring.maxRadius - ring.radius) * 6 * dt;
      if (ring.age >= ring.life) state.rings.splice(index, 1);
    }
    for (let index = state.texts.length - 1; index >= 0; index -= 1) {
      const text = state.texts[index];
      text.age += dt;
      text.y -= 34 * dt;
      if (text.age >= text.life) state.texts.splice(index, 1);
    }
    return events;
  }

  return { state, reset, step };
}
