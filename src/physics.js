import { CONFIG } from './config.js';
import { cue, emit } from './fx.js';

/** 持摇杆时的加速度，使终端速度刚好等于体型移速。 */
export function moveAccel(speed) {
  const dt = 1 / CONFIG.physics.hz;
  const retain = Math.exp(-CONFIG.physics.friction * dt);
  return speed * (1 - retain) / dt;
}

function dampen(body, dt, scale) {
  const retain = Math.exp(-CONFIG.physics.friction * scale * dt);
  body.vx *= retain;
  body.vy *= retain;
}

function clampSpeed(body) {
  const speed = Math.hypot(body.vx, body.vy);
  const cap = CONFIG.physics.maxSpeed;
  if (speed > cap) {
    body.vx = (body.vx / speed) * cap;
    body.vy = (body.vy / speed) * cap;
  }
  return speed;
}

function integrate(body, dt, state) {
  body.prevX = body.x;
  body.prevY = body.y;
  if (!body.alive) {
    body.vx = 0;
    body.vy = 0;
    return;
  }
  // 冲刺这几帧保持速度，避免还没撞到人就被摩擦吃掉。
  if (body.dashTime <= 0) dampen(body, dt, state.frictionScale == null ? 1 : state.frictionScale);
  if (body.alive) {
    let scale = 1;
    if (body.charging) scale *= CONFIG.charge.moveScale;
    if (body.dashTime > 0) scale *= CONFIG.charge.dashSteer;
    const accel = moveAccel(body.speed) * scale;
    body.vx += body.drive.x * accel * dt;
    body.vy += body.drive.y * accel * dt;
  }
  const speed = clampSpeed(body);
  const driving = body.drive.x !== 0 || body.drive.y !== 0;
  if (!driving && body.dashTime <= 0 && speed < CONFIG.physics.sleepSpeed) {
    body.vx = 0;
    body.vy = 0;
  }
  body.x += body.vx * dt;
  body.y += body.vy * dt;
}

/** 冲刺命中只结算一次，击飞按质量比、撞击力和抗击飞放大。 */
function dashKnock(attacker, defender, nx, ny, state, approach) {
  if (attacker.pudding || defender.pudding) return;
  if (attacker.dashTime <= 0 || attacker.dashHit) return;
  if (approach < 40) return;
  attacker.dashHit = true;
  attacker.hits = (attacker.hits || 0) + 1;
  if (defender.shield > 0) return;
  const massRatio = attacker.mass / defender.mass;
  let kick = attacker.dashSpeed * massRatio * (attacker.knock / defender.resist) * CONFIG.charge.hitScale;
  if (attacker.item === 'spring') {
    kick *= CONFIG.items.spring.knockMul;
    attacker.item = null;
  }
  defender.vx += nx * kick;
  defender.vy += ny * kick;
  defender.hitImpulse += kick * defender.mass;
  const back = kick * (defender.mass / attacker.mass) * CONFIG.charge.recoil;
  attacker.vx -= nx * back;
  attacker.vy -= ny * back;
  clampSpeed(attacker);
  clampSpeed(defender);
  state.hitstop = Math.max(state.hitstop, CONFIG.combat.hitstop);
  state.shake = Math.max(state.shake, CONFIG.combat.shakeTime);
}

/** 圆与圆：沿法线交换动量，并用弹性系数反弹。 */
function collide(a, b, state) {
  let nx = b.x - a.x;
  let ny = b.y - a.y;
  let dist = Math.hypot(nx, ny);
  const minDist = a.radius + b.radius;
  if (dist >= minDist) return;
  if (dist < 0.0001) {
    nx = 1;
    ny = 0;
    dist = 0.0001;
  } else {
    nx /= dist;
    ny /= dist;
  }

  const relN = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  const approachA = a.vx * nx + a.vy * ny;
  const approachB = -(b.vx * nx + b.vy * ny);
  const invA = 1 / a.mass;
  const invB = 1 / b.mass;
  const soft = a.pudding || b.pudding;
  if (relN < 0) {
    const impulse = -(1 + CONFIG.physics.restitution) * relN / (invA + invB);
    a.vx -= impulse * invA * nx;
    a.vy -= impulse * invA * ny;
    b.vx += impulse * invB * nx;
    b.vy += impulse * invB * ny;
    if (!soft) {
      const taken = Math.abs(impulse);
      if (approachA >= approachB) b.hitImpulse += taken;
      else a.hitImpulse += taken;
      a.lastHitBy = b.id;
      b.lastHitBy = a.id;
      a.lastHitTime = state.time || 0;
      b.lastHitTime = state.time || 0;
    }
  }

  dashKnock(a, b, nx, ny, state, approachA);
  dashKnock(b, a, -nx, -ny, state, approachB);

  const penetration = minDist - dist;
  const correct = Math.max(penetration - CONFIG.physics.slop, 0);
  const push = (correct / (invA + invB)) * CONFIG.physics.correction;
  a.x -= nx * push * invA;
  a.y -= ny * push * invA;
  b.x += nx * push * invB;
  b.y += ny * push * invB;
}

function fall(body, state) {
  body.alive = false;
  if (body.outTime == null) body.outTime = state.time || 0;
  body.ghostCd = 0;
  const since = (state.time || 0) - (body.lastHitTime == null ? -999 : body.lastHitTime);
  const attacker = since <= CONFIG.combat.lastHitWindow ? findId(state, body.lastHitBy) : null;
  if (attacker && attacker !== body) attacker.kos = (attacker.kos || 0) + 1;
  else body.selfOut = (body.selfOut || 0) + 1;
  emit(state, body.x, body.y, '#FF8FB3', 16);
  cue(state, 'out');
}

function findId(state, id) {
  if (!id) return null;
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) if (bodies[i].id === id) return bodies[i];
  return null;
}

function inHole(dx, dy, state) {
  const holes = state.holes;
  if (!holes || !holes.length) return false;
  const dist2 = dx * dx + dy * dy;
  if (dist2 < 144 || dist2 > state.platform.radius * state.platform.radius) return false;
  let angle = Math.atan2(dy, dx) - (state.spin || 0);
  for (let i = 0; i < holes.length; i += 1) {
    let delta = angle - holes[i].angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    if (Math.abs(delta) <= holes[i].half) return true;
  }
  return false;
}

function eliminate(body, state) {
  if (!body.alive) return;
  const platform = state.platform;
  const dx = body.x - platform.x;
  const dy = body.y - platform.y;
  const limit = platform.radius + CONFIG.jelly.eliminateMargin;
  if (dx * dx + dy * dy > limit * limit || inHole(dx, dy, state)) fall(body, state);
}

/** 固定步长推进一帧。平台半径读 state.platform.radius。 */
export function step(state, dt) {
  const bodies = state.jellies;
  const puddings = state.puddings || [];
  for (let i = 0; i < bodies.length; i += 1) bodies[i].hitImpulse = 0;
  for (let i = 0; i < bodies.length; i += 1) integrate(bodies[i], dt, state);
  for (let i = 0; i < puddings.length; i += 1) integrate(puddings[i], dt, state);
  for (let i = 0; i < bodies.length; i += 1) {
    if (!bodies[i].alive) continue;
    for (let j = i + 1; j < bodies.length; j += 1) {
      if (!bodies[j].alive) continue;
      collide(bodies[i], bodies[j], state);
    }
    for (let j = 0; j < puddings.length; j += 1) collide(bodies[i], puddings[j], state);
  }
  for (let i = 0; i < bodies.length; i += 1) eliminate(bodies[i], state);
}
