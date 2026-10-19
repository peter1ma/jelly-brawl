import { CONFIG } from './config.js';

const pool = [];

/** 从池里拿一颗粒子，避免吃块和撞击时不停 new。 */
export function emit(state, x, y, color, count) {
  const rng = state.rng;
  if (!rng) return;
  const life = CONFIG.pellets.particleLife;
  for (let i = 0; i < count; i += 1) {
    if (state.particles.length >= CONFIG.fx.poolSize) return;
    const spark = pool.pop() || {};
    const angle = rng() * Math.PI * 2;
    const speed = 50 + rng() * 150;
    spark.x = x;
    spark.y = y;
    spark.vx = Math.cos(angle) * speed;
    spark.vy = Math.sin(angle) * speed;
    spark.life = life;
    spark.max = life;
    spark.r = 2 + rng() * 2.4;
    spark.color = color;
    state.particles.push(spark);
  }
}

export function tickParticles(state, dt) {
  const sparks = state.particles;
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    const spark = sparks[i];
    spark.life -= dt;
    if (spark.life <= 0) {
      sparks[i] = sparks[sparks.length - 1];
      sparks.pop();
      pool.push(spark);
      continue;
    }
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
  }
}

export function cue(state, name) {
  const list = state.sfx || (state.sfx = []);
  if (list.length < 8) list.push(name);
}

/** 支持振动的设备轻震一下。iOS 没有这个接口。 */
export function buzz() {
  const vibrate = typeof navigator !== 'undefined' && navigator.vibrate;
  if (vibrate) navigator.vibrate(CONFIG.combat.vibrateMs);
}
