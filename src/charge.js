import { CONFIG } from './config.js';
import { cue } from './fx.js';

function fireDash(state, body) {
  const span = CONFIG.charge.maxSeconds;
  const ratio = span > 0 ? Math.min(1, body.chargeTime / span) : 0;
  const impulse = CONFIG.charge.minImpulse + (CONFIG.charge.maxImpulse - CONFIG.charge.minImpulse) * ratio;
  const mag = Math.hypot(body.aimX, body.aimY) || 1;
  const nx = body.aimX / mag;
  const ny = body.aimY / mag;
  const dv = impulse * body.knock / body.mass;
  body.vx += nx * dv;
  body.vy += ny * dv;
  body.dashSpeed = dv;
  body.dashTime = CONFIG.charge.dashSeconds;
  body.dashHit = false;
  body.charging = false;
  body.chargeTime = 0;
  body.cooldown = CONFIG.charge.cooldown;
  cue(state, 'dash');
}

/** 按住蓄力，松开沿摇杆或上次朝向冲刺。 */
export function updateCharge(state, body, dt, held) {
  if (body.cooldown > 0) body.cooldown = Math.max(0, body.cooldown - dt);
  if (body.dashTime > 0) body.dashTime = Math.max(0, body.dashTime - dt);
  if (!body.alive) {
    body.charging = false;
    return;
  }
  const canCharge = body.cooldown <= 0 && body.dashTime <= 0;
  if (held && canCharge) {
    body.charging = true;
    body.chargeTime = Math.min(CONFIG.charge.maxSeconds, body.chargeTime + dt);
    return;
  }
  if (body.charging && !held) fireDash(state, body);
  if (!held) body.charging = false;
}
