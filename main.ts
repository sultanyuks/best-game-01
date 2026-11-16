// Pulseweave's hand-in program (Node 22, standard library only). The game itself is the static
// folder beside this file — game/index.html and its ES modules, no build step, no network — and
// this program delivers it: it copies game/ and screenshots/ into the output directory and
// writes dossier.json there with the kit's vendored buildDossier, exactly as the scorer will
// rebuild it. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// and play the game itself with `node serve.ts`, then http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps are the gate's own (see RULES.txt): at most 4 screenshots of at most 256 KiB, at
// most 993 files and 48 MiB under game/, no game path over 1,000 bytes, and the dossier's
// source text capped at 160 KiB. buildDossier refuses anything beyond them, as the scorer does.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
