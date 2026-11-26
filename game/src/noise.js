// Deterministic, seedable value noise. The same seed gives the same valley, so a screenshot and
// a live sortie flown from that seed show exactly the same ground.
function hash(ix, iz, seed) {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }

export function valueNoise(x, z, seed = 7) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash(ix, iz, seed), b = hash(ix + 1, iz, seed);
  const c = hash(ix, iz + 1, seed), d = hash(ix + 1, iz + 1, seed);
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}
export function ridgedNoise(x, z, seed = 7) {
  const n = valueNoise(x, z, seed);
  return 1 - Math.abs(n * 2 - 1);
}
export function valleyCenter(z) {
  return Math.sin(z / 540) * 205 + Math.sin(z / 1310 + 1.2) * 135;
}
export function riverCenter(z) { return valleyCenter(z) - 46; }

// The world is a river valley between two ridgelines. Height drives the terrain colours; distance
// from the valley drives the mountains, so the plane always has a clear corridor to fly through.
export function terrainAt(x, z, seed = 7) {
  const center = valleyCenter(z);
  const off = Math.abs(x - center);
  const rough = valueNoise(x / 250, z / 250, seed) - 0.5;
  const ridge = ridgedNoise(x / 190, z / 230, seed + 11);
  const wall = Math.pow(Math.max(0, (off - 175) / 400), 1.55) * 540 * (0.6 + 0.6 * ridge);
  const river = Math.exp(-Math.pow((x - riverCenter(z)) / 52, 2));
  const h = rough * 62 - 34 + wall - river * 78;
  return { h, off, river, center };
}

function mix(a, b, t) {
  const ar = parseInt(a.slice(1, 3), 16), ag = parseInt(a.slice(3, 5), 16), ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16), bg = parseInt(b.slice(3, 5), 16), bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}
export function terrainColor(cell, x, z, haze, colors) {
  let base;
  if (cell.river > 0.42 || cell.h < -70) base = colors.water;
  else if (cell.h < 22) base = colors.sand;
  else if (cell.h < 150) {
    const patch = (Math.floor(x / 110) + Math.floor(z / 110)) % 5 === 0;
    base = patch ? colors.farmland : colors.grass;
  } else if (cell.h < 320) base = colors.forest;
  else if (cell.h < 520) base = colors.rock;
  else base = colors.snow;
  const shade = cell.off > 430 ? 0.08 : 0;
  return mix(base, colors.ink, shade + (1 - haze) * 0.04);
}
