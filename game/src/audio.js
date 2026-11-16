// Every sound in Pulseweave is synthesised with the Web Audio API: short oscillator tones and
// one filtered noise buffer, no audio files. The context is created lazily on the first user
// gesture (a browser rule), and every call is safe before that: it simply stays silent.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let noiseBuffer = null;

  function unlock() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    context = new AudioCtor();
    master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);
    const length = context.sampleRate * 0.5;
    noiseBuffer = context.createBuffer(1, length, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
  }

  /** One oscillator tone: frequency glides from `from` to `to` over the note's life. */
  function tone(from, to, seconds, type, volume, delay = 0) {
    if (!context || muted) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, to), start + seconds);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain).connect(master);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  /** A burst of filtered noise: the body of an explosion. */
  function noise(seconds, volume, cutoff, delay = 0) {
    if (!context || muted) return;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    filter.frequency.exponentialRampToValueAtTime(120, start + seconds);
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    source.connect(filter).connect(gain).connect(master);
    source.start(start);
    source.stop(start + seconds + 0.02);
  }

  return {
    unlock,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    /** A mine leaves the weaver's hand. */
    place() { tone(660, 330, 0.09, 'square', 0.12); },
    /** The warning ticks of a mine about to fire. */
    fuseTick() { tone(1180, 1180, 0.04, 'square', 0.06); },
    /** A pulse fires; each step deeper into a chain rings higher. */
    blast(depth) {
      const lift = Math.min(depth, 8);
      noise(0.28, 0.5, 900 + lift * 160);
      tone(180 + lift * 45, 55, 0.3, 'sine', 0.5);
      tone(520 + lift * 90, 760 + lift * 90, 0.14, 'triangle', 0.16, 0.02);
    },
    /** A mote bursts without chaining further: a small pop on top of the blast. */
    pop(depth) { tone(300 + Math.min(depth, 8) * 60, 90, 0.1, 'triangle', 0.14); },
    /** The weaver is hit. */
    hurt() {
      noise(0.35, 0.4, 700);
      tone(320, 60, 0.4, 'sawtooth', 0.3);
    },
    /** A new wave rolls in: two rising notes. */
    wave() {
      tone(392, 392, 0.11, 'triangle', 0.2);
      tone(587, 587, 0.16, 'triangle', 0.2, 0.1);
    },
    /** The game starts. */
    start() {
      tone(262, 262, 0.09, 'triangle', 0.18);
      tone(392, 392, 0.09, 'triangle', 0.18, 0.08);
      tone(523, 523, 0.14, 'triangle', 0.18, 0.16);
    },
    /** The game ends: a slow fall. */
    over() {
      tone(440, 440, 0.16, 'triangle', 0.2);
      tone(349, 349, 0.16, 'triangle', 0.2, 0.15);
      tone(262, 130, 0.34, 'triangle', 0.22, 0.3);
    },
    /** The low heartbeat under play, called on a timer by main.js. */
    pulse(beat) {
      tone(beat % 2 === 0 ? 65 : 82, 60, 0.22, 'sine', 0.16);
    },
  };
}
