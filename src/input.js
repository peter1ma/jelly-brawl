import { CONFIG } from './config.js';

const { width: W } = CONFIG.view;
const keys = new Set();
const KEY_LEFT = new Set(['ArrowLeft', 'KeyA']);
const KEY_RIGHT = new Set(['ArrowRight', 'KeyD']);
const KEY_UP = new Set(['ArrowUp', 'KeyW']);
const KEY_DOWN = new Set(['ArrowDown', 'KeyS']);
const HELD = new Set([...KEY_LEFT, ...KEY_RIGHT, ...KEY_UP, ...KEY_DOWN]);

const joystick = {
  active: false,
  pointerId: null,
  cx: 0,
  cy: 0,
  kx: 0,
  ky: 0,
  x: 0,
  y: 0,
};

const charge = { held: false, pointerId: null };
const chargeView = { cx: 0, cy: 0, r: 0, held: false };
const move = { x: 0, y: 0 };

function typing() {
  const el = document.activeElement;
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

/** 屏幕坐标换成 1280×720 逻辑坐标。页面被转成横屏时也按画布自己的方向算。 */
export function clientToLogical(canvas, clientX, clientY) {
  const matrix = canvas.getScreenCTM();
  const width = canvas.clientWidth || 1;
  const height = canvas.clientHeight || 1;
  if (matrix) {
    const local = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return {
      x: (local.x / width) * CONFIG.view.width,
      y: (local.y / height) * CONFIG.view.height,
    };
  }
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * CONFIG.view.width,
    y: ((clientY - rect.top) / rect.height) * CONFIG.view.height,
  };
}

/** 「冲」按钮圆心。直径至少 120 CSS 像素，方便拇指。 */
export function layoutCharge(canvas) {
  const scale = canvas.clientWidth > 0 ? canvas.clientWidth / CONFIG.view.width : 1;
  const size = Math.min(260, Math.max(CONFIG.input.chargeButton, 120 / scale));
  const margin = 32;
  chargeView.r = size / 2;
  chargeView.cx = CONFIG.view.width - margin - chargeView.r;
  chargeView.cy = CONFIG.view.height - margin - chargeView.r;
  chargeView.held = charge.held;
  return chargeView;
}

function inChargeButton(canvas, point) {
  const button = layoutCharge(canvas);
  const dx = point.x - button.cx;
  const dy = point.y - button.cy;
  return dx * dx + dy * dy <= (button.r + 8) * (button.r + 8);
}

function syncCharge() {
  charge.held = charge.pointerId !== null || keys.has('Space');
}

function axis(negative, positive) {
  let neg = false;
  let pos = false;
  negative.forEach((code) => { if (keys.has(code)) neg = true; });
  positive.forEach((code) => { if (keys.has(code)) pos = true; });
  return (pos ? 1 : 0) - (neg ? 1 : 0);
}

function releaseJoystick() {
  joystick.active = false;
  joystick.pointerId = null;
  joystick.x = 0;
  joystick.y = 0;
}

function placeKnob(dx, dy) {
  const radius = CONFIG.input.joystickRadius;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) {
    joystick.kx = joystick.cx;
    joystick.ky = joystick.cy;
    joystick.x = 0;
    joystick.y = 0;
    return;
  }
  const clamped = Math.min(dist, radius);
  const nx = dx / dist;
  const ny = dy / dist;
  joystick.kx = joystick.cx + nx * clamped;
  joystick.ky = joystick.cy + ny * clamped;
  let mag = clamped / radius;
  const dead = CONFIG.input.deadzone;
  if (mag < dead) {
    joystick.x = 0;
    joystick.y = 0;
    return;
  }
  mag = (mag - dead) / (1 - dead);
  joystick.x = nx * mag;
  joystick.y = ny * mag;
}

/** 摇杆占一根手指，冲按钮占另一根，互不抢。 */
export function attachInput(canvas) {
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    const point = clientToLogical(canvas, event.clientX, event.clientY);
    if (charge.pointerId === null && inChargeButton(canvas, point)) {
      charge.pointerId = event.pointerId;
      syncCharge();
      try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* 手指已离开时忽略 */ }
      return;
    }
    if (joystick.active || point.x >= W / 2) return;
    joystick.active = true;
    joystick.pointerId = event.pointerId;
    joystick.cx = point.x;
    joystick.cy = point.y;
    placeKnob(0, 0);
    try { canvas.setPointerCapture(event.pointerId); } catch (err) { /* 手指已离开时忽略 */ }
  });

  window.addEventListener('pointermove', (event) => {
    if (!joystick.active || event.pointerId !== joystick.pointerId) return;
    const point = clientToLogical(canvas, event.clientX, event.clientY);
    placeKnob(point.x - joystick.cx, point.y - joystick.cy);
  });

  const endPointer = (event) => {
    if (event.pointerId === joystick.pointerId) releaseJoystick();
    if (event.pointerId === charge.pointerId) {
      charge.pointerId = null;
      syncCharge();
    }
  };
  window.addEventListener('pointerup', endPointer);
  window.addEventListener('pointercancel', endPointer);

  window.addEventListener('keydown', (event) => {
    if (typing()) return;
    if (event.code === 'Space') {
      keys.add('Space');
      syncCharge();
      event.preventDefault();
      return;
    }
    if (!HELD.has(event.code)) return;
    keys.add(event.code);
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'Space') syncCharge();
  });
  window.addEventListener('blur', () => {
    keys.clear();
    releaseJoystick();
    charge.pointerId = null;
    syncCharge();
  });
}

/** 重开时清掉按住的冲，避免一复活就蓄力。 */
export function cancelCharge() {
  charge.pointerId = null;
  keys.delete('Space');
  syncCharge();
}

export function getMove() {
  let x = joystick.x;
  let y = joystick.y;
  const kx = axis(KEY_LEFT, KEY_RIGHT);
  const ky = axis(KEY_UP, KEY_DOWN);
  const km = Math.hypot(kx, ky);
  if (km > 0) {
    x += kx / km;
    y += ky / km;
  }
  const mag = Math.hypot(x, y);
  if (mag > 1) {
    x /= mag;
    y /= mag;
  }
  move.x = x;
  move.y = y;
  return move;
}

export function getJoystick() {
  return joystick;
}

export function getCharge() {
  return charge;
}
