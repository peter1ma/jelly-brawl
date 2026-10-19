import { CONFIG } from './config.js';
import { drawBoard } from './board.js';

const { width: W } = CONFIG.view;

function wedge(ctx, cx, cy, radius, angle, half) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, radius, angle - half, angle + half);
  ctx.closePath();
}

function drawIcon(ctx, x, y, kind) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  if (kind === 'rotate') {
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0.5, Math.PI * 1.6);
    ctx.stroke();
  } else if (kind === 'collapse' || kind === 'time') {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 16, -0.6, 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'ice') {
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(12, 0);
    ctx.moveTo(0, -12);
    ctx.lineTo(0, 12);
    ctx.stroke();
  } else if (kind === 'in' || kind === 'out' || kind === 'gravity') {
    const dir = kind === 'out' ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(0, 14 * dir);
    ctx.lineTo(0, -14 * dir);
    ctx.moveTo(-8, -4 * dir);
    ctx.lineTo(0, -14 * dir);
    ctx.lineTo(8, -4 * dir);
    ctx.stroke();
  }
  ctx.restore();
}

/** 冰面、塌方扇形、旋转刻度。 */
export function drawArena(ctx, state) {
  const platform = state.platform;
  if (!platform) return;
  if (state.frictionScale != null && state.frictionScale < 1) {
    ctx.beginPath();
    ctx.arc(platform.x, platform.y, platform.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220, 245, 255, 0.22)';
    ctx.fill();
  }
  const holes = state.holes || [];
  for (let i = 0; i < holes.length; i += 1) {
    const hole = holes[i];
    wedge(ctx, platform.x, platform.y, platform.radius - 2, hole.angle + (state.spin || 0), hole.half);
    ctx.fillStyle = '#1B1024';
    ctx.fill();
  }
  const warn = state.warnHole;
  if (warn) {
    const blink = 0.35 + 0.25 * Math.sin((state.time || 0) * 14);
    wedge(ctx, platform.x, platform.y, platform.radius - 2, warn.angle, warn.half);
    ctx.fillStyle = `rgba(255, 48, 64, ${blink})`;
    ctx.fill();
  }
  if (state.spin) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 6; i += 1) {
      const angle = state.spin + i * (Math.PI / 3);
      const inner = platform.radius - 18;
      ctx.beginPath();
      ctx.moveTo(platform.x + Math.cos(angle) * inner, platform.y + Math.sin(angle) * inner);
      ctx.lineTo(platform.x + Math.cos(angle) * platform.radius, platform.y + Math.sin(angle) * platform.radius);
      ctx.stroke();
    }
  }
}

function banner(ctx, item, y) {
  if (!item) return;
  ctx.fillStyle = 'rgba(32, 8, 24, 0.72)';
  ctx.fillRect(W / 2 - 220, y - 36, 440, 72);
  drawIcon(ctx, W / 2 - 150, y, item.icon);
  ctx.fillStyle = '#fff6fb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 52px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText(item.title, W / 2 + 16, y);
}

const CANDY = { spring: ['弹', '#FF8A4A'], shield: ['盾', '#7EC8FF'], magnet: ['磁', '#F2D24B'], smoke: ['雾', '#C9A6FF'] };

export function drawCandy(ctx, x, y, kind, radius) {
  const mark = CANDY[kind] || ['?', '#fff'];
  ctx.fillStyle = mark[1];
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3A1848';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(radius)}px "Segoe UI", sans-serif`;
  ctx.fillText(mark[0], x, y + 1);
}

