import { CONFIG } from './config.js';
import { drawFace } from './faces.js';
import { drawArena, drawCandy, drawProps, drawRound } from './hud.js';
import { inSmoke } from './items.js';

const { width: W, height: H } = CONFIG.view;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawBackground(ctx) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, CONFIG.theme.bgTop);
  bg.addColorStop(1, CONFIG.theme.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const blobs = [
    [180, 120, 100, 'rgba(255,107,157,0.16)'],
    [1120, 560, 120, 'rgba(255,176,120,0.12)'],
    [1040, 90, 72, 'rgba(180,140,255,0.12)'],
  ];
  for (let i = 0; i < blobs.length; i += 1) {
    const blob = blobs[i];
    ctx.fillStyle = blob[3];
    ctx.beginPath();
    ctx.arc(blob[0], blob[1], blob[2], 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlatform(ctx, platform) {
  ctx.beginPath();
  ctx.arc(platform.x, platform.y, platform.radius, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.platform.fill;
  ctx.fill();
  ctx.lineWidth = 12;
  ctx.strokeStyle = CONFIG.platform.rim;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(
    platform.x,
    platform.y,
    platform.radius + CONFIG.jelly.eliminateMargin,
    0,
    Math.PI * 2,
  );
  ctx.setLineDash([10, 12]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawJelly(ctx, state, body, alpha) {
  const x = lerp(body.prevX, body.x, alpha);
  const y = lerp(body.prevY, body.y, alpha);
  const speed = Math.hypot(body.vx, body.vy);
  const stretch = Math.min(speed / body.speed, 1) * CONFIG.jelly.stretchGain;
  const along = 1 + stretch;
  const perp = 1 / Math.sqrt(along);
  const angle = speed > 12 ? Math.atan2(body.vy, body.vx) : 0;
  let pop = 1;
  if (body.pulse > 0) {
    const t = 1 - body.pulse / CONFIG.pellets.growAnim;
    pop = 1 + Math.sin(Math.min(Math.max(t, 0), 1) * Math.PI) * 0.4;
  }
  const r = body.radius * pop;
  if (inSmoke(state, x, y)) {
    ctx.save();
    ctx.globalAlpha = body.alive ? 0.9 : CONFIG.ghost.alpha;
    ctx.fillStyle = '#2A1436';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.globalAlpha = body.alive ? 1 : CONFIG.ghost.alpha;

  if (body.charging) {
    const ratio = body.chargeTime / CONFIG.charge.maxSeconds;
    ctx.beginPath();
    ctx.arc(x, y, r + 10 + ratio * 16, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 36, 48, ${0.08 + ratio * 0.28})`;
    ctx.fill();
    ctx.lineWidth = 3 + ratio * 7;
    ctx.strokeStyle = `rgba(255, 48, 56, ${0.28 + ratio * 0.65})`;
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(x, y + r * 0.2);
  ctx.rotate(angle);
  ctx.scale(along, perp * 0.45);
  ctx.fillStyle = 'rgba(40, 8, 24, 0.28)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(along, perp);
  const gloss = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, r * 0.1, r);
  gloss.addColorStop(0, body.light);
  gloss.addColorStop(0.45, body.fill);
  gloss.addColorStop(1, body.dark);
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  if (body.ring) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.stroke();
  }
  if (body.flash > 0) {
    const alpha = Math.min(1, body.flash / CONFIG.pellets.flash) * 0.75;
    ctx.fillStyle = body.flashUp ? `rgba(255,255,255,${alpha})` : `rgba(255,48,64,${alpha})`;
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = CONFIG.theme.highlight;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.32, y - r * 0.38, r * 0.34, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  drawFace(ctx, body, x, y, r);
  if (body.shield > 0) {
    ctx.strokeStyle = 'rgba(126, 200, 255, 0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r + 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (body.item) drawCandy(ctx, x, y - r - 16, body.item, 11);

  if (body.charging) {
    const ratio = body.chargeTime / Math.max(CONFIG.charge.maxSeconds, 0.001);
    const bw = Math.max(36, r * 2.4);
    const bx = x - bw / 2;
    const by = y - r - 18;
    ctx.fillStyle = 'rgba(40, 8, 20, 0.55)';
    ctx.fillRect(bx, by, bw, 8);
    ctx.fillStyle = '#ff3040';
    ctx.fillRect(bx, by, bw * ratio, 8);
  }
  ctx.fillStyle = '#fff';
  const dots = body.level || 1;
  for (let i = 0; i < dots; i += 1) {
    ctx.beginPath();
    ctx.arc(x + (i - (dots - 1) / 2) * 11, y + r + 14, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPellets(ctx, pellets) {
  const radius = CONFIG.pellets.radius;
  for (let i = 0; i < pellets.length; i += 1) {
    const pellet = pellets[i];
    ctx.globalAlpha = pellet.grace > 0 ? 0.55 : 1;
    ctx.fillStyle = CONFIG.pellets.color;
    ctx.beginPath();
    ctx.arc(pellet.x, pellet.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(pellet.x - radius * 0.28, pellet.y - radius * 0.28, radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx, particles) {
  for (let i = 0; i < particles.length; i += 1) {
    const spark = particles[i];
    ctx.globalAlpha = Math.max(0, spark.life / spark.max);
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawJoystick(ctx, joystick) {
  if (!joystick.active) return;
  ctx.beginPath();
  ctx.arc(joystick.cx, joystick.cy, CONFIG.input.joystickRadius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(joystick.kx, joystick.ky, CONFIG.input.knobRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
}

function drawChargeButton(ctx, state, charge) {
  const player = localBody(state);
  if (!player || !charge) return;
  const cooling = player.cooldown > 0;
  ctx.beginPath();
  ctx.arc(charge.cx, charge.cy, charge.r, 0, Math.PI * 2);
  ctx.fillStyle = charge.held && !cooling ? '#ff2d3a' : 'rgba(255, 70, 90, 0.92)';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.stroke();
  if (cooling) {
    const p = 1 - player.cooldown / Math.max(CONFIG.charge.cooldown, 0.001);
    ctx.beginPath();
    ctx.arc(charge.cx, charge.cy, charge.r - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(Math.max(32, charge.r * 0.46))}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.fillText('冲', charge.cx, charge.cy);
}

function drawHud(ctx, state) {
  const player = localBody(state);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = CONFIG.theme.ink;
  if (state.phase === 'LOBBY' || state.phase === 'ROOM') {
    ctx.font = '700 40px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('Jelly Brawl', W / 2, 36);
  }
  if (player && !player.alive && state.phase === 'PLAYING') {
    ctx.font = '700 44px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('淘汰了', W / 2, 112);
    ctx.font = '22px "Segoe UI", sans-serif';
    const ready = player.ghostCd <= 0 ? '点平台放布丁' : '布丁冷却中';
    ctx.fillText(`${ready} · 按 R 回大厅`, W / 2, 154);
  }
}

function localBody(state) {
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) if (bodies[i].local) return bodies[i];
  return null;
}

/** 只读 state。alpha 是距离下一物理步的插值，0 到 1。 */
export function render(ctx, state, alpha, view) {
  const t = Math.min(Math.max(alpha, 0), 1);
  ctx.save();
  if (state.slowmo > 0) {
    const zoom = 1 + 0.08 * (state.slowmo / CONFIG.combat.slowmoSeconds);
    const cx = state.platform.x;
    const cy = state.platform.y;
    ctx.translate(cx, cy);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
  }
  if (state.shake > 0) {
    const k = state.shake / Math.max(CONFIG.combat.shakeTime, 0.001);
    const mag = CONFIG.combat.shakeMag * k;
    ctx.translate(Math.sin(state.shake * 80) * mag, Math.cos(state.shake * 63) * mag);
  }
  drawBackground(ctx);
  drawPlatform(ctx, state.platform);
  drawArena(ctx, state);
  drawPellets(ctx, state.pellets);
  drawProps(ctx, state);
  for (let i = state.jellies.length - 1; i >= 0; i -= 1) {
    drawJelly(ctx, state, state.jellies[i], t);
  }
  drawParticles(ctx, state.particles);
  drawHud(ctx, state);
  drawRound(ctx, state);
  drawJoystick(ctx, view.joystick);
  drawChargeButton(ctx, state, view.charge);
  ctx.restore();
}
