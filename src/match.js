import { CONFIG } from './config.js';
import { scheduleEvents } from './events.js';
import { scatterPellet } from './growth.js';
import { loadLook } from './look.js';
import { rankRound } from './round.js';
import { createRng } from './rng.js';

const SPOTS = [[-180, 0], [156, -90], [0, 180], [156, 90], [-150, -150], [40, -170]];

export function makeJelly(id, x, y, fill, light, dark, ring) {
  const stats = CONFIG.jelly.levels[0];
  return {
    id,
    x,
    y,
    prevX: x,
    prevY: y,
    vx: 0,
    vy: 0,
    radius: stats.radius,
    mass: stats.mass,
    speed: stats.speed,
    knock: stats.knock,
    resist: stats.resist,
    alive: true,
    fill,
    light,
    dark,
    ring,
    drive: { x: 0, y: 0 },
    charging: false,
    chargeTime: 0,
    cooldown: 0,
    dashTime: 0,
    dashSpeed: 0,
    dashHit: false,
    aimX: 1,
    aimY: 0,
    level: 1,
    pulse: 0,
    flash: 0,
    flashUp: true,
    hitImpulse: 0,
    hurtLock: 0,
    ai: false,
    local: false,
    peerId: null,
    wantCharge: false,
    chargeHold: 0,
    think: 0,
    name: '果冻',
    outTime: null,
    item: null,
    shield: 0,
    magnet: 0,
    face: 0,
    score: 0,
    kos: 0,
    selfOut: 0,
    eaten: 0,
    hits: 0,
    puddings: 0,
    ghostCd: 0,
    dizzy: 0,
    lastHitBy: null,
    lastHitTime: -99,
  };
}

export function blankMatch() {
  const platform = CONFIG.platform;
  return {
    phase: 'LOBBY',
    time: 0,
    countdown: 0,
    phaseTime: 0,
    boardTime: 0,
    hitstop: 0,
    shake: 0,
    slowmo: 0,
    rng: null,
    pellets: [],
    particles: [],
    candies: [],
    puddings: [],
    smokes: [],
    sfx: [],
    pelletAcc: 0,
    itemAcc: 0,
    events: [],
    holes: [],
    warnHole: null,
    spin: 0,
    frictionScale: 1,
    banner: null,
    alert: null,
    ranks: null,
    titles: [],
    board: null,
    match: null,
    room: null,
    pings: {},
    notice: '',
    look: loadLook(),
    winHeard: false,
    endReason: '',
    platform: {
      x: platform.centerX,
      y: platform.centerY,
      radius: platform.radii[0],
    },
    jellies: [],
  };
}

export function soloRoster(look) {
  const skins = CONFIG.theme.skins;
  const me = skins[look.color % skins.length];
  const bots = CONFIG.theme.bots;
  const names = ['你', '橙', '绿', '紫'];
  const roster = [{
    id: 'player',
    name: names[0],
    fill: me[0],
    light: me[1],
    dark: me[2],
    face: look.face % 6,
    ai: false,
    local: true,
    ring: true,
    peerId: null,
  }];
  for (let i = 0; i < CONFIG.ai.count; i += 1) {
    const color = bots[i % bots.length];
    roster.push({
      id: `ai${i}`,
      name: names[i + 1] || `AI${i + 1}`,
      fill: color[0],
      light: color[1],
      dark: color[2],
      face: (i + 1) % 6,
      ai: true,
      local: false,
      ring: false,
      peerId: null,
    });
  }
  return roster;
}

export function createRound(match, seed) {
  const state = blankMatch();
  const platform = state.platform;
  state.rng = createRng(seed >>> 0);
  state.seed = seed >>> 0;
  state.match = match;
  state.look = match.look || loadLook();
  const roster = match.roster;
  for (let i = 0; i < roster.length; i += 1) {
    const who = roster[i];
    const spot = SPOTS[i % SPOTS.length];
    const body = makeJelly(
      who.id,
      platform.x + spot[0],
      platform.y + spot[1],
      who.fill,
      who.light,
      who.dark,
      !!who.ring,
    );
    body.name = who.name;
    body.face = who.face || 0;
    body.ai = !!who.ai;
    body.local = !!who.local;
    body.peerId = who.peerId || null;
    body.score = match.scores[who.id] || 0;
    state.jellies.push(body);
  }
  for (let i = 0; i < CONFIG.pellets.startCount; i += 1) scatterPellet(state);
  state.events = scheduleEvents(state.rng);
  state.phase = 'COUNTDOWN';
  state.countdown = CONFIG.round.countdown;
  return state;
}

function best(bodies, key) {
  let max = 0;
  const picked = [];
  for (let i = 0; i < bodies.length; i += 1) {
    const value = bodies[i][key] || 0;
    if (value > max) {
      max = value;
      picked.length = 0;
      picked.push(bodies[i]);
    } else if (value === max && value > 0) picked.push(bodies[i]);
  }
  return picked;
}

function titlesOf(state) {
  const bodies = state.jellies;
  const rules = [
    ['kos', '撞人狂魔'],
    ['selfOut', '最爱自爆'],
    ['eaten', '吃货'],
    ['puddings', '布丁师傅'],
    ['hits', '横冲直撞'],
  ];
  const lines = [];
  for (let i = 0; i < rules.length; i += 1) {
    const group = best(bodies, rules[i][0]);
    for (let j = 0; j < group.length; j += 1) lines.push(`${group[j].name}·${rules[i][1]}`);
  }
  return lines;
}

function leaderCount(scores) {
  let top = 0;
  let count = 0;
  const ids = Object.keys(scores);
  for (let i = 0; i < ids.length; i += 1) top = Math.max(top, scores[ids[i]]);
  for (let i = 0; i < ids.length; i += 1) if (scores[ids[i]] === top) count += 1;
  return count;
}

/** 名次分 4/2/1/0，最后一击另加 1。三局后并列就加赛。 */
export function awardRound(state) {
  const ranks = state.ranks || rankRound(state);
  state.ranks = ranks;
  const table = CONFIG.round.placementScores;
  const scores = state.match.scores;
  for (let i = 0; i < ranks.length; i += 1) {
    const row = ranks[i];
    const body = findJelly(state, row.id);
    const place = i < table.length ? table[i] : 0;
    const bonus = body ? body.kos || 0 : 0;
    row.gain = place + bonus;
    row.bonus = bonus;
    row.total = (scores[row.id] || 0) + row.gain;
    scores[row.id] = row.total;
    if (body) body.score = row.total;
  }
  state.titles = titlesOf(state);
  state.match.played += 1;
  const tied = leaderCount(scores) > 1;
  state.match.overtime = state.match.played >= CONFIG.round.totalRounds && tied;
  state.board = state.match.played >= CONFIG.round.totalRounds && !tied ? 'final' : 'next';
  state.boardTime = 0;
}

export function findJelly(state, id) {
  const bodies = state.jellies;
  for (let i = 0; i < bodies.length; i += 1) if (bodies[i].id === id) return bodies[i];
  return null;
}

export function startSolo(look) {
  const match = {
    played: 0,
    scores: {},
    overtime: false,
    look,
    roster: soloRoster(look),
  };
  return createRound(match, Date.now() >>> 0);
}

/** 结算板继续：还有下一局就开，冠军已经出现就回大厅。 */
export function advanceMatch(state) {
  if (!state.match || state.board === 'final') return blankMatch();
  return createRound(state.match, Date.now() >>> 0);
}
