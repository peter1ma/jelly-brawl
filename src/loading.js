/** 加载页。脚本会先读完，进度条暂定走满 5 秒再进大厅。 */

import { CONFIG } from './config.js';

const FILES = [
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './src/main.js',
  './src/config.js',
  './src/game.js',
  './src/input.js',
  './src/physics.js',
  './src/render.js',
  './src/ui.js',
  './src/rng.js',
  './src/ai.js',
  './src/growth.js',
  './src/events.js',
  './src/round.js',
  './src/hud.js',
  './src/look.js',
  './src/fx.js',
  './src/faces.js',
  './src/audio.js',
  './src/items.js',
  './src/ghost.js',
  './src/match.js',
  './src/charge.js',
  './src/board.js',
  './src/net.js',
  './src/online.js',
];

function wait(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

function paint(pct, text) {
  const fill = document.querySelector('.boot-fill');
  const num = document.querySelector('.boot-pct');
  const label = document.querySelector('.boot-label');
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  if (fill) fill.style.width = `${clamped}%`;
  if (num) num.textContent = `${clamped}%`;
  if (label && text) label.textContent = text;
}

function whenImageReady(img) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true });
    img.addEventListener('error', () => resolve(), { once: true });
  });
}

async function fetchOne(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(url);
  await response.arrayBuffer();
}

let clockOn = true;

const portraitPhone = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

function fullscreenOn() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

/** 手机竖持时把整页转成横屏，铺满屏幕。 */
function syncTurn() {
  document.documentElement.classList.toggle('turn-landscape', portraitPhone.matches);
  window.dispatchEvent(new Event('resize'));
}

function syncExit() {
  const button = document.getElementById('exit-full');
  if (button) button.hidden = !fullscreenOn();
}

function lockLandscape() {
  const pending = screen.orientation?.lock?.('landscape');
  if (pending?.catch) pending.catch(() => {});
}

/** 加载页就开始横屏全屏。没人点击时浏览器会拒绝，点一下再进。 */
function enterStage(event) {
  if (event?.target?.closest?.('#exit-full, #join, #update')) return;
  lockLandscape();
  if (fullscreenOn()) return;
  const root = document.documentElement;
  try {
    const pending = root.requestFullscreen
      ? root.requestFullscreen({ navigationUI: 'hide' })
      : root.webkitRequestFullscreen?.();
    if (pending?.then) pending.then(lockLandscape).catch(() => {});
  } catch {
    // 自动全屏被拦住时，等下一次点击。
  }
}

function leaveStage(event) {
  event.stopPropagation();
  const pending = document.exitFullscreen?.();
  if (pending?.catch) pending.catch(() => {});
  else document.webkitExitFullscreen?.();
}

function bindStage() {
  portraitPhone.addEventListener('change', syncTurn);
  window.addEventListener('orientationchange', syncTurn);
  window.addEventListener('pointerdown', enterStage);
  document.addEventListener('fullscreenchange', syncExit);
  document.addEventListener('webkitfullscreenchange', syncExit);
  document.getElementById('exit-full')?.addEventListener('click', leaveStage);
  syncTurn();
  syncExit();
  enterStage();
}

bindStage();

/** 暂定 5 秒。以后有模型时，改成按模型加载进度走。 */
function holdClock() {
  const ms = CONFIG.boot.holdSeconds * 1000;
  const started = performance.now();
  return new Promise((resolve) => {
    const frame = (now) => {
      if (!clockOn) return;
      const t = Math.min(1, (now - started) / ms);
      paint(t * 92, '正在加载资源...');
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

/** 预加载图片和脚本，再启动游戏。失败时留在加载页。 */
export async function runLoading() {
  const root = document.getElementById('boot');
  const img = document.querySelector('.boot-art');
  if (!root || !img) return;
  const tasks = FILES.map((url) => fetchOne(url));
  tasks.push(whenImageReady(img));

  try {
    await Promise.all([holdClock(), ...tasks]);
    let app = await import('./main.js');
    if (typeof app.launch !== 'function') {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));
      location.reload();
      return;
    }
    app.launch();
    paint(100, '进入大厅');
    await wait(240);
    root.classList.add('is-out');
    await wait(420);
    root.remove();
  } catch (err) {
    clockOn = false;
    paint(0, '加载失败，点击重试');
    root.addEventListener('pointerdown', () => location.reload(), { once: true });
  }
}

runLoading();
