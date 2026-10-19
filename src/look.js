const KEY = 'jelly-look';

/** 读取上次选的颜色和表情。没有存档时用粉色笑脸。 */
export function loadLook() {
  const fallback = { color: 0, face: 0 };
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '');
    const color = Number(saved.color) || 0;
    const face = Number(saved.face) || 0;
    return { color, face };
  } catch (err) {
    return fallback;
  }
}

export function saveLook(look) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify({ color: look.color, face: look.face }));
}
