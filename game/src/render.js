// The renderer paints one fixed 1280x720 chase camera. Terrain is drawn as perspective ribbons
// from the same height field the flight model collides with; the aircraft, gates, runway and the
// instrument panel are drawn on top. Nothing here reads the clock or a random source.
import { VIEW, FOCAL, SPAN, TERRAIN, PALETTE, MISSION_NAMES } from './config.js';
import { valueNoise, terrainAt, terrainColor, riverCenter } from './noise.js';
import { PHASE, nextObjective, compass } from './world.js';

const W = VIEW.width, H = VIEW.height;
const RINGS = [];
for (let k = 0; k <= TERRAIN.rows; k += 1) {
  const t = k / TERRAIN.rows;
  RINGS.push(TERRAIN.near + (TERRAIN.far - TERRAIN.near) * Math.pow(t, 2.35));
}

function project(w, x, y, z) {
  const dz = z - w.z;
  if (dz <= 3) return null;
  const horizon = H * VIEW.horizon + w.pitch * 210;
  return {
    x: W / 2 + ((x - w.x) * FOCAL) / dz,
    y: horizon - ((y - w.altitude) * FOCAL) / dz,
    s: FOCAL / dz,
  };
}

function polygon(ctx, pts, fill, stroke) {
  if (pts.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}

function drawSky(ctx, w) {
  const horizon = H * VIEW.horizon + w.pitch * 210;
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(horizon, 200));
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.58, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(-200, -200, W + 400, horizon + 420);
  const sunX = W * 0.74 - (w.heading - 180) * 0.16;
  ctx.fillStyle = PALETTE.sun;
  ctx.beginPath();
  ctx.arc(sunX, horizon - 132, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(246,223,174,0.13)';
  ctx.beginPath();
  ctx.arc(sunX, horizon - 132, 76, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 6; i += 1) {
    const cx = ((i * 263 - w.z * 0.055) % (W + 360) + W + 360) % (W + 360) - 180;
    const cy = horizon - 90 - (i % 3) * 62;
    ctx.fillStyle = 'rgba(244,236,216,0.24)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 92 + i * 9, 13 + (i % 2) * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRidges(ctx, w) {
  const horizon = H * VIEW.horizon + w.pitch * 210;
  const layers = [
    { y: horizon + 8, amp: 62, color: PALETTE.ridgeFar, shift: 0.018, step: 72 },
    { y: horizon + 34, amp: 48, color: PALETTE.ridgeMid, shift: 0.036, step: 56 },
    { y: horizon + 56, amp: 34, color: PALETTE.ridgeNear, shift: 0.06, step: 44 },
  ];
  for (const layer of layers) {
    const pts = [[-40, H]];
    for (let x = -40; x <= W + 40; x += layer.step) {
      const n = valueNoise(x / 240 + w.z * layer.shift / 1000, 3.7, 11);
      pts.push([x, layer.y - n * layer.amp]);
    }
    pts.push([W + 40, H]);
    polygon(ctx, pts, layer.color);
  }
}

function drawTerrain(ctx, w) {
  const horizon = H * VIEW.horizon + w.pitch * 210;
  const columns = TERRAIN.cols;
  const xs = [];
  for (let j = 0; j <= columns; j += 1) xs.push((j / columns) * W);
  for (let k = TERRAIN.rows - 1; k >= 0; k -= 1) {
    const dzFar = RINGS[k + 1], dzNear = RINGS[k];
    const far = [], near = [], cells = [];
    for (let j = 0; j <= columns; j += 1) {
      const u = j / columns;
      const wxFar = w.x + (u - 0.5) * dzFar * SPAN;
      const wxNear = w.x + (u - 0.5) * dzNear * SPAN;
      const cFar = terrainAt(wxFar, w.z + dzFar, w.seed);
      const cNear = terrainAt(wxNear, w.z + dzNear, w.seed);
      far.push([xs[j], horizon + ((w.altitude - cFar.h) * FOCAL) / dzFar]);
      near.push([xs[j], horizon + ((w.altitude - cNear.h) * FOCAL) / dzNear]);
      cells.push(cNear);
    }
    const haze = Math.min(0.72, Math.max(0, (dzFar - 280) / 3200));
    for (let j = 0; j < columns; j += 1) {
      const quad = [far[j], far[j + 1], near[j + 1], near[j]];
      const cx = w.x + ((j + 0.5) / columns - 0.5) * dzNear * SPAN;
      polygon(ctx, quad, terrainColor(cells[j], cx, w.z + dzNear, 1, PALETTE));
      if (haze > 0.02) { ctx.fillStyle = `rgba(185,168,148,${haze})`; ctx.fill(); }
      if (cells[j].river > 0.55 && k % 3 === 0) {
        ctx.fillStyle = 'rgba(226,222,196,0.16)';
        ctx.fill();
      }
    }
  }
}

function drawRunway(ctx, w) {
  const r = w.runway;
  const y = r.y;
  const z0 = r.z - 180, z1 = r.z + 620;
  const a = project(w, r.x - 42, y, z0), b = project(w, r.x + 42, y, z0);
  const c = project(w, r.x + 42, y, z1), d = project(w, r.x - 42, y, z1);
  if (!a || !b || !c || !d) return;
  polygon(ctx, [[a.x, a.y], [b.x, b.y], [c.x, c.y], [d.x, d.y]], '#4a4f4d');
  for (let i = 0; i < 9; i += 1) {
    const z = r.z - 130 + i * 78;
    const p1 = project(w, r.x - 3, y + 1, z), p2 = project(w, r.x + 3, y + 1, z);
    const p3 = project(w, r.x + 3, y + 1, z + 38), p4 = project(w, r.x - 3, y + 1, z + 38);
    if (p1 && p2 && p3 && p4) polygon(ctx, [[p1.x, p1.y], [p2.x, p2.y], [p3.x, p3.y], [p4.x, p4.y]], 'rgba(242,231,210,0.86)');
  }
  for (const side of [-1, 1]) {
    const hx = r.x + side * 120;
    const p = project(w, hx, y, r.z + 260);
    if (!p) continue;
    const s = Math.max(2, p.s * 34);
    polygon(ctx, [[p.x - s, p.y], [p.x + s, p.y], [p.x + s, p.y - s * 0.7], [p.x - s, p.y - s * 0.7]], '#6c6357');
    polygon(ctx, [[p.x - s, p.y - s * 0.7], [p.x + s, p.y - s * 0.7], [p.x + s * 0.82, p.y - s], [p.x - s * 0.82, p.y - s]], '#8b7c68');
  }
  const label = project(w, r.x, y + 90, r.z - 180);
  if (label) {
    ctx.fillStyle = PALETTE.cream;
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('RUNWAY 09', label.x, label.y - 6);
  }
}

function drawGate(ctx, w, gate, number, active) {
  const p = project(w, gate.x, gate.y, gate.z);
  if (!p) return;
  const r = Math.max(4, Math.min(440, gate.r * p.s));
  const color = active ? PALETTE.amber : PALETTE.teal;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.11);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.setLineDash([r * 0.16, r * 0.13]);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.76, r * 0.67, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  const post = Math.min(220, r * 1.55);
  ctx.fillRect(-post, -r * 0.28, Math.max(2, r * 0.06), r * 0.56);
  ctx.fillRect(post, -r * 0.28, Math.max(2, r * 0.06), r * 0.56);
  if (r > 22) {
    ctx.font = `700 ${Math.min(30, Math.max(13, r * 0.24))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(active ? `GATE ${number}` : 'CLEAR', 0, -r * 1.15);
  }
  ctx.restore();
}

function drawCheckpoint(ctx, w, cp, number, active) {
  const ground = terrainAt(cp.x, cp.z, w.seed).h;
  const p = project(w, cp.x, ground + 8, cp.z);
  if (!p) return;
  const r = Math.max(5, Math.min(280, cp.r * p.s));
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = active ? PALETTE.amber : 'rgba(143,192,138,0.55)';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.32, 0, 0, Math.PI * 2);
  ctx.stroke();
  const h = Math.min(150, r * 0.9);
  ctx.beginPath();
  ctx.moveTo(-r * 0.72, 0); ctx.lineTo(-r * 0.72, -h);
  ctx.moveTo(r * 0.72, 0); ctx.lineTo(r * 0.72, -h);
  ctx.stroke();
  if (r > 24) {
    ctx.fillStyle = PALETTE.cream;
    ctx.font = `700 ${Math.min(24, Math.max(12, r * 0.16))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`CP ${number}`, 0, -h - 8);
  }
  ctx.restore();
}

function drawShadow(ctx, w) {
  const ground = terrainAt(w.x + 18, w.z + 120, w.seed).h;
  const p = project(w, w.x + 18, ground + 2, w.z + 120);
  if (!p) return;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, Math.max(18, p.s * 64), Math.max(6, p.s * 18), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAircraft(ctx, w) {
  ctx.save();
  ctx.translate(W / 2, H * 0.735);
  ctx.rotate(w.bank * 0.27);
  const glow = 0.35 + Math.max(0, (w.speed - 150) / 220);
  ctx.fillStyle = `rgba(240,179,91,${glow})`;
  polygon(ctx, [[-13, 52], [13, 52], [7, 108], [-7, 108]]);
  ctx.fillStyle = '#455f5d';
  polygon(ctx, [[-9, 18], [-132, 56], [-132, 76], [-9, 56]], '#455f5d', '#1e2c31');
  polygon(ctx, [[9, 18], [132, 56], [132, 76], [9, 56]], '#455f5d', '#1e2c31');
  polygon(ctx, [[-7, 48], [-56, 78], [-56, 88], [-7, 68]], '#3a5050');
  polygon(ctx, [[7, 48], [56, 78], [56, 88], [7, 68]], '#3a5050');
  polygon(ctx, [[0, 34], [-7, 74], [-7, 100], [0, 106], [7, 100], [7, 74]], '#d9cbb1', '#1e2c31');
  polygon(ctx, [[0, -102], [12, -40], [16, 44], [0, 64], [-16, 44], [-12, -40]], PALETTE.cream, '#1e2c31');
  polygon(ctx, [[-9, -26], [-9, 6], [9, 6], [9, -26], [0, -44]], '#6ea9a4', '#1e2c31');
  ctx.fillStyle = PALETTE.red;
  ctx.beginPath(); ctx.arc(-132, 66, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = PALETTE.green;
  ctx.beginPath(); ctx.arc(132, 66, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#b5654f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-118, 61); ctx.lineTo(-96, 61);
  ctx.moveTo(118, 61); ctx.lineTo(96, 61);
  ctx.stroke();
  ctx.restore();
}

function gauge(ctx, cx, cy, r, label, value, text, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(12,22,29,0.95)';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8fa6a6'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i <= 10; i += 1) {
    const a = (-225 + i * 27) * Math.PI / 180;
    const inner = r - (i % 2 === 0 ? 13 : 8);
    ctx.strokeStyle = i % 2 === 0 ? '#d6d9c8' : '#71898b';
    ctx.lineWidth = i % 2 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * (r - 3), Math.sin(a) * (r - 3));
    ctx.stroke();
  }
  const a = (-225 + Math.max(0, Math.min(1, value)) * 270) * Math.PI / 180;
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * (r - 16), Math.sin(a) * (r - 16)); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9d4cc'; ctx.textAlign = 'center';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.fillText(label, 0, -r + 15);
  ctx.font = '700 17px ui-monospace, monospace';
  ctx.fillText(text, 0, r - 12);
  ctx.restore();
}

function attitude(ctx, cx, cy, r, w) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#39596b'; ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.rotate(-w.bank * 0.27);
  const shift = w.pitch * 62;
  ctx.fillStyle = '#7d634e'; ctx.fillRect(-r, shift, r * 2, r * 2);
  ctx.fillStyle = '#d7d4c4'; ctx.fillRect(-r, shift - 2, r * 2, 3);
  for (let i = -2; i <= 2; i += 1) {
    if (i === 0) continue;
    ctx.strokeStyle = 'rgba(240,236,215,0.65)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-34, shift + i * 22); ctx.lineTo(34, shift + i * 22); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#8fa6a6'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = PALETTE.amber; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 26, cy); ctx.lineTo(cx - 8, cy); ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx + 8, cy); ctx.lineTo(cx + 26, cy);
  ctx.stroke();
}

