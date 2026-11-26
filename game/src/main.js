// Boot and the one fixed-step loop. A ?shot=... URL stages a frame and sets window.__shotReady
// after two paints so a browser can take a real screenshot of the game's own renderer.
import { STEP } from './config.js';
import { createWorld, stepWorld, launch, PHASE, setMission } from './world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const missionParam = Number.parseInt(params.get('mission') ?? '', 10);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed, Number.isInteger(missionParam) ? missionParam : 0);
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function announce(text) { status.textContent = text; }

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  announce('Ridge Runner. Space or click to launch.');

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (input.takeConfirm()) {
      if (world.phase === PHASE.BRIEF) {
        launch(world);
        announce('Ridge Runner in flight.');
      } else {
        const mission = world.mission;
        setMission(world, mission);
        launch(world);
        announce('New sortie launched.');
      }
    }
    const controls = input.read();
    while (accumulator >= STEP) {
      stepWorld(world, controls, STEP);
      accumulator -= STEP;
    }
    renderer.draw(world);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
