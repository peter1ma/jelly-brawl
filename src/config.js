/**
 * 全部可调数值。玩法说明见 GAME_DESIGN.md。
 * 单位默认是像素、秒、像素/秒。
 */
export const CONFIG = {
  view: {
    width: 1280,
    height: 720,
  },

  theme: {
    bgTop: '#3A1848',
    bgBottom: '#1B1024',
    jelly: '#FF6B9D',
    jellyLight: '#FFD0E0',
    jellyDark: '#E8437A',
    highlight: 'rgba(255,255,255,0.62)',
    ink: '#FFF6FB',
    candy: '#FF6B9D',
    dummy: '#FFB067',
    dummyLight: '#FFE1C2',
    dummyDark: '#E08A3C',
    bots: [
      ['#FFB067', '#FFE1C2', '#E08A3C'],
      ['#7DDECB', '#E5FFF8', '#2EAA90'],
      ['#C9A6FF', '#F3E9FF', '#8A62D6'],
    ],
    /** 开局可选的 6 种果冻颜色 */
    skins: [
      ['#FF6B9D', '#FFD0E0', '#E8437A'],
      ['#FFB067', '#FFE1C2', '#E08A3C'],
      ['#7DDECB', '#E5FFF8', '#2EAA90'],
      ['#C9A6FF', '#F3E9FF', '#8A62D6'],
      ['#8EC5FF', '#E5F2FF', '#3A7BD5'],
      ['#FFE08A', '#FFF6D0', '#E0B84A'],
    ],
  },

  input: {
    joystickRadius: 72,
    knobRadius: 28,
    deadzone: 0.12,
    /** 「冲」按钮直径，拇指热区 */
    chargeButton: 120,
  },

  physics: {
    hz: 60,
    /** 越大越快停下来。松手后大约 0.75 秒停住 */
    friction: 5,
    restitution: 0.62,
    slop: 0.4,
    /** 每步消掉多少重叠，1 表示一次分开 */
    correction: 1,
    maxSpeed: 1400,
    /** 低于这个速度就停住，避免停在原地微微滑动 */
    sleepSpeed: 8,
  },

  jelly: {
    /** 离开平台边缘后再超出这么多才淘汰 */
    eliminateMargin: 40,
    /** 走到体型移速时，沿速度方向拉长的比例 */
    stretchGain: 0.38,
    levels: [
      { level: 1, radius: 28, mass: 1, speed: 340, knock: 1, resist: 0.65 },
      { level: 2, radius: 42, mass: 1.85, speed: 250, knock: 1.55, resist: 1 },
      { level: 3, radius: 58, mass: 3.2, speed: 175, knock: 2.2, resist: 1.55 },
    ],
  },

  platform: {
    centerX: 640,
    centerY: 380,
    holdSeconds: 15,
    shrinkEvery: 8,
    shrinkAnim: 1.2,
    /** 0–15 秒用第一档，之后每 8 秒进下一档，最后一档是决战半径 */
    radii: [310, 265, 220, 175, 130],
    fill: '#FF8FB3',
    rim: '#FFD6E5',
  },

  charge: {
    moveScale: 0.4,
    maxSeconds: 1.2,
    cooldown: 0.4,
    minImpulse: 220,
    maxImpulse: 980,
    dashSeconds: 0.28,
    /** 冲刺期间摇杆还能拧动方向的比例 */
    dashSteer: 0.2,
    /** 命中时按冲刺速度追加的击飞强度 */
    hitScale: 0.45,
    /** 击飞时自己吃到的额外反冲 */
    recoil: 0.15,
  },

  combat: {
    hitstop: 0.08,
    shakeTime: 0.18,
    shakeMag: 14,
    demoteImpulse: 520,
    /** 一次重击只掉一级，这段时间内不再掉级 */
    hurtLock: 0.45,
    slowmoScale: 0.3,
    slowmoSeconds: 0.15,
    /** 重击轻震，iOS 没有 vibrate 时自动忽略 */
    vibrateMs: 18,
    lastHitWindow: 3,
  },

  pellets: {
    radius: 12,
    maxCount: 6,
    every: 3,
    growAnim: 0.35,
    /** 掉出来的果冻块先弹开，再允许任何人吃 */
    grace: 0.4,
    flash: 0.25,
    burst: 10,
    startCount: 3,
    color: '#FFE08A',
    particleLife: 0.45,
  },

  round: {
    duration: 60,
    countdown: 3,
    totalRounds: 3,
    /** 时间到或只剩一人之后，名次板出现前的停顿 */
    resultPause: 1.4,
    placementScores: [4, 2, 1, 0],
    lastHitBonus: 1,
  },

  events: {
    minCount: 1,
    maxCount: 2,
    windowStart: 15,
    windowEnd: 45,
    minGap: 8,
    /** 事件大字停留时间 */
    banner: 1.8,
    rotate: { omega: 0.55, edgeAccel: 90, duration: 12 },
    collapse: { warn: 2, sectorDeg: 52 },
    ice: { frictionScale: 0.2, duration: 10 },
    gravity: { interval: 3, warn: 1, impulse: 260, duration: 12 },
  },

  items: {
    every: 10,
    maxOnField: 3,
    radius: 16,
    fallSeconds: 0.45,
    spring: { knockMul: 2 },
    shield: { duration: 3 },
    magnet: { duration: 5, radius: 160, pull: 220 },
    smoke: { duration: 4, radius: 150 },
  },

  ghost: {
    puddingRadius: 36,
    puddingMass: 0.9,
    puddingLife: 8,
    cooldown: 10,
    alpha: 0.45,
  },

  ai: {
    count: 3,
    thinkEvery: 0.2,
    chargeChance: 0.35,
    /** 离敌人小于这个距离才考虑蓄力 */
    chargeRange: 160,
    holdMin: 0.35,
    holdMax: 1,
  },

  net: {
    snapshotMs: 50,
    minPlayers: 2,
    maxPlayers: 6,
    codeAlphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
    codeLength: 4,
    appId: 'jelly-brawl',
    /** 固定版本的 CDN。联机才动态加载，单机不依赖网络。 */
    trystero: 'https://cdn.jsdelivr.net/npm/@trystero-p2p/torrent@0.26.0/+esm',
    qr: 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm',
    /** 填 TURN 配置后，对称 NAT 也能连。见 NETWORK_NOTES.md */
    turn: null,
  },

  /** 加载页。还没有模型要读，进度先按这段时间走。 */
  boot: {
    holdSeconds: 5,
  },

  fx: {
    poolSize: 160,
  },
};
