// Ridge Runner: every tuning number and colour lives here, so the flight model and the renderer
// never disagree about the size of the world. The logical screen is fixed at 1280x720 and the
// canvas is scaled to the window; the camera looks down the positive Z axis.
export const VIEW = { width: 1280, height: 720, horizon: 0.41 };
export const FOCAL = 660;
export const SPAN = VIEW.width / FOCAL;
export const STEP = 1 / 60;
export const TERRAIN = { rows: 46, cols: 26, near: 16, far: 2600 };
export const PLANE = {
  minSpeed: 88,
  maxSpeed: 310,
  cruiseSpeed: 178,
  maxAltitude: 1900,
  rollRate: 2.4,
  turnRate: 34,
  climbRate: 210,
};
export const PALETTE = {
  skyTop: '#253847',
  skyMid: '#688392',
  skyLow: '#d8b58e',
  sun: '#f6dfae',
  haze: '#b9a894',
  ridgeFar: '#7b8791',
  ridgeMid: '#66736e',
  ridgeNear: '#4c5a53',
  water: '#3e6570',
  sand: '#b9a075',
  grass: '#78885f',
  forest: '#4f6652',
  rock: '#867765',
  snow: '#cfc9b6',
  farmland: '#9c9168',
  ink: '#15202a',
  cream: '#f2e7d2',
  teal: '#5fb3a8',
  amber: '#f0b35b',
  red: '#dc6a5b',
  green: '#8fc08a',
};
export const MISSION_NAMES = ['Ridge Run', 'Final Approach', 'Canyon Courier'];
export const RING_COUNT = 5;
export const CHECKPOINT_COUNT = 6;
