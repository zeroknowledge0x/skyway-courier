// Ridge Runner's hand-in program (Node 22, standard library only). It copies the playable game/
// and the four browser-taken screenshots beside this file into /output, then writes dossier.json
// with make.fun's vendored library, byte for byte the way the gate rebuilds it.
//   node main.ts                      # writes /output
//   MAKEFUN_OUTPUT_DIR=out node main.ts   # local dry run
// No clock, network or random source is read: two runs produce identical output trees.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotDir = join(here, 'screenshots');

if (!existsSync(join(gameDir, 'index.html'))) throw new Error('game/index.html is missing');
if (!existsSync(shotDir)) throw new Error('screenshots/ is missing');
const shots = readdirSync(shotDir).filter((name) => !name.startsWith('.')).sort();
if (shots.length < 3 || shots.length > 4) throw new Error('screenshots/ must hold 3 or 4 images');
for (const name of shots) {
  // A byte check keeps the cover first: shot names sort 1-.., 2-.., 3-.., 4-.., and the judge
  // reads the first one as the game's cover, so a stray file can change the whole first impression.
  if (statSync(join(shotDir, name)).size > 262144) throw new Error(`screenshot over 256 KiB: ${name}`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotDir, join(out, 'screenshots'), { recursive: true });

// The caps mirror the competition's own gate; the dossier is otherwise built only from what we
// copied, so the sealed scorer can rebuild the same bytes from the same library.
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