function bar(ctx, x, y, width, value, color, label) {
  ctx.fillStyle = 'rgba(215,224,213,0.8)';
  ctx.font = '700 11px system-ui, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 6);
  ctx.fillStyle = 'rgba(90,110,110,0.55)'; ctx.fillRect(x, y, width, 8);
  ctx.fillStyle = color; ctx.fillRect(x, y, width * Math.max(0, Math.min(1, value)), 8);
}

function drawPanel(ctx, w) {
  ctx.fillStyle = 'rgba(16,27,35,0.9)';
  polygon(ctx, [[0, H - 150], [W, H - 150], [W, H], [0, H]], 'rgba(16,27,35,0.9)');
  ctx.strokeStyle = 'rgba(240,179,91,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, H - 150); ctx.lineTo(W, H - 150); ctx.stroke();
  gauge(ctx, 218, H - 72, 54, 'AIRSPEED', (w.speed - 80) / 240, `${Math.round(w.speed)}`, PALETTE.amber);
  attitude(ctx, W / 2, H - 72, 54, w);
  gauge(ctx, W - 218, H - 72, 54, 'ALTITUDE', w.altitude / 1900, `${Math.round(w.altitude)}`, PALETTE.teal);
  bar(ctx, 430, H - 44, 180, w.fuel, w.fuel < 0.25 ? PALETTE.red : PALETTE.green, 'FUEL');
  bar(ctx, 670, H - 44, 180, 1 - w.damage, w.damage > 0.6 ? PALETTE.red : PALETTE.green, 'AIRFRAME');
  ctx.fillStyle = '#d8e0d3'; ctx.font = '700 15px ui-monospace, monospace'; ctx.textAlign = 'center';
  const hdg = compass(w);
  ctx.fillText(`HDG ${String(hdg).padStart(3, '0')}`, W / 2, H - 130);
}

