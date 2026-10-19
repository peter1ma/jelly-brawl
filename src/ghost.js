import { CONFIG } from './config.js';
import { onStand } from './items.js';

export function makePudding(x, y) {
  const radius = CONFIG.ghost.puddingRadius;
  return {
    x,
    y,
    prevX: x,
    prevY: y,
    vx: 0,
    vy: 0,
    radius,
    mass: CONFIG.ghost.puddingMass,
    speed: 0,
    alive: true,
    pudding: true,
    drive: { x: 0, y: 0 },
    charging: false,
    dashTime: 0,
    hitImpulse: 0,
    life: CONFIG.ghost.puddingLife,
  };
}

/** 幽灵点在台面上就放一块布丁。成功后进入冷却。 */
export function tryPlace(state, body, x, y) {
  if (!body || body.alive || body.ghostCd > 0) return false;
  if (!onStand(state, x, y)) return false;
  state.puddings.push(makePudding(x, y));
  body.ghostCd = CONFIG.ghost.cooldown;
  body.puddings = (body.puddings || 0) + 1;
  return true;
}

function aiDrop(state, body) {
  if (body.ghostCd > 0) return;
  const platform = state.platform;
  let enemy = null;
  let best = 1e9;
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) {
    const other = bodies[i];
    if (other === body || !other.alive) continue;
    const dist = Math.hypot(other.x - body.x, other.y - body.y);
    if (dist < best) {
      best = dist;
      enemy = other;
    }
  }
  if (!enemy) return;
  const angle = Math.atan2(enemy.y - platform.y, enemy.x - platform.x);
  const dist = Math.min(platform.radius * 0.45, best * 0.45);
  tryPlace(state, body, platform.x + Math.cos(angle) * dist, platform.y + Math.sin(angle) * dist);
}

/** 幽灵冷却，以及布丁寿命到了或掉出台面就消失。 */
export function tickGhost(state, dt) {
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    if (body.alive) continue;
    if (body.ghostCd > 0) body.ghostCd -= dt;
    if (body.ai) aiDrop(state, body);
  }
  const puddings = state.puddings;
  const platform = state.platform;
  const limit = platform.radius + CONFIG.jelly.eliminateMargin;
  for (let i = puddings.length - 1; i >= 0; i -= 1) {
    const pud = puddings[i];
    pud.life -= dt;
    const dx = pud.x - platform.x;
    const dy = pud.y - platform.y;
    if (pud.life <= 0 || dx * dx + dy * dy > limit * limit) {
      puddings[i] = puddings[puddings.length - 1];
      puddings.pop();
    }
  }
}
