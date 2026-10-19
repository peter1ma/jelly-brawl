import { CONFIG } from './config.js';
import { makeJelly } from './match.js';
import { syncStats } from './growth.js';

let api = null;

function num(value) {
  return Math.round((value || 0) * 10) / 10;
}

/** 紧凑数组，客机只拿来画，不再自己跑物理。 */
export function packState(state) {
  const bodies = state.jellies;
  const jellies = [];
  for (let i = 0; i < bodies.length; i += 1) {
    const body = bodies[i];
    jellies.push([
      body.id, num(body.x), num(body.y), num(body.vx), num(body.vy), body.level,
      body.alive ? 1 : 0, body.charging ? 1 : 0, num(body.chargeTime), body.item || '',
      num(body.shield), num(body.magnet), body.face || 0, body.score || 0, body.kos || 0,
      num(body.ghostCd), body.fill, body.light, body.dark, body.name, body.ring ? 1 : 0,
      num(body.cooldown), num(body.dashTime), body.ai ? 1 : 0, num(body.pulse),
      num(body.flash), body.flashUp ? 1 : 0, num(body.dizzy), body.peerId || '',
    ]);
  }
  return {
    ph: state.phase,
    t: num(state.time),
    cd: num(state.countdown),
    rad: num(state.platform.radius),
    sp: num(state.spin),
    fr: state.frictionScale,
    holes: state.holes,
    warn: state.warnHole,
    ban: state.banner,
    al: state.alert,
    ranks: state.ranks,
    titles: state.titles,
    board: state.board,
    match: state.match,
    pings: state.pings,
    sfx: state.sfx || [],
    slow: num(state.slowmo),
    shake: num(state.shake),
    er: state.endReason || '',
    j: jellies,
    p: state.pellets.map((item) => [num(item.x), num(item.y), num(item.grace)]),
    c: state.candies.map((item) => [num(item.x), num(item.y), item.kind, num(item.t)]),
    u: state.puddings.map((item) => [num(item.x), num(item.y), num(item.vx), num(item.vy), num(item.life)]),
    k: state.smokes.map((item) => [num(item.x), num(item.y), num(item.life)]),
  };
}

function reuse(state, id) {
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) if (bodies[i].id === id) return bodies[i];
  return null;
}

/** 把房主快照写进现有 state，保留上一帧坐标做插值。 */
export function applySnap(state, snap, selfId) {
  const prev = state.phase;
  state.phase = snap.ph;
  state.time = snap.t;
  state.countdown = snap.cd;
  state.platform.radius = snap.rad;
  state.spin = snap.sp || 0;
  state.frictionScale = snap.fr == null ? 1 : snap.fr;
  state.holes = snap.holes || [];
  state.warnHole = snap.warn || null;
  state.banner = snap.ban || null;
  state.alert = snap.al || null;
  state.ranks = snap.ranks || null;
  state.titles = snap.titles || [];
  state.board = snap.board || null;
  state.match = snap.match || state.match;
  state.pings = snap.pings || {};
  state.sfx = snap.sfx || [];
  state.slowmo = snap.slow || 0;
  state.shake = snap.shake || 0;
  state.endReason = snap.er || '';
  const rows = snap.j || [];
  const next = [];
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    let body = reuse(state, row[0]);
    if (!body) body = makeJelly(row[0], row[1], row[2], row[16], row[17], row[18], row[20] === 1);
    else {
      body.prevX = body.x;
      body.prevY = body.y;
    }
    body.x = row[1];
    body.y = row[2];
    body.vx = row[3];
    body.vy = row[4];
    body.level = row[5];
    body.alive = row[6] === 1;
    body.charging = row[7] === 1;
    body.chargeTime = row[8];
    body.item = row[9] || null;
    body.shield = row[10];
    body.magnet = row[11];
    body.face = row[12];
    body.score = row[13];
    body.kos = row[14];
    body.ghostCd = row[15];
    body.fill = row[16];
    body.light = row[17];
    body.dark = row[18];
    body.name = row[19];
    body.ring = row[20] === 1;
    body.cooldown = row[21];
    body.dashTime = row[22];
    body.ai = row[23] === 1;
    body.pulse = row[24];
    body.flash = row[25];
    body.flashUp = row[26] === 1;
    body.dizzy = row[27];
    body.peerId = row[28] || null;
    body.local = body.id === selfId;
    if (body.local) body.ring = true;
    syncStats(body);
    next.push(body);
  }
  state.jellies = next;
  state.pellets = (snap.p || []).map((item) => ({ x: item[0], y: item[1], grace: item[2] }));
  state.candies = (snap.c || []).map((item) => ({ x: item[0], y: item[1], kind: item[2], t: item[3] }));
  state.puddings = (snap.u || []).map((item) => ({
    x: item[0], y: item[1], prevX: item[0], prevY: item[1], vx: item[2], vy: item[3], life: item[4],
    radius: CONFIG.ghost.puddingRadius, alive: true, pudding: true,
  }));
  state.smokes = (snap.k || []).map((item) => ({ x: item[0], y: item[1], life: item[2] }));
  if (state.phase === 'SCOREBOARD' && prev !== 'SCOREBOARD') state.boardTime = 0;
}