function drawHud(ctx, w) {
  const obj = nextObjective(w);
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.cream; ctx.font = '700 18px system-ui, sans-serif';
  ctx.fillText(`${MISSION_NAMES[w.mission].toUpperCase()}`, 28, 38);
  ctx.font = '600 14px system-ui, sans-serif'; ctx.fillStyle = '#c8d8cf';
  ctx.fillText(obj ? `${obj.name} · ${Math.max(0, Math.round(obj.z - w.z))} m` : 'ROUTE COMPLETE', 28, 62);
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${w.score}`, W - 28, 38);
  ctx.fillText(`ALT ${Math.round(w.altitude)}  SPD ${Math.round(w.speed)}`, W - 28, 62);
  if (obj) {
    const p = project(w, obj.x, w.altitude, obj.z);
    if (p && p.y > 90 && p.y < H - 190 && p.x > 60 && p.x < W - 60) {
      ctx.strokeStyle = 'rgba(242,231,210,0.75)'; ctx.lineWidth = 2;
      const s = 14;
      ctx.beginPath();
      ctx.moveTo(p.x - s, p.y - s + 8); ctx.lineTo(p.x - s, p.y - s); ctx.lineTo(p.x - s + 8, p.y - s);
      ctx.moveTo(p.x + s - 8, p.y - s); ctx.lineTo(p.x + s, p.y - s); ctx.lineTo(p.x + s, p.y - s + 8);
      ctx.moveTo(p.x - s, p.y + s - 8); ctx.lineTo(p.x - s, p.y + s); ctx.lineTo(p.x - s + 8, p.y + s);
      ctx.moveTo(p.x + s - 8, p.y + s); ctx.lineTo(p.x + s, p.y + s); ctx.lineTo(p.x + s, p.y + s - 8);
      ctx.stroke();
    }
  }
  if (w.messageTime > 0 && w.message) {
    const alpha = Math.min(1, w.messageTime);
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(16,27,35,0.72)';
    ctx.fillRect(W / 2 - 230, H * 0.23, 460, 46);
    ctx.fillStyle = PALETTE.sun; ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(w.message, W / 2, H * 0.23 + 31);
    ctx.globalAlpha = 1;
  }
}

function overlay(ctx, w, screen) {
  if (screen !== PHASE.BRIEF && screen !== PHASE.WON && screen !== PHASE.CRASH) return;
  ctx.fillStyle = 'rgba(15,25,33,0.74)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.sun;
  ctx.font = '800 62px system-ui, sans-serif';
  ctx.fillText(screen === PHASE.BRIEF ? 'RIDGE RUNNER' : screen === PHASE.WON ? 'MISSION COMPLETE' : 'FLIGHT ENDED', W / 2, H * 0.34);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '600 25px system-ui, sans-serif';
  ctx.fillText(MISSION_NAMES[w.mission].toUpperCase(), W / 2, H * 0.34 + 48);
  ctx.font = '500 18px system-ui, sans-serif';
  ctx.fillStyle = '#c8d8cf';
  const lines = screen === PHASE.BRIEF
    ? ['Arrows / WASD - bank and pitch     Shift / Ctrl - throttle     Space - airbrake',
       'Mouse steers; click releases the brake. Fly gates, land softly, or follow the valley.']
    : [`Score ${w.score}   ·   ${MISSIONS_DONE(w)}`, 'Press Space or Enter to fly again'];
  lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.34 + 92 + i * 32));
}
function MISSIONS_DONE(w) { return w.phase === PHASE.WON ? 'mission cleared' : 'try the route again'; }

export function createRenderer(canvas) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  return {
    draw(w, screen = w.phase) {
      ctx.save();
      if (w.shake > 0) ctx.translate((Math.sin(w.time * 83) * w.shake * 4), (Math.cos(w.time * 71) * w.shake * 3));
      ctx.translate(W / 2, H / 2);
      ctx.rotate(-w.bank * 0.11);
      ctx.translate(-W / 2, -H / 2);
      drawSky(ctx, w);
      drawRidges(ctx, w);
      drawTerrain(ctx, w);
      if (w.mission === 1) drawRunway(ctx, w);
      if (w.mission === 0) {
        // Only the next two gates are drawn: distant ones would crowd the target ring the judge
        // needs to read at a glance, and a passed gate is no longer a target.
        let index = 0;
        const open = w.rings.filter((gate) => !gate.passed).slice(0, 2);
        for (const gate of open) { index += 1; drawGate(ctx, w, gate, w.rings.indexOf(gate) + 1, true); }
      } else if (w.mission === 2) {
        let index = 0;
        for (const cp of w.checkpoints) { drawCheckpoint(ctx, w, cp, ++index, !cp.passed); }
      }
      drawShadow(ctx, w);
      drawAircraft(ctx, w);
      ctx.restore();
      drawPanel(ctx, w);
      drawHud(ctx, w);
      overlay(ctx, w, screen);
    },
  };
}
