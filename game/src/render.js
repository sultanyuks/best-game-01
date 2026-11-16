// Everything Pulseweave looks like: the neon field, the weaver, the motes, the pulses, the HUD
// and the title, pause and game-over screens. It only reads the world state and draws it; the
// shake and flash live here, fed by main.js when the world reports a hit or a deep chain.

import { COLOURS, FIELD, MINE } from './config.js';
import { MOTE_KINDS } from './entities.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;

/** Background stars: fixed once from a seed, so every frame and every screenshot agrees. */
const STARS = (() => {
  const random = createRandom(20261115);
  const stars = [];
  for (let index = 0; index < 130; index += 1) {
    stars.push({ x: random() * FIELD.width, y: random() * FIELD.height, r: random() * 1.6 + 0.4, a: random() * 0.5 + 0.15 });
  }
  return stars;
})();

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let trauma = 0;
  let flash = 0;
  let flashColour = '#ffd94f';
  let view = { scale: 1, x: 0, y: 0, width: 0, height: 0 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    view.width = canvas.width;
    view.height = canvas.height;
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  /** Convert a client (CSS pixel) point into field units, for the pointer controls. */
  function toField(clientX, clientY) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return {
      x: (clientX * dpr - view.x) / view.scale,
      y: (clientY * dpr - view.y) / view.scale,
    };
  }

  function addShake(amount) {
    trauma = Math.min(1, trauma + amount);
  }

  function addFlash(colour, amount) {
    flashColour = colour;
    flash = Math.max(flash, amount);
  }

  function polygon(x, y, radius, sides, rotation) {
    ctx.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = rotation + (index / sides) * TAU;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawBackground(state) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, COLOURS.backgroundTop);
    gradient.addColorStop(1, COLOURS.backgroundBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = COLOURS.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 80; x < FIELD.width; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.height); }
    for (let y = 80; y < FIELD.height; y += 80) { ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); }
    ctx.stroke();
    for (const star of STARS) {
      const twinkle = 0.75 + 0.25 * Math.sin(state.time * 1.7 + star.x);
      ctx.globalAlpha = star.a * twinkle;
      ctx.fillStyle = '#cfd2ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(62, 242, 228, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, FIELD.width - 2, FIELD.height - 2);
  }

  function drawMotes(state) {
    for (const mote of state.motes) {
      const colour = COLOURS[mote.kind];
      const doomed = mote.doom > 0;
      const wobble = 1 + Math.sin(mote.wobble) * 0.05 + (doomed ? 0.22 : 0);
      ctx.save();
      ctx.shadowColor = colour;
      ctx.shadowBlur = 14;
      polygon(mote.x, mote.y, mote.radius * wobble, MOTE_KINDS[mote.kind].sides, mote.rotation);
      ctx.fillStyle = doomed ? '#ffffff' : colour;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0b0821';
      ctx.stroke();
      ctx.restore();
      // A bulwark that has taken one pulse shows its cracked inner hull.
      if (mote.kind === 'bulwark' && mote.hull === 1) {
        polygon(mote.x, mote.y, mote.radius * 0.55, 5, -mote.rotation);
        ctx.strokeStyle = 'rgba(11, 8, 33, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      // The heart of the mote.
      ctx.fillStyle = 'rgba(11, 8, 33, 0.55)';
      ctx.beginPath();
      ctx.arc(mote.x, mote.y, mote.radius * 0.3, 0, TAU);
      ctx.fill();
    }
  }

  function drawMines(state) {
    for (const mine of state.mines) {
      const urgency = 1 - mine.fuse / MINE.fuseSeconds;
      const pulse = 1 + Math.sin(state.time * (6 + urgency * 14)) * 0.12;
      ctx.save();
      ctx.shadowColor = COLOURS.mine;
      ctx.shadowBlur = 16;
      ctx.fillStyle = COLOURS.mine;
      ctx.beginPath();
      ctx.arc(mine.x, mine.y, 9 * pulse, 0, TAU);
      ctx.fill();
      ctx.restore();
      // The fuse ring burns down around the mine.
      ctx.strokeStyle = urgency > 0.7 ? COLOURS.danger : COLOURS.blast;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mine.x, mine.y, 17, -Math.PI / 2, -Math.PI / 2 + TAU * (mine.fuse / MINE.fuseSeconds));
      ctx.stroke();
      // Its reach, faint, so a player can plan the chain.
      ctx.strokeStyle = 'rgba(255, 79, 216, 0.13)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mine.x, mine.y, MINE.blastRadius, 0, TAU);
      ctx.stroke();
    }
  }

  function drawBlasts(state) {
    for (const blast of state.blasts) {
      const fade = 1 - blast.age / MINE.blastSeconds;
      ctx.save();
      ctx.globalAlpha = 0.22 * fade;
      ctx.fillStyle = COLOURS.blast;
      ctx.beginPath();
      ctx.arc(blast.x, blast.y, blast.radius, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.85 * fade;
      ctx.strokeStyle = COLOURS.blast;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(blast.x, blast.y, blast.radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    for (const ring of state.rings) {
      ctx.save();
      ctx.globalAlpha = 0.6 * (1 - ring.age / ring.life);
      ctx.strokeStyle = ring.colour;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticlesAndTexts(state) {
    for (const particle of state.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.colour;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.textAlign = 'center';
    for (const text of state.texts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - text.age / text.life);
      ctx.font = '700 21px system-ui, sans-serif';
      ctx.fillStyle = text.colour;
      ctx.fillText(text.label, text.x, text.y);
      ctx.restore();
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    if (player.invulnerable > 0 && Math.floor(state.time * 12) % 2 === 0 && state.lives > 0) return; // blink
    ctx.save();
    ctx.shadowColor = COLOURS.player;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLOURS.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = COLOURS.playerCore;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 0.45, 0, TAU);
    ctx.fill();
    ctx.restore();
    // The weave: two arcs circling the core, faster while it moves.
    ctx.strokeStyle = COLOURS.player;
    ctx.lineWidth = 2.5;
    for (let arc = 0; arc < 2; arc += 1) {
      const start = player.age * 3.4 + arc * Math.PI;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 7, start, start + Math.PI * 0.7);
      ctx.stroke();
    }
  }

  function drawHud(state, muted) {
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOURS.dimText;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText('SCORE', 26, 36);
    ctx.fillStyle = COLOURS.text;
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.fillText(String(state.score), 26, 72);

    ctx.textAlign = 'center';
    ctx.fillStyle = COLOURS.dimText;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText('WAVE', FIELD.width / 2, 36);
    ctx.fillStyle = COLOURS.text;
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.fillText(String(state.wave), FIELD.width / 2, 72);

    // Lives: one lit core per life left.
    for (let index = 0; index < 3; index += 1) {
      const x = FIELD.width - 40 - index * 38;
      ctx.save();
      if (index < state.lives) {
        ctx.shadowColor = COLOURS.player;
        ctx.shadowBlur = 12;
        ctx.fillStyle = COLOURS.player;
      } else {
        ctx.fillStyle = 'rgba(154, 148, 199, 0.3)';
      }
      ctx.beginPath();
      ctx.arc(x, 52, 11, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // Pulse charges along the bottom edge.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLOURS.dimText;
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.fillText('PULSES', 26, FIELD.height - 44);
    for (let index = 0; index < MINE.maxCharges; index += 1) {
      ctx.save();
      if (index < state.charges) {
        ctx.shadowColor = COLOURS.mine;
        ctx.shadowBlur = 10;
        ctx.fillStyle = COLOURS.mine;
      } else {
        ctx.fillStyle = 'rgba(154, 148, 199, 0.3)';
      }
      ctx.beginPath();
      ctx.arc(38 + index * 30, FIELD.height - 22, 8, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = COLOURS.dimText;
    ctx.font = '500 14px system-ui, sans-serif';
    ctx.fillText(muted ? 'M — sound off' : 'M — sound on · P — pause', FIELD.width - 26, FIELD.height - 22);

    if (state.chainBanner > 0 && state.lastChain >= 3) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.chainBanner);
      ctx.textAlign = 'center';
      ctx.shadowColor = COLOURS.blast;
      ctx.shadowBlur = 18;
      ctx.fillStyle = COLOURS.blast;
      ctx.font = '800 40px system-ui, sans-serif';
      ctx.fillText(`CHAIN ×${state.lastChain}!`, FIELD.width / 2, 128);
      ctx.restore();
    }
  }

  function panel(alpha) {
    ctx.fillStyle = `rgba(5, 4, 16, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best, now) {
    panel(0.45);
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = COLOURS.player;
    ctx.shadowBlur = 30;
    ctx.fillStyle = COLOURS.player;
    ctx.font = '800 92px system-ui, sans-serif';
    ctx.fillText('PULSEWEAVE', FIELD.width / 2, 268);
    ctx.restore();
    ctx.fillStyle = COLOURS.text;
    ctx.font = '500 24px system-ui, sans-serif';
    ctx.fillText('Drop a pulse. Watch the weave catch fire.', FIELD.width / 2, 318);
    ctx.fillStyle = COLOURS.dimText;
    ctx.font = '500 20px system-ui, sans-serif';
    ctx.fillText('Steer with the mouse or the arrow keys. Your core lays a pulse mine where it stands —', FIELD.width / 2, 396);
    ctx.fillText('click or press SPACE. A pulse bursts every mote it touches, and each burst fires', FIELD.width / 2, 426);
    ctx.fillText('another pulse: chain them deep to multiply your score. Do not let a mote touch you.', FIELD.width / 2, 456);
    ctx.fillStyle = COLOURS.blast;
    ctx.font = '700 21px system-ui, sans-serif';
    ctx.fillText('Chasers hunt · Darts dive · Splitters break in two · Bulwarks take two pulses', FIELD.width / 2, 508);
    if (Math.floor(now * 1.6) % 2 === 0) {
      ctx.fillStyle = COLOURS.text;
      ctx.font = '800 27px system-ui, sans-serif';
      ctx.fillText('CLICK OR PRESS ENTER TO WEAVE', FIELD.width / 2, 592);
    }
    if (best > 0) {
      ctx.fillStyle = COLOURS.dimText;
      ctx.font = '600 19px system-ui, sans-serif';
      ctx.fillText(`Best score ${best}`, FIELD.width / 2, 640);
    }
  }

  function drawOver(state, best, now) {
    panel(0.62);
    ctx.textAlign = 'center';
    ctx.save();
    ctx.shadowColor = COLOURS.danger;
    ctx.shadowBlur = 26;
    ctx.fillStyle = COLOURS.danger;
    ctx.font = '800 76px system-ui, sans-serif';
    ctx.fillText('SIGNAL LOST', FIELD.width / 2, 300);
    ctx.restore();
    ctx.fillStyle = COLOURS.text;
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.fillText(`Score ${state.score}`, FIELD.width / 2, 386);
    ctx.fillStyle = COLOURS.dimText;
    ctx.font = '500 23px system-ui, sans-serif';
    ctx.fillText(`Reached wave ${state.wave} · Best ${Math.max(best, state.score)}`, FIELD.width / 2, 432);
    if (state.score >= best && state.score > 0) {
      ctx.fillStyle = COLOURS.blast;
      ctx.font = '700 22px system-ui, sans-serif';
      ctx.fillText('A new best weave!', FIELD.width / 2, 472);
    }
    if (Math.floor(now * 1.6) % 2 === 0) {
      ctx.fillStyle = COLOURS.text;
      ctx.font = '800 26px system-ui, sans-serif';
      ctx.fillText('CLICK OR PRESS ENTER TO WEAVE AGAIN', FIELD.width / 2, 556);
    }
  }

  function drawPause() {
    panel(0.55);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLOURS.text;
    ctx.font = '800 54px system-ui, sans-serif';
    ctx.fillText('PAUSED', FIELD.width / 2, 396);
    ctx.fillStyle = COLOURS.dimText;
    ctx.font = '500 21px system-ui, sans-serif';
    ctx.fillText('Press P to keep weaving', FIELD.width / 2, 440);
  }

  function draw(state, screen, options) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLOURS.backgroundBottom;
    ctx.fillRect(0, 0, view.width, view.height);
    const shakeX = trauma > 0 ? (Math.random() * 2 - 1) * trauma * 14 : 0;
    const shakeY = trauma > 0 ? (Math.random() * 2 - 1) * trauma * 14 : 0;
    trauma = Math.max(0, trauma - 0.045);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawBackground(state);
    drawBlasts(state);
    drawMines(state);
    drawMotes(state);
    drawParticlesAndTexts(state);
    if (screen !== SCREEN_OVER) drawPlayer(state);
    drawHud(state, options.muted);
    if (screen === SCREEN_TITLE) drawTitle(state, options.best, options.now);
    if (screen === SCREEN_OVER) drawOver(state, options.best, options.now);
    if (options.paused) drawPause();
    if (flash > 0) {
      ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
      ctx.globalAlpha = flash * 0.35;
      ctx.fillStyle = flashColour;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.globalAlpha = 1;
      flash = Math.max(0, flash - 0.06);
    }
  }

  resize();
  return { draw, resize, toField, addShake, addFlash };
}
