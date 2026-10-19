import { CONFIG } from './config.js';
import { startGame } from './game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const { width: W, height: H } = CONFIG.view;

/** 读取安全区，避免刘海挡住画面。 */
function insets() {
  const style = getComputedStyle(document.documentElement);
  const px = (name) => parseFloat(style.getPropertyValue(name)) || 0;
  return {
    top: px('--sat'),
    right: px('--sar'),
    bottom: px('--sab'),
    left: px('--sal'),
  };
}

/** 把 1280×720 逻辑画面放进安全区，保持 16:9。竖持手机时页面已转成横屏。 */
function fit() {
  const turned = document.documentElement.classList.contains('turn-landscape');
  const view = window.visualViewport;
  const viewW = view?.width ?? window.innerWidth;
  const viewH = view?.height ?? window.innerHeight;
  const pad = insets();
  const availW = Math.max(1, (turned ? viewH : viewW) - pad.left - pad.right);
  const availH = Math.max(1, (turned ? viewW : viewH) - pad.top - pad.bottom);
  const originX = turned ? 0 : (view?.offsetLeft ?? 0);
  const originY = turned ? 0 : (view?.offsetTop ?? 0);
  const scale = Math.min(availW / W, availH / H);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
  canvas.style.left = `${originX + pad.left + (availW - W * scale) / 2}px`;
  canvas.style.top = `${originY + pad.top + (availH - H * scale) / 2}px`;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/** 加载页结束后再开画布，避免一进来就跳进大厅。 */
export function launch() {
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);
  window.visualViewport?.addEventListener('resize', fit);
  window.visualViewport?.addEventListener('scroll', fit);
  startGame(canvas, ctx);
}

/** 新的 Service Worker 在等着时，让玩家自己点更新。 */
function offerUpdate(worker) {
  const button = document.getElementById('update');
  if (!button || !worker) return;
  button.hidden = false;
  button.onclick = () => {
    worker.postMessage('skip-waiting');
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  };
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker);
      });
    });
  }).catch(() => {});
}
