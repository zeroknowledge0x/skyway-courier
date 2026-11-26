// Keyboard and mouse controls. Holding a key gives a continuous input; the mouse steers toward
// the cursor like a stick, and the left button works the airbrake. Space/Enter launches and restarts.
export const ACTION_NONE = 0;
export const ACTION_CONFIRM = 1;
const KEYS = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ShiftLeft: 'fast', ShiftRight: 'fast', ControlLeft: 'slow', ControlRight: 'slow',
  Space: 'brake',
};

export function createInput(canvas) {
  const held = new Set();
  let confirm = false;
  let mouseX = 0.5, mouseY = 0.5, mouseBrake = false, mouseUsed = false;

  function onKey(event, down) {
    if (event.code === 'Space' || event.code === 'Enter' || event.code.startsWith('Arrow')) event.preventDefault();
    if (down && (event.code === 'Space' || event.code === 'Enter')) confirm = true;
    const action = KEYS[event.code];
    if (action) { if (down) held.add(action); else held.delete(action); }
  }
  const keyDown = (e) => onKey(e, true);
  const keyUp = (e) => onKey(e, false);
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    mouseX = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    mouseY = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    mouseUsed = true;
  }
  function onDown(e) { if (e.button === 0) { if (!confirm) confirm = true; mouseBrake = true; } }
  function onUp(e) { if (e.button === 0) mouseBrake = false; }
  function onLeave() { mouseBrake = false; }
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mousedown', onDown);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('mouseleave', onLeave);

  return {
    read() {
      let roll = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
      let pitch = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
      if (mouseUsed) {
        roll += (mouseX - 0.5) * 2.2;
        pitch += (mouseY - 0.5) * 1.7;
      }
      return {
        roll: Math.max(-1, Math.min(1, roll)),
        pitch: Math.max(-1, Math.min(1, pitch)),
        throttle: (held.has('fast') ? 1 : 0) - (held.has('slow') ? 1 : 0),
        brake: held.has('brake') || mouseBrake,
      };
    },
    takeConfirm() { const value = confirm; confirm = false; return value; },
    dispose() {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onLeave);
    },
  };
}
