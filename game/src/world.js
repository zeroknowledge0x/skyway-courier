// Flight model and mission rules. A sortie is a deterministic simulation: seed the noise once and
// every ring, ridge and runway stays where it was. The three missions share the same aircraft but
// ask for different disciplines: gate accuracy, a slow aligned landing, and valley navigation.
import { PLANE, RING_COUNT, CHECKPOINT_COUNT, MISSION_NAMES } from './config.js';
import { valleyCenter, terrainAt, riverCenter } from './noise.js';

export const PHASE = { BRIEF: 'brief', FLY: 'fly', WON: 'won', CRASH: 'crash' };

function gates(seed) {
  const rings = [];
  for (let i = 0; i < RING_COUNT; i += 1) {
    const z = 760 + i * 980;
    const side = [-110, 130, 85, -145, 40][i];
    rings.push({ x: valleyCenter(z) + side, y: 250 + (i % 2) * 95, z, r: 118, passed: false });
  }
  return rings;
}

function checkpoints() {
  const list = [];
  for (let i = 0; i < CHECKPOINT_COUNT; i += 1) {
    const z = 620 + i * 720;
    list.push({ x: valleyCenter(z), y: 120, z, r: 170, passed: false });
  }
  return list;
}

export function createWorld(seed = 7, mission = 0) {
  const w = {
    seed,
    mission: 0,
    phase: PHASE.BRIEF,
    time: 0,
    score: 0,
    streak: 0,
    fuel: 1,
    damage: 0,
    speed: PLANE.cruiseSpeed,
    altitude: 340,
    heading: 0,
    bank: 0,
    pitch: 0,
    x: valleyCenter(0),
    z: 0,
    shake: 0,
    message: '',
    messageTime: 0,
    rings: [],
    checkpoints: [],
    runway: { x: 0, y: 0, z: 2600 },
  };
  setMission(w, mission);
  return w;
}

export function setMission(w, mission) {
  w.mission = ((mission % MISSION_NAMES.length) + MISSION_NAMES.length) % MISSION_NAMES.length;
  w.rings = gates(w.seed);
  w.checkpoints = checkpoints();
  const rz = 2800;
  w.runway = { x: valleyCenter(rz), y: terrainAt(valleyCenter(rz), rz, w.seed).h + 6, z: rz };
  w.phase = PHASE.BRIEF;
  w.score = 0;
  w.streak = 0;
  w.fuel = 1;
  w.damage = 0;
  w.time = 0;
  w.speed = PLANE.cruiseSpeed;
  w.altitude = 340;
  w.heading = 0;
  w.bank = 0;
  w.pitch = 0;
  w.x = valleyCenter(0);
  w.z = 0;
  w.message = '';
  w.messageTime = 0;
  w.shake = 0;
}

export function say(w, text) { w.message = text; w.messageTime = 3.2; }
export function nextObjective(w) {
  if (w.mission === 0) {
    const ring = w.rings.find((r) => !r.passed);
    return ring ? { name: 'RIDGE GATE', x: ring.x, z: ring.z, left: w.rings.filter((r) => r.passed).length } : null;
  }
  if (w.mission === 1) return { name: 'RUNWAY 09', x: w.runway.x, z: w.runway.z, left: 0 };
  const cp = w.checkpoints.find((c) => !c.passed);
  return cp ? { name: 'VALLEY CHECKPOINT', x: cp.x, z: cp.z, left: w.checkpoints.filter((c) => c.passed).length } : null;
}

export function launch(w) {
  if (w.phase !== PHASE.BRIEF) return;
  w.phase = PHASE.FLY;
  say(w, `${MISSION_NAMES[w.mission].toUpperCase()} · GO`);
}

/** Crossing test: the previous frame was before the marker, this one is at or past it. */
function crossed(w, marker, before) { return before < marker.z && w.z >= marker.z; }

