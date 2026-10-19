import { CONFIG } from './config.js';

function nearest(body, state) {
  let pellet = null;
  let pelletDist = 1e9;
  const food = state.pellets;
  for (let i = 0; i < food.length; i += 1) {
    const item = food[i];
    const dist = Math.hypot(item.x - body.x, item.y - body.y);
    if (dist < pelletDist) {
      pelletDist = dist;
      pellet = item;
    }
  }

  let enemy = null;
  let enemyDist = 1e9;
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) {
    const other = bodies[i];
    if (other === body || !other.alive) continue;
    const dist = Math.hypot(other.x - body.x, other.y - body.y);
    if (dist < enemyDist) {
      enemyDist = dist;
      enemy = other;
    }
  }

  if (body.level < 3 && pellet && pelletDist <= enemyDist) {
    const dist = pelletDist || 1;
    return {
      x: (pellet.x - body.x) / dist,
      y: (pellet.y - body.y) / dist,
      dist: pelletDist,
      kind: 'pellet',
    };
  }
  if (!enemy) return null;
  const dist = enemyDist || 1;
  return {
    x: (enemy.x - body.x) / dist,
    y: (enemy.y - body.y) / dist,
    dist: enemyDist,
    kind: 'enemy',
  };
}

/** 朝最近的果冻块或敌人走，靠近敌人时随机蓄力。 */
export function steerAi(body, state, dt) {
  if (!body.ai) return;
  if (!body.alive) {
    body.drive.x = 0;
    body.drive.y = 0;
    body.wantCharge = false;
    body.chargeHold = 0;
    return;
  }

  const pick = nearest(body, state);
  if (pick) {
    body.drive.x = pick.x;
    body.drive.y = pick.y;
    body.aimX = pick.x;
    body.aimY = pick.y;
  } else {
    body.drive.x = 0;
    body.drive.y = 0;
  }

  if (body.chargeHold > 0) {
    body.chargeHold -= dt;
    body.wantCharge = body.chargeHold > 0;
    return;
  }
  body.wantCharge = false;
  body.think -= dt;
  if (body.think > 0 || !pick || pick.kind !== 'enemy') return;
  body.think = CONFIG.ai.thinkEvery;
  if (pick.dist > CONFIG.ai.chargeRange) return;
  if (body.cooldown > 0 || body.dashTime > 0 || body.charging) return;
  if (state.rng() >= CONFIG.ai.chargeChance) return;
  const span = CONFIG.ai.holdMax - CONFIG.ai.holdMin;
  body.chargeHold = CONFIG.ai.holdMin + state.rng() * span;
  body.wantCharge = true;
}
