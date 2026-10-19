import { steerAi } from './ai.js';
import { isMuted, playCues, syncCharge, toggleMute, unlockAudio, watchRound } from './audio.js';
import { updateCharge } from './charge.js';
import { CONFIG } from './config.js';
import { tickGhost, tryPlace } from './ghost.js';
import { syncStats, tickGrowth } from './growth.js';
import { hitUi } from './hud.js';
import { attachInput, cancelCharge, clientToLogical, getCharge, getJoystick, getMove, layoutCharge } from './input.js';
import { tickItems } from './items.js';
import { saveLook } from './look.js';
import { advanceMatch, awardRound, blankMatch, findJelly } from './match.js';
import { makeCode } from './net.js';
import { bindOnline } from './online.js';
import { step } from './physics.js';
import { render } from './render.js';
import { tickClock } from './round.js';
import { mountDebug } from './ui.js';

const DT = 1 / CONFIG.physics.hz;
const MAX_STEPS = 5;
const session = {
  state: null,
  role: 'solo',
  inputs: {},
  others: {},
  self: null,
  selfId: 'player',
  hostId: '',
  code: '',
  qr: null,
  lerp: 1,
  snapAcc: 0,
  place: null,
  readMove: getMove,
  readCharge: () => getCharge().held,
};
const online = bindOnline(session);

function useRemote(state, body, inn) {
  body.drive.x = inn.mx || 0;
  body.drive.y = inn.my || 0;
  const mag = Math.hypot(body.drive.x, body.drive.y);
  if (mag > 0.15) {
    body.aimX = body.drive.x / mag;
    body.aimY = body.drive.y / mag;
  }
  updateCharge(state, body, DT, !!inn.ch);
  if (inn.place) {
    tryPlace(state, body, inn.px, inn.py);
    inn.place = 0;
  }
}

function driveOne(state, body) {
  if (!body.alive) {
    body.drive.x = 0;
    body.drive.y = 0;
    body.charging = false;
    if (body.peerId && session.inputs[body.peerId]) useRemote(state, body, session.inputs[body.peerId]);
    return;
  }
  if (body.local) {
    const move = getMove();
    body.drive.x = move.x;
    body.drive.y = move.y;
    const mag = Math.hypot(move.x, move.y);
    if (mag > 0.15) {
      body.aimX = move.x / mag;
      body.aimY = move.y / mag;
    }
    updateCharge(state, body, DT, getCharge().held);
    return;
  }
  if (body.peerId && session.inputs[body.peerId]) {
    useRemote(state, body, session.inputs[body.peerId]);
    return;
  }
  if (body.ai) {
    steerAi(body, state, DT);
    updateCharge(state, body, DT, body.wantCharge);
  }
}

function simulate(state) {
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) {
    syncStats(bodies[i]);
    driveOne(state, bodies[i]);
  }
  tickItems(state, DT);
  step(state, DT);
  tickGhost(state, DT);
  tickGrowth(state, DT);
}

function meId() {
  return session.role === 'solo' ? 'player' : session.selfId;
}

