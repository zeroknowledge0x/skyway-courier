// Screenshot scenes are real game states: the same terrain, gates, runway and renderer a player
// sees, only frozen at a chosen moment with a fixed seed. ?shot=brief|rings|runway|canyon.
import { PHASE, say } from './world.js';
import { valleyCenter, terrainAt } from './noise.js';

export function stageShot(name, world) {
  const z = name === 'runway' ? world.runway.z - 700 : name === 'canyon' ? 2160 : 1420;
  world.z = z;
  world.x = valleyCenter(z);
  world.altitude = 340;
  world.speed = 192;
  world.heading = 2;
  world.bank = 0.08;
  world.pitch = 0;
  world.time = 12;
  world.score = 240;
  world.streak = 2;
  world.fuel = 0.88;
  world.damage = 0.06;
  world.phase = PHASE.FLY;

  if (name === 'brief') {
    world.phase = PHASE.BRIEF;
    world.z = 980;
    world.x = valleyCenter(980) - 30;
    world.altitude = 300;
    world.bank = -0.1;
    world.score = 0;
    return { screen: PHASE.BRIEF };
  }

  if (name === 'rings') {
    world.mission = 0;
    world.z = 1420;
    world.x = valleyCenter(1420) - 55;
    world.altitude = 290;
    world.bank = 0.22;
    world.score = 380;
    world.rings[0].passed = true;
    const gate = world.rings[1];
    gate.x = world.x + 26;
    gate.y = world.altitude + 92;
    gate.z = world.z + 430;
    say(world, 'GATE 2/5 · HOLD YOUR LINE');
    return { screen: PHASE.FLY };
  }

  if (name === 'runway') {
    world.mission = 1;
    world.z = world.runway.z - 700;
    world.x = world.runway.x + 9;
    world.altitude = 112;
    world.speed = 152;
    world.bank = -0.06;
    world.runway.y = terrainAt(world.runway.x, world.runway.z, world.seed).h + 6;
    say(world, 'FINAL APPROACH · 700 M');
    return { screen: PHASE.FLY };
  }

  world.mission = 2;
  world.z = 2160;
  world.x = valleyCenter(2160) + 14;
  world.altitude = 182;
  world.bank = -0.26;
  world.score = 460;
  world.checkpoints[0].passed = true;
  world.checkpoints[1].passed = true;
  const cp = world.checkpoints[2];
  cp.z = world.z + 520;
  cp.x = valleyCenter(cp.z);
  say(world, 'CHECKPOINT 3/6 · RIDGELINE AHEAD');
  return { screen: PHASE.FLY };
}
