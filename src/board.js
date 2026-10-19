import { CONFIG } from './config.js';

const { width: W, height: H } = CONFIG.view;

/** 一局名次、加分动画和称号。横屏时整块板落在画面内。 */
export function drawBoard(ctx, state) {
  const ranks = state.ranks || [];
  const titles = state.titles || [];
  const played = state.match ? state.match.played : 1;
  const overtime = state.match && state.match.overtime;
  let title = '本局名次';
  if (state.phase === 'ROUND_END') title = state.endReason === 'last' ? '分出胜负' : '时间到';
  else if (state.board === 'final') title = '冠军诞生';
  else if (overtime) title = `加赛 · 第 ${played} 局`;
  else title = `第 ${played} / ${CONFIG.round.totalRounds} 局`;

  const rowH = 40;
  const titleH = 24;
  const panelH = Math.min(H - 36, 108 + ranks.length * rowH + titles.length * titleH);
  const top = Math.max(18, (H - panelH) / 2);
  const panelW = Math.min(820, W - 180);
  const left = (W - panelW) / 2;

  ctx.fillStyle = 'rgba(20, 6, 16, 0.78)';
  ctx.fillRect(left, top, panelW, panelH);
  ctx.fillStyle = '#fff6fb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 36px "Trebuchet MS", "Segoe UI", sans-serif';
  ctx.fillText(title, W / 2, top + 36);

  const shown = state.phase === 'SCOREBOARD' ? Math.min(1, (state.boardTime || 0) / 0.8) : 1;
  ctx.font = '24px "Segoe UI", sans-serif';
  for (let i = 0; i < ranks.length; i += 1) {
    const row = ranks[i];
    const y = top + 78 + i * rowH;
    const gain = Math.round((row.gain || 0) * shown);
    const total = (row.total || 0) - (row.gain || 0) + gain;
    ctx.fillStyle = row.fill || '#fff';
    ctx.beginPath();
    ctx.arc(left + 42, y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6fb';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}. ${row.name}  +${gain}  总${total}`, left + 64, y);
  }

  ctx.textAlign = 'center';
  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillStyle = '#FFE08A';
  const titleTop = top + 78 + ranks.length * rowH + 4;
  for (let i = 0; i < titles.length; i += 1) ctx.fillText(titles[i], W / 2, titleTop + i * titleH);

  if (state.phase === 'SCOREBOARD') {
    ctx.fillStyle = '#fff6fb';
    ctx.font = '22px "Segoe UI", sans-serif';
    let hint = '点击下一局';
    if (state.waitHost) hint = '等待房主';
    else if (state.board === 'final') hint = '点击回大厅';
    ctx.fillText(hint, W / 2, top + panelH - 24);
  }
}
