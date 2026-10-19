import { CONFIG } from './config.js';

const MUTE_KEY = 'jelly-mute';
let ctx = null;
let chargeNode = null;
let chargeGain = null;
let mute = false;
let lastBeep = 0;

function context() {
  if (ctx) return ctx;
  const Ctx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  if (!Ctx) return null;
  ctx = new Ctx();
  return ctx;
}

/** 首次触摸后才能出声，iOS 会拦住自动播放。 */
export function unlockAudio() {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1') mute = true;
  const audio = context();
  if (audio && audio.state === 'suspended') audio.resume();
}

export function isMuted() {
  return mute;
}

export function toggleMute() {
  mute = !mute;
  if (typeof localStorage !== 'undefined') localStorage.setItem(MUTE_KEY, mute ? '1' : '0');
  if (mute) stopCharge();
  return mute;
}

function envGain(audio, duration, peak) {
  const gain = audio.createGain();
  const now = audio.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  gain.connect(audio.destination);
  return gain;
}

function tone(freq, duration, type, peak) {
  const audio = context();
  if (!audio || mute) return;
  const osc = audio.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audio.currentTime);
  osc.connect(envGain(audio, duration, peak));
  osc.start();
  osc.stop(audio.currentTime + duration + 0.02);
}

function noise(duration) {
  const audio = context();
  if (!audio || mute) return;
  const length = Math.floor(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  src.connect(filter);
  filter.connect(envGain(audio, duration, 0.35));
  src.start();
}

function stopCharge() {
  if (chargeNode) {
    chargeNode.stop();
    chargeNode.disconnect();
    chargeNode = null;
  }
}

/** 蓄力时音高跟着升高。只跟本地果冻，避免四个一起叫。 */
export function syncCharge(active, ratio) {
  const audio = context();
  if (!audio || mute || !active) {
    stopCharge();
    return;
  }
  if (!chargeNode) {
    chargeNode = audio.createOscillator();
    chargeGain = audio.createGain();
    chargeNode.type = 'sawtooth';
    chargeGain.gain.value = 0.04;
    chargeNode.connect(chargeGain);
    chargeGain.connect(audio.destination);
    chargeNode.start();
  }
  const span = CONFIG.charge.maxSeconds || 1;
  chargeNode.frequency.value = 180 + 420 * Math.min(1, ratio / span);
}

function playOne(name) {
  if (name === 'dash') tone(520, 0.09, 'sine', 0.2);
  else if (name === 'hit') noise(0.08);
  else if (name === 'eat') tone(880, 0.07, 'sine', 0.16);
  else if (name === 'out') tone(220, 0.22, 'triangle', 0.2);
  else if (name === 'win') {
    tone(523, 0.12, 'sine', 0.16);
    tone(659, 0.12, 'sine', 0.14);
    tone(784, 0.18, 'sine', 0.16);
  }
}

/** 播放这一帧积下来的音效。 */
export function playCues(list) {
  if (!list) return;
  for (let i = 0; i < list.length; i += 1) playOne(list[i]);
}

/** 倒计时每跳一档响一声。 */
export function watchRound(state) {
  const n = state.phase === 'COUNTDOWN' ? Math.max(1, Math.ceil(state.countdown || 0)) : 0;
  if (n > 0 && n !== lastBeep) tone(660, 0.06, 'square', 0.08);
  lastBeep = n;
  if (state.phase === 'SCOREBOARD' && state.board === 'final' && !state.winHeard) {
    state.winHeard = true;
    playOne('win');
  }
}
