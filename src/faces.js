/** 六种表情。蓄力、挨打、淘汰会盖过皮肤。 */
export function drawFace(ctx, body, x, y, r) {
  const speed = Math.hypot(body.vx, body.vy) || 1;
  const look = Math.min(speed / 280, 1);
  const ox = (body.vx / speed) * r * 0.1 * look;
  const oy = (body.vy / speed) * r * 0.1 * look;
  const left = x - r * 0.32;
  const right = x + r * 0.32;
  const eyeY = y - r * 0.02;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.strokeStyle = '#5A2040';
  ctx.fillStyle = '#5A2040';

  if (!body.alive) {
    cry(ctx, left, right, eyeY, y, r);
    return;
  }
  if (body.charging) {
    angry(ctx, left, right, eyeY, y, r);
    return;
  }
  if ((body.dizzy || 0) > 0 || (body.flash > 0 && !body.flashUp)) {
    dizzy(ctx, left + ox, right + ox, eyeY + oy, r);
    return;
  }
  skin(ctx, body.face || 0, left + ox, right + ox, eyeY + oy, y + oy, r);
}

function skin(ctx, face, left, right, eyeY, mouthY, r) {
  if (face === 1) {
    brow(ctx, left, eyeY, r, 0.4);
    brow(ctx, right, eyeY, r, -0.4);
  } else if (face === 2) {
    star(ctx, left, eyeY, r * 0.16);
    star(ctx, right, eyeY, r * 0.16);
  } else if (face === 3) {
    dot(ctx, left, eyeY, r * 0.07);
    dot(ctx, right, eyeY, r * 0.07);
  } else if (face === 4) {
    brow(ctx, left, eyeY - r * 0.16, r, -0.7);
    brow(ctx, right, eyeY - r * 0.16, r, 0.7);
    dot(ctx, left, eyeY, r * 0.1);
    dot(ctx, right, eyeY, r * 0.1);
  } else if (face === 5) {
    heart(ctx, left, eyeY, r * 0.16);
    heart(ctx, right, eyeY, r * 0.16);
  } else {
    dot(ctx, left, eyeY, r * 0.14);
    dot(ctx, right, eyeY, r * 0.14);
    ctx.fillStyle = '#fff';
    dot(ctx, left + r * 0.05, eyeY - r * 0.05, r * 0.05);
    dot(ctx, right + r * 0.05, eyeY - r * 0.05, r * 0.05);
  }
  smile(ctx, (left + right) / 2, mouthY, r, false);
}

function angry(ctx, left, right, eyeY, y, r) {
  brow(ctx, left, eyeY - r * 0.18, r, -0.8);
  brow(ctx, right, eyeY - r * 0.18, r, 0.8);
  dot(ctx, left, eyeY, r * 0.12);
  dot(ctx, right, eyeY, r * 0.12);
  smile(ctx, (left + right) / 2, y, r, true);
}

function dizzy(ctx, left, right, eyeY, r) {
  ctx.beginPath();
  ctx.arc(left, eyeY, r * 0.16, 0, Math.PI * 1.6);
  ctx.arc(right, eyeY, r * 0.16, 0, Math.PI * 1.6);
  ctx.stroke();
}

function cry(ctx, left, right, eyeY, y, r) {
  brow(ctx, left, eyeY - r * 0.12, r, 0.6);
  brow(ctx, right, eyeY - r * 0.12, r, -0.6);
  dot(ctx, left, eyeY, r * 0.1);
  dot(ctx, right, eyeY, r * 0.1);
  ctx.beginPath();
  ctx.arc(left, eyeY + r * 0.22, r * 0.05, 0, Math.PI * 2);
  ctx.arc(right, eyeY + r * 0.22, r * 0.05, 0, Math.PI * 2);
  ctx.fill();
  smile(ctx, (left + right) / 2, y + r * 0.08, r, true);
}

function smile(ctx, x, y, r, frown) {
  ctx.beginPath();
  ctx.arc(x, frown ? y + r * 0.22 : y + r * 0.06, r * 0.28, frown ? Math.PI + 0.4 : 0.35, frown ? -0.4 : Math.PI - 0.35);
  ctx.stroke();
}

function dot(ctx, x, y, rad) {
  ctx.beginPath();
  ctx.arc(x, y, rad, 0, Math.PI * 2);
  ctx.fill();
}

function brow(ctx, x, y, r, tilt) {
  ctx.beginPath();
  ctx.moveTo(x - r * 0.16, y + tilt * r * 0.08);
  ctx.lineTo(x + r * 0.16, y - tilt * r * 0.08);
  ctx.stroke();
}

function star(ctx, x, y, rad) {
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI * 0.8;
    const px = x + Math.cos(angle) * rad;
    const py = y + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function heart(ctx, x, y, rad) {
  ctx.beginPath();
  ctx.arc(x - rad * 0.35, y, rad * 0.4, 0, Math.PI * 2);
  ctx.arc(x + rad * 0.35, y, rad * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - rad * 0.7, y + rad * 0.15);
  ctx.lineTo(x, y + rad);
  ctx.lineTo(x + rad * 0.7, y + rad * 0.15);
  ctx.fill();
}
