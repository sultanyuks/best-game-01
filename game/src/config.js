// Pulseweave tuning: the field, the weaver, the mines and the motes, all in one place so the
// balance of the game can be read (and changed) without hunting through the simulation.

/** The logical play field; the renderer scales it to whatever window the game runs in. */
export const FIELD = { width: 1280, height: 800 };

/** Fixed simulation step, in seconds: the world always advances in these slices. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 14,
  speed: 355,
  /** Seconds of safety after a hit, while the weaver blinks back into the weave. */
  invulnerableSeconds: 2.2,
  startLives: 3,
};

export const MINE = {
  /** Seconds between dropping a mine and its pulse. */
  fuseSeconds: 1.1,
  /** Radius of a pulse at full reach, in field units. */
  blastRadius: 128,
  /** How long a pulse stays live once it fires, growing out and fading. */
  blastSeconds: 0.32,
  /** Delay between one mote bursting and the next in the chain, in seconds. */
  chainDelaySeconds: 0.09,
  /** Pulse charges the weaver can hold; one returns every rechargeSeconds. */
  maxCharges: 3,
  rechargeSeconds: 2.1,
  /** Score for a mote burst by a pulse, before the chain multiplier. */
  baseScore: 50,
};

export const WAVE = {
  /** Seconds a wave lasts before the next one rolls in, faster and denser. */
  seconds: 20,
  firstSpawnSeconds: 1.45,
  minSpawnSeconds: 0.5,
  /** Each wave multiplies the spawn gap by this, down to minSpawnSeconds. */
  spawnShrink: 0.88,
  /** Each wave adds this fraction to every mote's speed. */
  speedGrowth: 0.07,
  maxAlive: 30,
};

/** The neon palette: one colour per thing, so a frame reads at a glance. */
export const COLOURS = {
  backgroundTop: '#0b0821',
  backgroundBottom: '#07060f',
  grid: 'rgba(94, 84, 180, 0.16)',
  player: '#3ef2e4',
  playerCore: '#eafffb',
  mine: '#ff4fd8',
  blast: '#ffd94f',
  chaser: '#ff5470',
  dart: '#ffb347',
  splitter: '#b388ff',
  bulwark: '#ff7847',
  text: '#e8e6ff',
  dimText: '#9a94c7',
  danger: '#ff3b5c',
};
