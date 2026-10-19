import { CONFIG } from './config.js';
import { tickEvents } from './events.js';

/** 0–15 秒最大，之后每 8 秒用 1.2 秒收到下一档。 */
export function radiusAt(time) {
  const cfg = CONFIG.platform;
  const radii = cfg.radii;
  if (time < cfg.holdSeconds) return radii[0];
  const since = time - cfg.holdSeconds;
  const index = Math.floor(since / cfg.shrinkEvery);
  const step = Math.min(index, radii.length - 2);
  const into = since - step * cfg.shrinkEvery;
  const from = radii[step];
  const to = radii[step + 1];
  const t = Math.min(1, Math.max(0, into / cfg.shrinkAnim));
  const s = t * t * (3 - 2 * t);
  return from + (to - from) * s;
}

/** 活着的按体型、再按离中心距离；先淘汰的名次更靠后。 */
export function rankRound(state) {
  const cx = state.platform.x;
  const cy = state.platform.y;
  const list = [];
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    list.push({
      id: body.id,
      name: body.name,
      fill: body.fill,
      level: body.level,
      alive: body.alive,
      outTime: body.outTime == null ? -1 : body.outTime,
      dist: Math.hypot(body.x - cx, body.y - cy),
    });
  }
  list.sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (a.alive) {
      if (b.level !== a.level) return b.level - a.level;
      return a.dist - b.dist;
    }
    return b.outTime - a.outTime;
  });
  return list;
}

function living(state) {
  let count = 0;
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) if (bodies[i].alive) count += 1;
  return count;
}

function finish(state, reason) {
  state.phase = 'ROUND_END';
  state.phaseTime = CONFIG.round.resultPause;
  state.endReason = reason;
  state.ranks = rankRound(state);
  state.banner = null;
  state.alert = null;
  state.warnHole = null;
}

/** 倒计时、局内时钟、缩圈和事件。 */
export function tickClock(state, dt) {
  if (state.phase === 'COUNTDOWN') {
    state.countdown -= dt;
    if (state.countdown <= 0) {
      state.phase = 'PLAYING';
      state.countdown = 0;
    }
    return;
  }
  if (state.phase === 'ROUND_END') {
    state.phaseTime -= dt;
    if (state.phaseTime <= 0) state.phase = 'SCOREBOARD';
    return;
  }
  if (state.phase !== 'PLAYING') return;
  state.time += dt;
  state.platform.radius = radiusAt(state.time);
  tickEvents(state, dt);
  if (state.time >= CONFIG.round.duration) finish(state, 'time');
  // 胜负已定就结算，不用干等平台缩完。
  else if (state.jellies.length > 1 && living(state) <= 1) finish(state, 'last');
}
