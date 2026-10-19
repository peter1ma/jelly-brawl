import { CONFIG } from './config.js';
import { buzz, cue, emit, tickParticles } from './fx.js';

export function syncStats(body) {
  const stats = CONFIG.jelly.levels[body.level - 1];
  body.speed = stats.speed;
  body.mass = stats.mass;
  body.radius = stats.radius;
  body.knock = stats.knock;
  body.resist = stats.resist;
}

function burst(state, x, y, up) {
  emit(state, x, y, up ? '#FFE08A' : '#FF5A7A', CONFIG.pellets.burst);
}

function setLevel(state, body, level, up) {
  body.level = level;
  syncStats(body);
  body.pulse = CONFIG.pellets.growAnim;
  body.flash = CONFIG.pellets.flash;
  body.flashUp = up;
  burst(state, body.x, body.y, up);
}

function pointOnPlatform(state) {
  const platform = state.platform;
  const margin = CONFIG.pellets.radius + 28;
  for (let i = 0; i < 8; i += 1) {
    const angle = state.rng() * Math.PI * 2;
    const radius = Math.sqrt(state.rng()) * Math.max(0, platform.radius - margin);
    const x = platform.x + Math.cos(angle) * radius;
    const y = platform.y + Math.sin(angle) * radius;
    let clear = true;
    const bodies = state.jellies;
    for (let j = 0; j < bodies.length; j += 1) {
      const body = bodies[j];
      if (!body.alive) continue;
      const dx = body.x - x;
      const dy = body.y - y;
      if (dx * dx + dy * dy < (body.radius + 24) * (body.radius + 24)) clear = false;
    }
    if (clear) return { x, y };
  }
  return { x: platform.x, y: platform.y };
}

export function spawnPellet(state, x, y, grace) {
  const pellets = state.pellets;
  if (pellets.length >= CONFIG.pellets.maxCount) pellets.shift();
  pellets.push({ x, y, grace });
}

export function scatterPellet(state) {
  const point = pointOnPlatform(state);
  spawnPellet(state, point.x, point.y, 0);
}

function dropPellet(state, body) {
  const angle = state.rng() * Math.PI * 2;
  const dist = body.radius + CONFIG.pellets.radius + 16;
  spawnPellet(
    state,
    body.x + Math.cos(angle) * dist,
    body.y + Math.sin(angle) * dist,
    CONFIG.pellets.grace,
  );
}

function tickPellets(state, dt) {
  const pellets = state.pellets;
  for (let i = pellets.length - 1; i >= 0; i -= 1) {
    const pellet = pellets[i];
    if (pellet.grace > 0) {
      pellet.grace -= dt;
      continue;
    }
    const bodies = state.jellies;
    for (let j = 0; j < bodies.length; j += 1) {
      const body = bodies[j];
      if (!body.alive) continue;
      const dx = body.x - pellet.x;
      const dy = body.y - pellet.y;
      const reach = body.radius + CONFIG.pellets.radius;
      if (dx * dx + dy * dy > reach * reach) continue;
      pellets[i] = pellets[pellets.length - 1];
      pellets.pop();
      body.eaten = (body.eaten || 0) + 1;
      cue(state, 'eat');
      if (body.level < 3) setLevel(state, body, body.level + 1, true);
      else burst(state, body.x, body.y, true);
      break;
    }
  }

  state.pelletAcc += dt;
  while (state.pelletAcc >= CONFIG.pellets.every && pellets.length < CONFIG.pellets.maxCount) {
    state.pelletAcc -= CONFIG.pellets.every;
    const point = pointOnPlatform(state);
    pellets.push({ x: point.x, y: point.y, grace: 0 });
  }
}

/** 吃块升级、重击降级、粒子寿命。 */
export function tickGrowth(state, dt) {
  tickParticles(state, dt);

  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    if (body.pulse > 0) body.pulse -= dt;
    if (body.flash > 0) body.flash -= dt;
    if (body.dizzy > 0) body.dizzy -= dt;
    if (body.hurtLock > 0) body.hurtLock -= dt;
    if (!body.alive || body.hurtLock > 0 || body.shield > 0) continue;
    if (body.hitImpulse < CONFIG.combat.demoteImpulse) continue;
    body.hurtLock = CONFIG.combat.hurtLock;
    body.dizzy = 0.45;
    state.slowmo = CONFIG.combat.slowmoSeconds;
    buzz();
    cue(state, 'hit');
    if (body.level <= 1) continue;
    setLevel(state, body, body.level - 1, false);
    dropPellet(state, body);
  }

  tickPellets(state, dt);
}
