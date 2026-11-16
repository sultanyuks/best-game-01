# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/sultanyuks/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/sultanyuks/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Pulseweave** — an original neon chain-reaction arcade game for the desktop browser. You are the Weaver, a glowing core in a field of drifting motes. You cannot shoot: you lay pulse mines where you stand (click or SPACE), each mine fires a pulse that bursts every mote it touches — and every burst fires another pulse, one step deeper. Chain reactions multiply your score (×2, ×3, ×4…), so the skill is herding: bait a crowd together, drop the pulse, and run. Four mote kinds keep it honest — Chasers hunt you, Darts dive in straight lines, Splitters break into two Darts, and Bulwarks take two pulses. Waves roll in every 20 seconds, faster and denser each time; three touches end the run. Title screen, HUD (score, wave, lives, pulse charges), pause, game-over screen with best score, restart, and a fully synthesised Web Audio soundtrack of blasts, chains and heartbeats — no audio files, no images, no network: every sound and sprite is made in code. Static ES modules under `game/`, one job per file: `world.js` simulates, `render.js` draws, `audio.js` synthesises, `shots.js` stages the screenshots by playing the real game with an autopilot.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 — or serve the game/ folder with any static file server
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=tv86zvxh&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