/** 糖果、烟雾和布丁。 */
export function drawProps(ctx, state) {
  const smokes = state.smokes || [];
  for (let i = 0; i < smokes.length; i += 1) {
    const smoke = smokes[i];
    ctx.beginPath();
    ctx.arc(smoke.x, smoke.y, CONFIG.items.smoke.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(90, 70, 110, 0.38)';
    ctx.fill();
  }
  const candies = state.candies || [];
  for (let i = 0; i < candies.length; i += 1) {
    const candy = candies[i];
    const drop = (1 - candy.t) * (1 - candy.t) * 90;
    drawCandy(ctx, candy.x, candy.y - drop, candy.kind, CONFIG.items.radius);
  }
  const puddings = state.puddings || [];
  for (let i = 0; i < puddings.length; i += 1) {
    const pud = puddings[i];
    ctx.fillStyle = '#F2C14E';
    ctx.beginPath();
    ctx.arc(pud.x, pud.y, pud.radius || CONFIG.ghost.puddingRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(pud.x - 8, pud.y - 8, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function circle(ctx, x, y, r, fill, label, size) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  ctx.fillText(label, x, y);
}

function drawSwatches(ctx, state) {
  const skins = CONFIG.theme.skins;
  const look = state.look || { color: 0, face: 0 };
  const marks = ['笑', '眯', '星', '点', '凶', '心'];
  for (let i = 0; i < skins.length; i += 1) {
    const y = 148 + i * 78;
    circle(ctx, 112, y, look.color % skins.length === i ? 28 : 22, skins[i][0], '', 1);
    circle(ctx, 230, y, look.face % 6 === i ? 26 : 20, 'rgba(255,255,255,0.16)', marks[i], 20);
  }
}

function drawRoom(ctx, state) {
  const room = state.room || { players: [], code: '' };
  ctx.fillStyle = '#fff6fb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 56px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText(room.code || '----', W / 2, 72);
  if (room.qr) ctx.drawImage(room.qr, W / 2 - 80, 96, 160, 160);
  const players = room.players || [];
  ctx.font = '24px "Segoe UI", sans-serif';
  for (let i = 0; i < players.length; i += 1) {
    const player = players[i];
    const y = 286 + i * 36;
    ctx.fillStyle = player.fill || '#fff';
    ctx.beginPath();
    ctx.arc(W / 2 - 220, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6fb';
    ctx.textAlign = 'left';
    const ping = state.pings && state.pings[player.id];
    const ready = player.ready ? '已准备' : '未准备';
    ctx.fillText(`${player.host ? '房主 ' : ''}${player.name}  ${ready}  ${ping ? `${ping}ms` : ''}`, W / 2 - 196, y);
  }
  circle(ctx, W / 2 - 120, 620, 58, '#7DDECB', '准备', 26);
  if (room.host) circle(ctx, W / 2 + 120, 620, 58, '#FF6B9D', '开始', 26);
  if (state.notice) {
    ctx.fillStyle = '#FFE08A';
    ctx.textAlign = 'center';
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillText(state.notice, W / 2, 688);
  }
}

/** 大厅、倒计时、计时、事件大字和名次。 */
export function drawRound(ctx, state) {
  const phase = state.phase;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  circle(ctx, 48, 42, 26, 'rgba(255,255,255,0.16)', state.muted ? '静' : '声', 18);
  if (phase === 'LOBBY') {
    drawSwatches(ctx, state);
    circle(ctx, 1148, 214, 76, '#FF6B9D', '开始', 36);
    circle(ctx, 1148, 390, 58, '#7DDECB', '建房', 26);
    circle(ctx, 1148, 546, 58, '#C9A6FF', '加入', 26);
    ctx.fillStyle = 'rgba(255,246,251,0.72)';
    ctx.textAlign = 'left';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText('左半屏移动', 36, 656);
    ctx.fillText('吃黄点升级 · 右下冲', 36, 688);
    if (state.notice) {
      ctx.fillStyle = '#FFE08A';
      ctx.textAlign = 'center';
      ctx.font = '22px "Segoe UI", sans-serif';
      ctx.fillText(state.notice, 1148, 656);
    }
    return;
  }
  if (phase === 'ROOM') {
    drawRoom(ctx, state);
    return;
  }
  if (phase === 'COUNTDOWN') {
    const extra = state.match && state.match.overtime ? '加赛' : `第 ${(state.match ? state.match.played : 0) + 1} 局`;
    ctx.fillStyle = '#fff6fb';
    ctx.font = '28px "Segoe UI", sans-serif';
    ctx.fillText(extra, CONFIG.platform.centerX, CONFIG.platform.centerY - 96);
    ctx.font = '700 140px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(String(Math.max(1, Math.ceil(state.countdown))), CONFIG.platform.centerX, CONFIG.platform.centerY + 16);
  }
  if (phase === 'PLAYING') {
    const left = Math.max(0, Math.ceil(CONFIG.round.duration - state.time));
    const roundNo = (state.match ? state.match.played : 0) + 1;
    ctx.fillStyle = '#fff6fb';
    ctx.font = '700 32px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText(`第 ${roundNo} 局  剩余 ${left}`, W / 2, 38);
    const mine = localPing(state);
    if (mine) {
      ctx.font = '20px "Segoe UI", sans-serif';
      ctx.fillText(`${mine}ms`, W - 72, 38);
    }
  }
  if (phase === 'ROUND_END' || phase === 'SCOREBOARD') drawBoard(ctx, state);
  banner(ctx, state.banner, 118);
  banner(ctx, state.alert, state.banner ? 196 : 118);
}

function localPing(state) {
  const pings = state.pings || {};
  const ids = Object.keys(pings);
  if (!ids.length) return '';
  let text = '';
  for (let i = 0; i < ids.length; i += 1) text += `${pings[ids[i]]} `;
  return text.trim();
}

function near(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** 点到大厅或房间上的按钮。 */
export function hitUi(state, x, y) {
  if (near(x, y, 48, 42, 36)) return 'mute';
  if (state.phase === 'LOBBY') {
    const count = CONFIG.theme.skins.length;
    for (let i = 0; i < count; i += 1) {
      const row = 148 + i * 78;
      if (near(x, y, 112, row, 32)) return `color:${i}`;
      if (near(x, y, 230, row, 30)) return `face:${i}`;
    }
    if (near(x, y, 1148, 214, 76)) return 'solo';
    if (near(x, y, 1148, 390, 58)) return 'host';
    if (near(x, y, 1148, 546, 58)) return 'join';
  }
  if (state.phase === 'ROOM') {
    if (near(x, y, W / 2 - 120, 620, 58)) return 'ready';
    if (state.room && state.room.host && near(x, y, W / 2 + 120, 620, 58)) return 'start';
  }
  return '';
}