export function stepWorld(w, c, dt) {
  if (w.phase !== PHASE.FLY) return;
  const before = w.z;
  w.time += dt;
  w.bank += (c.roll * PLANE.rollRate - w.bank * 2.3) * dt;
  const headingRate = w.bank * PLANE.turnRate;
  w.heading = (w.heading + headingRate * dt + 360) % 360;
  w.pitch += (c.pitch * 0.85 - w.pitch * 1.6) * dt;
  const wantSpeed = PLANE.cruiseSpeed + c.throttle * 68 - (c.brake ? 78 : 0);
  w.speed += (wantSpeed - w.speed) * 0.9 * dt;
  w.speed = Math.max(PLANE.minSpeed, Math.min(PLANE.maxSpeed, w.speed));
  w.altitude += (w.pitch * PLANE.climbRate + (w.speed - PLANE.cruiseSpeed) * 0.35) * dt;
  w.altitude = Math.max(14, Math.min(PLANE.maxAltitude, w.altitude));
  const rad = w.heading * Math.PI / 180;
  w.x += Math.sin(rad) * w.speed * dt;
  w.z += Math.cos(rad) * w.speed * dt;
  w.fuel = Math.max(0, w.fuel - dt * 0.55);
  w.shake = Math.max(0, w.shake - dt * 2.5);
  if (w.messageTime > 0) w.messageTime -= dt;

  const ground = terrainAt(w.x, w.z, w.seed).h;
  if (w.altitude < ground + 14) {
    w.altitude = ground + 14;
    w.damage = Math.min(1, w.damage + dt * 0.22);
    w.shake = 0.8;
    if (w.messageTime <= 0) say(w, 'PULL UP · TERRAIN');
  }
  if (w.damage >= 1 || w.fuel <= 0) {
    w.phase = PHASE.CRASH;
    say(w, w.fuel <= 0 ? 'FUEL EXHAUSTED' : 'AIRFRAME LOST');
    return;
  }

  if (w.mission === 0) {
    const ring = w.rings.find((r) => !r.passed);
    if (ring && crossed(w, ring, before)) {
      const miss = Math.hypot(w.x - ring.x, w.altitude - ring.y);
      if (miss < ring.r) {
        ring.passed = true;
        w.streak += 1;
        w.score += 120 + w.streak * 20;
        w.fuel = Math.min(1, w.fuel + 0.07);
        say(w, `GATE ${w.rings.filter((r) => r.passed).length}/${RING_COUNT} · +${120 + w.streak * 20}`);
      } else {
        w.streak = 0;
        ring.z += 820;
        ring.x = valleyCenter(ring.z) + (miss > 0 ? -90 : 90);
        say(w, 'MISSED GATE · TURN BACK');
      }
    }
    if (w.rings.every((r) => r.passed)) {
      w.phase = PHASE.WON;
      w.score += 500;
      say(w, 'RIDGE RUN COMPLETE · +500');
    }
  } else if (w.mission === 1) {
    if (crossed(w, w.runway, before)) {
      const aligned = Math.abs(w.x - w.runway.x) < 62;
      const slow = w.speed < 168;
      const low = w.altitude < 110;
      if (aligned && slow && low) {
        w.phase = PHASE.WON;
        w.score += 900;
        say(w, 'TOUCHDOWN · CLEAN LANDING +900');
      } else {
        w.runway.z += 2400;
        w.runway.x = valleyCenter(w.runway.z);
        w.streak = 0;
        say(w, 'GO AROUND · SLOW AND ALIGN');
      }
    }
  } else {
    for (const cp of w.checkpoints) {
      if (!cp.passed && crossed(w, cp, before)) {
        if (Math.abs(w.x - cp.x) < cp.r) {
          cp.passed = true;
          w.streak += 1;
          w.score += 90 + w.streak * 10;
          say(w, `CHECKPOINT ${w.checkpoints.filter((p) => p.passed).length}/${CHECKPOINT_COUNT}`);
        } else {
          w.streak = 0;
          say(w, 'CHECKPOINT MISSED');
        }
      }
    }
    if (w.checkpoints.every((p) => p.passed)) {
      w.phase = PHASE.WON;
      w.score += 500;
      say(w, 'COURIER ROUTE COMPLETE · +500');
    }
  }
}

export function compass(w) { return Math.round((360 - w.heading) % 360); }
export function riverOffset(w) { return riverCenter(w.z); }