/** 启动固定步长循环。单机、房主和客机走同一条渲染。 */
export function startGame(canvas, ctx) {
  session.state = blankMatch();
  session.state.muted = isMuted();
  let last = performance.now();
  let acc = 0;
  const view = { joystick: null, charge: null };
  attachInput(canvas);
  mountDebug();
  const form = document.getElementById('join');
  const field = document.getElementById('join-code');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    form.hidden = true;
    online.connect(false, (field.value || '').toUpperCase()).catch(() => {
      session.role = 'solo';
      session.state.notice = '加入失败';
    });
  });

  const go = (hit) => {
    const state = session.state;
    if (hit.indexOf('color:') === 0) {
      state.look.color = Number(hit.slice(6));
      saveLook(state.look);
      return;
    }
    if (hit.indexOf('face:') === 0) {
      state.look.face = Number(hit.slice(5));
      saveLook(state.look);
      return;
    }
    if (hit === 'mute') {
      toggleMute();
      state.muted = isMuted();
      return;
    }
    if (hit === 'solo') online.beginSolo();
    if (hit === 'host') {
      online.connect(true, makeCode()).catch(() => {
        session.role = 'solo';
        session.state.notice = '建房失败';
      });
    }
    if (hit === 'join') {
      form.hidden = false;
      field.focus();
    }
    if (hit === 'ready') online.toggleReady();
    if (hit === 'start') online.hostStart();
  };

  window.addEventListener('keydown', (event) => {
    unlockAudio();
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const phase = session.state.phase;
    if (event.code === 'Enter' && phase === 'LOBBY') online.beginSolo();
    else if ((event.code === 'Enter' || event.code === 'KeyR') && phase === 'SCOREBOARD' && session.role !== 'guest') {
      session.state = advanceMatch(session.state);
      cancelCharge();
    } else if (event.code === 'KeyR' && phase !== 'LOBBY') online.leaveToLobby('');
  });
  canvas.addEventListener('pointerdown', (event) => {
    unlockAudio();
    const point = clientToLogical(canvas, event.clientX, event.clientY);
    const state = session.state;
    const hit = hitUi(state, point.x, point.y);
    if (hit) {
      go(hit);
      return;
    }
    if (state.phase === 'SCOREBOARD' && session.role !== 'guest') {
      session.state = advanceMatch(state);
      cancelCharge();
      return;
    }
    if (state.phase !== 'PLAYING') return;
    const me = findJelly(state, meId());
    const charge = layoutCharge(canvas);
    const dx = point.x - charge.cx;
    const dy = point.y - charge.cy;
    if (!me || me.alive || dx * dx + dy * dy <= charge.r * charge.r) return;
    if (session.role === 'guest') session.place = point;
    else tryPlace(state, me, point.x, point.y);
  });

  const roomCode = new URLSearchParams(location.search).get('room');
  if (roomCode) {
    online.connect(false, roomCode.toUpperCase()).catch(() => {
      session.state.notice = '加入失败';
    });
  }

  const frame = (now) => {
    const state = session.state;
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.1) elapsed = 0.1;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - elapsed);
    if (state.slowmo > 0) state.slowmo = Math.max(0, state.slowmo - elapsed);
    const frozen = state.hitstop > 0 && state.phase === 'PLAYING' && session.role !== 'guest';
    let alpha = Math.min(acc / DT, 1);
    if (session.role === 'guest') {
      session.lerp = Math.min(1, session.lerp + elapsed / (CONFIG.net.snapshotMs / 1000));
      alpha = session.lerp;
      if (state.phase === 'COUNTDOWN' || state.phase === 'PLAYING') online.sendInput();
    } else if (frozen) {
      state.hitstop = Math.max(0, state.hitstop - elapsed);
    } else if (state.phase !== 'LOBBY' && state.phase !== 'ROOM' && state.phase !== 'SCOREBOARD') {
      const scale = state.slowmo > 0 ? CONFIG.combat.slowmoScale : 1;
      acc += elapsed * scale;
      let steps = 0;
      while (acc >= DT && steps < MAX_STEPS) {
        const phase = state.phase;
        tickClock(state, DT);
        if (phase !== 'ROUND_END' && state.phase === 'ROUND_END') awardRound(state);
        if (phase === 'PLAYING' && state.phase === 'PLAYING') simulate(state);
        acc -= DT;
        steps += 1;
      }
      if (steps === MAX_STEPS) acc = 0;
      alpha = Math.min(acc / DT, 1);
    }
    if (state.phase === 'SCOREBOARD') state.boardTime = (state.boardTime || 0) + elapsed;
    state.muted = isMuted();
    state.waitHost = session.role === 'guest';
    const me = findJelly(state, meId());
    syncCharge(!!(me && me.charging), me ? me.chargeTime : 0);
    watchRound(state);
    if (session.role === 'host') {
      session.snapAcc += elapsed * 1000;
      if (session.snapAcc >= CONFIG.net.snapshotMs) {
        session.snapAcc = 0;
        online.publish();
      }
    } else if (session.role === 'solo' && state.sfx) playCues(state.sfx.splice(0));
    view.joystick = getJoystick();
    view.charge = layoutCharge(canvas);
    render(ctx, state, alpha, view);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