export function makeCode() {
  const alphabet = CONFIG.net.codeAlphabet;
  const buf = new Uint32Array(CONFIG.net.codeLength);
  crypto.getRandomValues(buf);
  let code = '';
  for (let i = 0; i < buf.length; i += 1) code += alphabet[buf[i] % alphabet.length];
  return code;
}

export function netSend(data, target) {
  if (!api) return;
  if (target) api.msg.send(data, { target });
  else api.msg.send(data);
}

export async function closeRoom() {
  if (!api) return;
  clearInterval(api.timer);
  try { api.room.leave(); } catch (err) { /* 房间已经关了 */ }
  api = null;
}

async function pingAll() {
  if (!api) return;
  const ids = [...api.peers];
  for (let i = 0; i < ids.length; i += 1) {
    try {
      const ms = await api.room.ping(ids[i]);
      if (api) api.hooks.onPing(ids[i], Math.round(ms));
    } catch (err) { /* 对方刚离开 */ }
  }
}

/** 用公共 MQTT 信令建房，不自建服务器。 */
export async function openRoom(isHost, code, profile, hooks) {
  await closeRoom();
  const mod = await import(CONFIG.net.trystero);
  const joinRoom = mod.joinRoom;
  const config = {
    appId: CONFIG.net.appId,
    relayConfig: { urls: CONFIG.net.relays },
    rtcConfig: { iceServers: CONFIG.net.stun.map((urls) => ({ urls })) },
  };
  if (CONFIG.net.turn) config.turnConfig = CONFIG.net.turn;
  const room = await joinRoom(config, code);
  const msg = room.makeAction('msg');
  api = { room, msg, peers: new Set(), hooks, timer: 0 };
  msg.onMessage = (data, meta) => hooks.onMsg(data, meta.peerId);
  room.onPeerJoin = (id) => {
    api.peers.add(id);
    msg.send(Object.assign({ t: 'hello', host: isHost }, profile), { target: id });
    hooks.onJoin(id);
  };
  room.onPeerLeave = (id) => {
    api.peers.delete(id);
    hooks.onLeave(id);
  };
  msg.send(Object.assign({ t: 'hello', host: isHost }, profile));
  api.timer = setInterval(pingAll, 1000);
  return { selfId: mod.selfId, code };
}

export async function makeQr(code) {
  const mod = await import(CONFIG.net.qr);
  const QR = mod.default || mod;
  const url = new URL(location.href);
  url.searchParams.set('room', code);
  const data = await QR.toDataURL(url.toString(), {
    margin: 1,
    width: 220,
    color: { dark: '#3A1848', light: '#FFF6FB' },
  });
  const img = new Image();
  img.src = data;
  if (img.decode) await img.decode().catch(() => {});
  return img;
}
