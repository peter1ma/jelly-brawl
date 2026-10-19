import { CONFIG } from './config.js';

const KINDS = ['rotate', 'collapse', 'ice', 'gravity'];

const TITLES = {
  rotate: '旋转平台',
  collapse: '塌方',
  ice: '冰面',
  gravity: '重力波',
};

function pickTimes(rng, count) {
  const cfg = CONFIG.events;
  const span = cfg.windowEnd - cfg.windowStart;
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const times = [];
    for (let i = 0; i < count; i += 1) times.push(cfg.windowStart + rng() * span);
    times.sort((a, b) => a - b);
    let spaced = true;
    for (let i = 1; i < times.length; i += 1) {
      if (times[i] - times[i - 1] < cfg.minGap) spaced = false;
    }
    if (spaced) return times;
  }
  if (count === 1) return [(cfg.windowStart + cfg.windowEnd) / 2];
  return [cfg.windowStart + 3, cfg.windowEnd - 3];
}

function makeEvent(kind, start, rng) {
  const event = { kind, start, announced: false };
  if (kind === 'collapse') {
    event.angle = rng() * Math.PI * 2;
    event.half = (CONFIG.events.collapse.sectorDeg * Math.PI) / 360;
    event.opened = false;
  }
  if (kind === 'gravity') {
    const cfg = CONFIG.events.gravity;
    event.pulses = [];
    for (let at = start + cfg.warn; at < start + cfg.duration; at += cfg.interval) {
      event.pulses.push({ at, dir: rng() < 0.5 ? -1 : 1, fired: false });
    }
  }
  return event;
}

/** 用本局种子抽 1–2 个不同事件，触发点落在 15–45 秒。 */
export function scheduleEvents(rng) {
  const cfg = CONFIG.events;
  const count = cfg.minCount + Math.floor(rng() * (cfg.maxCount - cfg.minCount + 1));
  const kinds = KINDS.slice();
  for (let i = kinds.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = kinds[i];
    kinds[i] = kinds[j];
    kinds[j] = swap;
  }
  const times = pickTimes(rng, count);
  const events = [];
  for (let i = 0; i < count; i += 1) events.push(makeEvent(kinds[i], times[i], rng));
  return events;
}

function announce(state, title, icon) {
  state.banner = { title, icon, life: CONFIG.events.banner };
}

function spinBodies(state, dt) {
  const cfg = CONFIG.events.rotate;
  const cx = state.platform.x;
  const cy = state.platform.y;
  const radius = Math.max(1, state.platform.radius);
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    if (!body.alive) continue;
    const dx = body.x - cx;
    const dy = body.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) continue;
    const edge = Math.min(1, dist / radius);
    const accel = cfg.edgeAccel * edge;
    body.vx += (-dy / dist) * accel * dt;
    body.vy += (dx / dist) * accel * dt;
  }
}

function pushBodies(state, dir) {
  const impulse = CONFIG.events.gravity.impulse;
  const cx = state.platform.x;
  const cy = state.platform.y;
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    if (!body.alive) continue;
    const dx = body.x - cx;
    const dy = body.y - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const dv = (impulse / body.mass) * dir;
    body.vx += (dx / dist) * dv;
    body.vy += (dy / dist) * dv;
  }
}

function tickOne(state, event, dt) {
  const time = state.time;
  const cfg = CONFIG.events;
  if (event.kind === 'rotate' && time >= event.start && time < event.start + cfg.rotate.duration) {
    state.spin += cfg.rotate.omega * dt;
    spinBodies(state, dt);
    if (!event.announced) {
      announce(state, TITLES.rotate, 'rotate');
      event.announced = true;
    }
  }
  if (event.kind === 'ice' && time >= event.start && time < event.start + cfg.ice.duration) {
    state.frictionScale = cfg.ice.frictionScale;
    if (!event.announced) {
      announce(state, TITLES.ice, 'ice');
      event.announced = true;
    }
  }
  if (event.kind === 'collapse') {
    const fallAt = event.start + cfg.collapse.warn;
    if (time >= event.start && time < fallAt) {
      state.warnHole = { angle: event.angle, half: event.half };
      if (!event.announced) {
        announce(state, TITLES.collapse, 'collapse');
        event.announced = true;
      }
    } else if (time >= fallAt && !event.opened) {
      event.opened = true;
      state.holes.push({ angle: event.angle - state.spin, half: event.half });
    }
  }
  if (event.kind === 'gravity' && time >= event.start && time < event.start + cfg.gravity.duration) {
    if (!event.announced) {
      announce(state, TITLES.gravity, 'gravity');
      event.announced = true;
    }
    const pulses = event.pulses;
    for (let i = 0; i < pulses.length; i += 1) {
      const pulse = pulses[i];
      if (!pulse.fired && time >= pulse.at - cfg.gravity.warn && time < pulse.at) {
        state.alert = { title: pulse.dir < 0 ? '向内' : '向外', icon: pulse.dir < 0 ? 'in' : 'out' };
      }
      if (!pulse.fired && time >= pulse.at) {
        pulse.fired = true;
        pushBodies(state, pulse.dir);
      }
    }
  }
}

/** 推进本帧事件。调用前先把 frictionScale 设回 1。 */
export function tickEvents(state, dt) {
  state.frictionScale = 1;
  state.warnHole = null;
  state.alert = null;
  const events = state.events || [];
  for (let i = 0; i < events.length; i += 1) tickOne(state, events[i], dt);
  if (state.banner) {
    state.banner.life -= dt;
    if (state.banner.life <= 0) state.banner = null;
  }
}
