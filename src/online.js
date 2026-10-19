import { playCues } from './audio.js';
import { CONFIG } from './config.js';
import { cancelCharge } from './input.js';
import { blankMatch, createRound, findJelly, startSolo } from './match.js';
import { applySnap, closeRoom, makeQr, netSend, openRoom, packState } from './net.js';

/** 房间、准备、快照和掉线。物理仍由房主在 game.js 里跑。 */
export function bindOnline(session) {
  function profileOf(state) {
    const skins = CONFIG.theme.skins;
    const look = state.look;
    const skin = skins[look.color % skins.length];
    return { name: '你', fill: skin[0], light: skin[1], dark: skin[2], face: look.face % 6 };
  }

  function playerList() {
    return [session.self].concat(Object.values(session.others));
  }

  function pushRoster() {
    const players = playerList();
    const phase = session.state.phase;
    session.state.room = { code: session.code, players, host: session.role === 'host', qr: session.qr };
    if (phase === 'LOBBY' || phase === 'ROOM') session.state.phase = 'ROOM';
    netSend({ t: 'roster', players, code: session.code });
  }

  function leaveToLobby(notice) {
    closeRoom();
    const look = session.state.look;
    session.role = 'solo';
    session.others = {};
    session.inputs = {};
    session.self = null;
    session.state = blankMatch();
    session.state.look = look;
    session.state.notice = notice || '';
    cancelCharge();
  }

  function onMsg(data, peerId) {
    if (!data || !data.t) return;
    if (data.t === 'hello') {
      session.others[peerId] = {
        id: peerId,
        name: '玩家',
        fill: data.fill,
        light: data.light,
        dark: data.dark,
        face: data.face || 0,
        ready: false,
        host: !!data.host,
        ping: 0,
      };
      if (data.host) session.hostId = peerId;
      if (session.role === 'host') pushRoster();
      return;
    }
    if (data.t === 'roster' && session.role === 'guest') {
      session.state.room = { code: data.code, players: data.players, host: false, qr: session.qr };
      if (session.state.phase === 'LOBBY' || session.state.phase === 'ROOM') session.state.phase = 'ROOM';
      return;
    }
    if (data.t === 'ready' && session.role === 'host' && session.others[peerId]) {
      session.others[peerId].ready = !!data.ready;
      pushRoster();
      return;
    }
    if (data.t === 'in' && session.role === 'host') {
      const prev = session.inputs[peerId];
      if (prev && prev.place && !data.place) {
        data.place = 1;
        data.px = prev.px;
        data.py = prev.py;
      }
      session.inputs[peerId] = data;
    }
    if (data.t === 'snap' && session.role === 'guest') {
      applySnap(session.state, data.snap, session.selfId);
      playCues(session.state.sfx);
      session.state.sfx = [];
      session.lerp = 0;
    }
  }

  function onLeave(id) {
    if (session.role === 'guest' && id === session.hostId) {
      leaveToLobby('房主离开了');
      return;
    }
    delete session.others[id];
    delete session.inputs[id];
    const state = session.state;
    const body = state.match ? findJelly(state, id) : null;
    if (body) {
      body.ai = true;
      body.peerId = null;
    }
    const roster = state.match && state.match.roster;
    if (roster) {
      for (let i = 0; i < roster.length; i += 1) {
        if (roster[i].id === id) {
          roster[i].ai = true;
          roster[i].peerId = null;
        }
      }
    }
    if (session.role === 'host') pushRoster();
  }

  async function connect(isHost, code) {
    const cleaned = (code || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
    if (!isHost && cleaned.length !== CONFIG.net.codeLength) {
      session.role = 'solo';
      session.state.notice = '请输入 4 位房间码';
      return;
    }
    session.state.notice = isHost ? '正在建立房间…' : '正在加入…';
    session.role = isHost ? 'host' : 'guest';
    session.others = {};
    session.inputs = {};
    const opened = await openRoom(isHost, isHost ? code : cleaned, profileOf(session.state), {
      onMsg,
      onJoin: () => {},
      onLeave,
      onPing: (id, ms) => {
        session.state.pings[id] = ms;
        if (session.others[id]) session.others[id].ping = ms;
      },
    });
    session.selfId = opened.selfId;
    session.code = isHost ? code : cleaned;
    session.qr = await makeQr(session.code);
    const me = profileOf(session.state);
    session.self = Object.assign({ id: opened.selfId, ready: false, host: isHost, ping: 0 }, me);
    session.state.notice = '';
    session.state.phase = 'ROOM';
    session.state.room = { code: session.code, players: playerList(), host: isHost, qr: session.qr };
    if (isHost) pushRoster();
  }

  function beginSolo() {
    closeRoom();
    session.role = 'solo';
    session.state = startSolo(session.state.look);
    cancelCharge();
  }

  function toggleReady() {
    if (!session.self) return;
    session.self.ready = !session.self.ready;
    if (session.role === 'guest') netSend({ t: 'ready', ready: session.self.ready ? 1 : 0 });
    if (session.role === 'host') pushRoster();
  }

  function hostStart() {
    const players = playerList();
    const ready = players.every((player) => player.ready);
    const count = players.length;
    if (count < CONFIG.net.minPlayers || count > CONFIG.net.maxPlayers || !ready) {
      session.state.notice = '需要 2 到 6 人，并且全部准备';
      return;
    }
    const room = session.state.room;
    const roster = players.map((player, index) => ({
      id: player.id,
      name: player.id === session.selfId ? '你' : `玩家${index + 1}`,
      fill: player.fill,
      light: player.light,
      dark: player.dark,
      face: player.face || 0,
      ai: false,
      local: player.id === session.selfId,
      ring: player.id === session.selfId,
      peerId: player.id === session.selfId ? null : player.id,
    }));
    const match = { played: 0, scores: {}, overtime: false, look: session.state.look, roster };
    session.state = createRound(match, Date.now() >>> 0);
    session.state.room = room;
    cancelCharge();
  }

  function publish() {
    const state = session.state;
    if (state.phase === 'LOBBY' || state.phase === 'ROOM') return;
    const cues = state.sfx.splice(0);
    state.sfx = cues;
    netSend({ t: 'snap', snap: packState(state) });
    state.sfx = [];
    playCues(cues);
  }

  function sendInput() {
    const move = session.readMove();
    const place = session.place;
    session.place = null;
    netSend({
      t: 'in',
      mx: move.x,
      my: move.y,
      ch: session.readCharge() ? 1 : 0,
      place: place ? 1 : 0,
      px: place ? place.x : 0,
      py: place ? place.y : 0,
    });
  }

  return { connect, leaveToLobby, beginSolo, toggleReady, hostStart, publish, sendInput };
}
