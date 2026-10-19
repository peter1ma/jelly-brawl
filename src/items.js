import { CONFIG } from './config.js';
import { cue } from './fx.js';

const KINDS = ['spring', 'shield', 'magnet', 'smoke'];

/** 这一点能不能站人：在台面上，也不在已经塌掉的扇形里。 */
export function onStand(state, x, y) {
  const platform = state.platform;
  const dx = x - platform.x;
  const dy = y - platform.y;
  const dist2 = dx * dx + dy * dy;
  if (dist2 > platform.radius * platform.radius) return false;
  const holes = state.holes;
  if (!holes || !holes.length || dist2 < 144) return dist2 <= platform.radius * platform.radius;
  let angle = Math.atan2(dy, dx) - (state.spin || 0);
  for (let i = 0; i < holes.length; i += 1) {
    let delta = angle - holes[i].angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) <= holes[i].half && dist2 >= 144) return false;
  }
  return true;
}

function landPoint(state) {
  const platform = state.platform;
  const margin = CONFIG.items.radius + 30;
  for (let i = 0; i < 8; i += 1) {
    const angle = state.rng() * Math.PI * 2;
    const radius = Math.sqrt(state.rng()) * Math.max(0, platform.radius - margin);
    const x = platform.x + Math.cos(angle) * radius;
    const y = platform.y + Math.sin(angle) * radius;
    if (onStand(state, x, y)) return { x, y };
  }
  return { x: platform.x, y: platform.y };
}

function give(state, body, kind) {
  body.item = null;
  cue(state, 'eat');
  if (kind === 'spring') {
    body.item = 'spring';
    return;
  }
  if (kind === 'shield') body.shield = CONFIG.items.shield.duration;
  else if (kind === 'magnet') body.magnet = CONFIG.items.magnet.duration;
  else if (kind === 'smoke') {
    state.smokes.push({ x: body.x, y: body.y, life: CONFIG.items.smoke.duration });
  }
  cue(state, 'eat');
}

function pullPellets(state, body, dt) {
  const reach = CONFIG.items.magnet.radius;
  const pull = CONFIG.items.magnet.pull;
  const pellets = state.pellets;
  for (let i = 0; i < pellets.length; i += 1) {
    const pellet = pellets[i];
    const dx = body.x - pellet.x;
    const dy = body.y - pellet.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1 || dist > reach) continue;
    pellet.x += (dx / dist) * pull * dt;
    pellet.y += (dy / dist) * pull * dt;
  }
}

/** 掉糖果、拾取、护盾和磁铁计时。 */
export function tickItems(state, dt) {
  const candies = state.candies;
  const bodies = state.jellies;
  for (let i = candies.length - 1; i >= 0; i -= 1) {
    const candy = candies[i];
    if (candy.t < 1) candy.t = Math.min(1, candy.t + dt / CONFIG.items.fallSeconds);
    if (candy.t < 1) continue;
    for (let j = 0; j < bodies.length; j += 1) {
      const body = bodies[j];
      if (!body.alive) continue;
      const reach = body.radius + CONFIG.items.radius;
      const dx = body.x - candy.x;
      const dy = body.y - candy.y;
      if (dx * dx + dy * dy > reach * reach) continue;
      candies[i] = candies[candies.length - 1];
      candies.pop();
      give(state, body, candy.kind);
      break;
    }
  }

  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    if (body.shield > 0) body.shield = Math.max(0, body.shield - dt);
    if (body.magnet > 0) {
      body.magnet = Math.max(0, body.magnet - dt);
      if (body.alive) pullPellets(state, body, dt);
    }
  }

  const smokes = state.smokes;
  for (let i = smokes.length - 1; i >= 0; i -= 1) {
    smokes[i].life -= dt;
    if (smokes[i].life <= 0) {
      smokes[i] = smokes[smokes.length - 1];
      smokes.pop();
    }
  }

  state.itemAcc += dt;
  if (state.itemAcc < CONFIG.items.every) return;
  state.itemAcc -= CONFIG.items.every;
  if (candies.length >= CONFIG.items.maxOnField) return;
  const point = landPoint(state);
  const kind = KINDS[Math.floor(state.rng() * KINDS.length)];
  candies.push({ x: point.x, y: point.y, kind, t: 0 });
}

export function inSmoke(state, x, y) {
  const smokes = state.smokes || [];
  const radius = CONFIG.items.smoke.radius;
  for (let i = 0; i < smokes.length; i += 1) {
    const smoke = smokes[i];
    const dx = smoke.x - x;
    const dy = smoke.y - y;
    if (dx * dx + dy * dy <= radius * radius) return true;
  }
  return false;
}
