import { CONFIG } from './config.js';

const FIELDS = [
  { label: '移速', min: 80, max: 700, step: 10, get: () => CONFIG.jelly.levels[0].speed, set: (v) => { CONFIG.jelly.levels[0].speed = v; } },
  { label: '摩擦', min: 0.5, max: 16, step: 0.1, get: () => CONFIG.physics.friction, set: (v) => { CONFIG.physics.friction = v; } },
  { label: '弹性', min: 0, max: 1, step: 0.01, get: () => CONFIG.physics.restitution, set: (v) => { CONFIG.physics.restitution = v; } },
  { label: '蓄力移速', min: 0.1, max: 1, step: 0.05, get: () => CONFIG.charge.moveScale, set: (v) => { CONFIG.charge.moveScale = v; } },
  { label: '最长蓄力', min: 0.2, max: 2.5, step: 0.05, get: () => CONFIG.charge.maxSeconds, set: (v) => { CONFIG.charge.maxSeconds = v; } },
  { label: '冲冷却', min: 0, max: 1.5, step: 0.05, get: () => CONFIG.charge.cooldown, set: (v) => { CONFIG.charge.cooldown = v; } },
  { label: '最小冲量', min: 0, max: 800, step: 10, get: () => CONFIG.charge.minImpulse, set: (v) => { CONFIG.charge.minImpulse = v; } },
  { label: '最大冲量', min: 100, max: 2000, step: 10, get: () => CONFIG.charge.maxImpulse, set: (v) => { CONFIG.charge.maxImpulse = v; } },
  { label: '冲刺时长', min: 0.05, max: 0.8, step: 0.01, get: () => CONFIG.charge.dashSeconds, set: (v) => { CONFIG.charge.dashSeconds = v; } },
  { label: '击飞系数', min: 0, max: 1.5, step: 0.05, get: () => CONFIG.charge.hitScale, set: (v) => { CONFIG.charge.hitScale = v; } },
  { label: '顿帧', min: 0, max: 0.3, step: 0.01, get: () => CONFIG.combat.hitstop, set: (v) => { CONFIG.combat.hitstop = v; } },
  { label: '震动', min: 0, max: 40, step: 1, get: () => CONFIG.combat.shakeMag, set: (v) => { CONFIG.combat.shakeMag = v; } },
];

function addSlider(list, field) {
  const row = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = field.label;
  const value = document.createElement('b');
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(field.min);
  input.max = String(field.max);
  input.step = String(field.step);
  const show = (raw) => {
    value.textContent = String(Math.round(Number(raw) * 100) / 100);
  };
  input.value = String(field.get());
  show(input.value);
  input.addEventListener('input', () => {
    field.set(Number(input.value));
    show(input.value);
  });
  row.append(name, value, input);
  list.append(row);
}

/** 仅 ?debug=1 时出现，滑杆直接改 CONFIG。 */
export function mountDebug() {
  if (document.getElementById('debug')) return;
  const enabled = new URLSearchParams(window.location.search).get('debug') === '1';
  if (!enabled) return;

  const root = document.createElement('div');
  root.id = 'debug';
  const head = document.createElement('button');
  head.type = 'button';
  head.textContent = '收起调参';
  const list = document.createElement('div');
  FIELDS.forEach((field) => addSlider(list, field));
  head.addEventListener('click', () => {
    list.hidden = !list.hidden;
    head.textContent = list.hidden ? '调参' : '收起调参';
  });
  root.append(head, list);

  const style = document.createElement('style');
  style.textContent = [
    '#debug{position:fixed;top:12px;right:12px;z-index:20;width:196px;',
    'padding:8px 10px;border-radius:14px;background:rgba(32,12,28,.9);',
    'color:#fff6fb;font:13px/1.3 "Segoe UI",sans-serif;touch-action:auto;}',
    '#debug button{width:100%;border:0;border-radius:10px;padding:8px;',
    'background:#ff6b9d;color:#fff;font-weight:700;}',
    '#debug label{display:grid;grid-template-columns:4.2em 2.6em;gap:0 6px;',
    'align-items:center;margin-top:8px;}',
    '#debug input{grid-column:1/3;width:100%;margin:0;}',
    '#debug b{text-align:right;font-weight:600;}',
  ].join('');
  document.head.append(style);
  document.body.append(root);
}
