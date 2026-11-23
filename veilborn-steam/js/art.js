'use strict';
// ============================================================
//  VEILBORN - procedural painterly art (smooth, not pixelated)
// ============================================================
const PAL = {
  ruins:  { stone: ['#74747e', '#3a3a46'], moss: '#6aae55', mossD: '#3f7137', sky: ['#101c26', '#27403f', '#7fa591'], fog: '200,235,220' },
  crypt:  { stone: ['#54444f', '#241d28'], moss: '#9a4f74', mossD: '#5e2a48', sky: ['#07040a', '#1d0c18', '#3a1626'], fog: '200,140,170' },
  chapel: { stone: ['#66737f', '#2b3340'], moss: '#4f9a90', mossD: '#2c615c', sky: ['#070b14', '#1a2638', '#4a5f7a'], fog: '170,200,235' }
};

function rng(seed) { let s = (seed >>> 0) % 2147483647 || 1; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

function mkTex(scene, key, w, h, fn) {
  if (scene.textures.exists(key)) return key;
  const t = scene.textures.createCanvas(key, w, h);
  fn(t.getContext(), w, h);
  t.refresh();
  return key;
}
function ell(ctx, x, y, rx, ry, fill, rot) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function qb(p0, p1, p2, t) {
  const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y };
}
// Unsettling too-wide grin full of teeth
function grin(ctx, cx, cy, w, teeth, curve) {
  curve = curve === undefined ? 1 : curve;
  const p0 = { x: cx - w / 2, y: cy }, p2 = { x: cx + w / 2, y: cy };
  const top = { x: cx, y: cy + w * 0.12 * curve }, bot = { x: cx, y: cy + w * 0.5 * curve };
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(bot.x, bot.y, p2.x, p2.y); ctx.quadraticCurveTo(top.x, top.y, p0.x, p0.y);
  ctx.fillStyle = '#14060a'; ctx.fill();
  ctx.strokeStyle = '#efe6da'; ctx.lineWidth = Math.max(1.2, w / 40);
  for (let i = 1; i < teeth; i++) {
    const t = i / teeth, a = qb(p0, top, p2, t), b = qb(p0, bot, p2, t);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x + (b.x - a.x) * 0.5, a.y + (b.y - a.y) * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x + (a.x - b.x) * 0.5, b.y + (a.y - b.y) * 0.5); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(20,6,10,0.9)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.quadraticCurveTo(top.x, top.y, p2.x, p2.y); ctx.stroke();
}
function paleFace(ctx, cx, cy, rx, ry, eyeGap, eyeSize, teeth, mouthW) {
  const g = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, 2, cx, cy, ry * 1.1);
  g.addColorStop(0, '#f1ebe4'); g.addColorStop(1, '#a89c98');
  ell(ctx, cx, cy, rx, ry, g);
  // sunken, mismatched eyes
  ell(ctx, cx - eyeGap, cy - ry * 0.12, eyeSize, eyeSize * 1.5, '#07040a');
  ell(ctx, cx + eyeGap, cy - ry * 0.08, eyeSize * 0.85, eyeSize * 1.35, '#07040a');
  ell(ctx, cx - eyeGap + 1, cy - ry * 0.2, eyeSize * 0.22, eyeSize * 0.22, '#ffffff');
  ell(ctx, cx + eyeGap + 1, cy - ry * 0.16, eyeSize * 0.2, eyeSize * 0.2, '#ffffff');
  grin(ctx, cx, cy + ry * 0.38, mouthW, teeth, 1);
  // faint blush that shouldn't be there
  ell(ctx, cx - rx * 0.6, cy + ry * 0.15, rx * 0.18, ry * 0.1, 'rgba(210,90,110,0.35)');
  ell(ctx, cx + rx * 0.6, cy + ry * 0.15, rx * 0.18, ry * 0.1, 'rgba(210,90,110,0.35)');
}
function icoBase(ctx, c1, c2) {
  const g = ctx.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(32, 32, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.stroke();
}
function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }

// ---------- stone ----------
function stoneTex(ctx, w, h, th, kind) {
  const pal = PAL[th], r = rng(w * 7 + h * 3 + th.length * 101);
  ctx.save();
  ctx.beginPath();
  if (kind === 'ground') { ctx.rect(0, 0, w, h); }
  else {
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, 14); ctx.lineTo(w - 12, 28); ctx.lineTo(w * 0.72, h * 0.78);
    ctx.lineTo(w * 0.56, h); ctx.lineTo(w * 0.42, h * 0.8); ctx.lineTo(12, 30); ctx.lineTo(0, 14); ctx.closePath();
  }
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, pal.stone[0]); g.addColorStop(1, pal.stone[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // bricks
  const bh = kind === 'ground' ? 26 : 16;
  for (let y = 0, row = 0; y < h; y += bh, row++) {
    ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(0, y, w, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(0, y + 2, w, 1);
    let x = (row % 2) * 24 - r() * 10;
    while (x < w) {
      const bw = 44 + r() * 36;
      ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(x, y, 2, bh);
      if (r() < 0.35) { ctx.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(x + 2, y + 2, bw - 3, bh - 3); }
      if (r() < 0.12) { ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + bw * 0.3, y + 3); ctx.lineTo(x + bw * 0.5, y + bh * 0.5); ctx.lineTo(x + bw * 0.4, y + bh - 3); ctx.stroke(); }
      x += bw;
    }
  }
  if (kind === 'ground') { const dg = ctx.createLinearGradient(0, h * 0.3, 0, h); dg.addColorStop(0, 'rgba(0,0,0,0)'); dg.addColorStop(1, 'rgba(0,0,0,0.75)'); ctx.fillStyle = dg; ctx.fillRect(0, 0, w, h); }
  ctx.restore();
  // moss cap
  ctx.fillStyle = pal.mossD; ctx.beginPath(); ctx.moveTo(0, 0);
  for (let x = 0; x <= w; x += 6) ctx.lineTo(x, 8 + r() * 10);
  ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = pal.moss; ctx.beginPath(); ctx.moveTo(0, 0);
  for (let x = 0; x <= w; x += 5) ctx.lineTo(x, 4 + r() * 6);
  ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(0, 0, w, 2);
  // hanging tufts / roots
  const tufts = Math.floor(w / 26);
  for (let i = 0; i < tufts; i++) {
    const x = r() * w, len = 8 + r() * (kind === 'ground' ? 18 : 30);
    ctx.strokeStyle = r() < 0.5 ? pal.mossD : pal.moss; ctx.lineWidth = 2 + r() * 2;
    ctx.beginPath(); ctx.moveTo(x, 8); ctx.quadraticCurveTo(x + (r() - 0.5) * 8, 8 + len * 0.5, x + (r() - 0.5) * 6, 8 + len); ctx.stroke();
  }
}
function getPlat(scene, w, h, th, kind) {
  return mkTex(scene, `pl_${th}_${kind}_${w}_${h}`, w, h, (ctx) => stoneTex(ctx, w, h, th, kind));
}

// ---------- backgrounds ----------
function bgFar(ctx, w, h, th) {
  const pal = PAL[th], r = rng(th.length * 997);
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, pal.sky[0]); g.addColorStop(0.55, pal.sky[1]); g.addColorStop(1, pal.sky[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  if (th !== 'ruins') for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; ctx.fillRect(r() * w, r() * h * 0.55, 1.6, 1.6); }
  // moon
  const mx = 960, my = 150;
  const mg = ctx.createRadialGradient(mx, my, 10, mx, my, 170); mg.addColorStop(0, 'rgba(255,250,235,0.55)'); mg.addColorStop(1, 'rgba(255,250,235,0)');
  ctx.fillStyle = mg; ctx.fillRect(mx - 180, my - 180, 360, 360);
  ell(ctx, mx, my, 46, 46, '#f2ecdc'); ell(ctx, mx + 12, my - 8, 38, 38, 'rgba(210,200,185,0.45)');
  // distant ridges (seamless: integer sine cycles)
  const layers = [{ c: 'rgba(14,22,28,0.55)', base: 470, amp: 55, k: 2 }, { c: 'rgba(8,14,18,0.75)', base: 520, amp: 45, k: 3 }];
  layers.forEach(L => {
    ctx.fillStyle = L.c; ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, L.base + Math.sin(x / w * Math.PI * 2 * L.k) * L.amp + Math.sin(x / w * Math.PI * 2 * (L.k * 3 + 1)) * 14);
    ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
  });
  // far ruined towers
  [180, 520, 820, 1130].forEach((x, i) => {
    const th2 = 150 + (i % 2) * 70;
    ctx.fillStyle = 'rgba(6,10,14,0.85)'; ctx.fillRect(x, 560 - th2, 46, th2);
    ctx.beginPath(); ctx.moveTo(x, 560 - th2); ctx.lineTo(x + 12, 548 - th2); ctx.lineTo(x + 24, 566 - th2); ctx.lineTo(x + 36, 546 - th2); ctx.lineTo(x + 46, 560 - th2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.28)'; ctx.fillRect(x + 18, 590 - th2, 8, 16);
  });
}
function archShape(ctx, x, base, wid, hei, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x, base - hei, 26, hei); ctx.fillRect(x + wid - 26, base - hei, 26, hei);
  ctx.beginPath(); ctx.moveTo(x, base - hei); ctx.quadraticCurveTo(x + wid / 2, base - hei - wid * 0.7, x + wid, base - hei);
  ctx.lineTo(x + wid - 26, base - hei); ctx.quadraticCurveTo(x + wid / 2, base - hei - wid * 0.46, x + 26, base - hei); ctx.closePath(); ctx.fill();
}
function bgMid(ctx, w, h, th) {
  const r = rng(th.length * 313 + 7);
  const col = th === 'ruins' ? 'rgba(14,26,26,0.78)' : th === 'crypt' ? 'rgba(22,8,16,0.82)' : 'rgba(12,18,28,0.8)';
  [60, 470, 900].forEach((x, i) => archShape(ctx, x, 640, 200 + (i % 2) * 40, 230 - i * 20, col));
  // broken pillars
  [330, 760, 1160].forEach((x, i) => { const hh = 180 + r() * 170; ctx.fillStyle = col; ctx.fillRect(x, 640 - hh, 34, hh);
    ctx.beginPath(); ctx.moveTo(x, 640 - hh); ctx.lineTo(x + 10, 626 - hh); ctx.lineTo(x + 22, 646 - hh); ctx.lineTo(x + 34, 630 - hh); ctx.lineTo(x + 34, 640 - hh); ctx.fill(); });
  if (th === 'ruins') { // twisted dead trees
    ctx.strokeStyle = 'rgba(10,18,16,0.85)'; ctx.lineCap = 'round';
    [250, 640, 1050].forEach(x => { ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x, 650); ctx.quadraticCurveTo(x - 20, 520, x + 10, 430); ctx.stroke();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 8, 470); ctx.quadraticCurveTo(x + 50, 430, x + 70, 380); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 4, 500); ctx.quadraticCurveTo(x - 40, 450, x - 60, 400); ctx.stroke(); });
  } else { // hanging chains
    ctx.strokeStyle = 'rgba(8,4,8,0.8)'; ctx.lineWidth = 3;
    for (let i = 0; i < 9; i++) { const x = 90 + i * 140 + r() * 40, l = 80 + r() * 200; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, l); ctx.stroke(); ell(ctx, x, l + 8, 8, 10, 'rgba(8,4,8,0.8)'); }
  }
}
function bgFog(ctx, w, h, th) {
  const pal = PAL[th], r = rng(th.length * 71 + 3);
  for (let i = 0; i < 16; i++) {
    const x = r() * w, y = 520 + r() * 160, rx = 160 + r() * 220, ry = 22 + r() * 36;
    [-w, 0, w].forEach(o => { const g = ctx.createRadialGradient(x + o, y, 4, x + o, y, rx); g.addColorStop(0, `rgba(${pal.fog},0.16)`); g.addColorStop(1, `rgba(${pal.fog},0)`);
      ctx.save(); ctx.translate(x + o, y); ctx.scale(1, ry / rx); ctx.translate(-(x + o), -y); ctx.fillStyle = g; ctx.fillRect(x + o - rx, y - rx, rx * 2, rx * 2); ctx.restore(); });
  }
}

// ---------- characters ----------
function drawHollow(ctx) {
  // tall, wrong. Rags, too-long arms, a face that smiles all the time.
  ctx.fillStyle = '#17121c'; ctx.beginPath(); ctx.moveTo(30, 62); ctx.lineTo(60, 62); ctx.lineTo(68, 150); ctx.lineTo(44, 138); ctx.lineTo(22, 152); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#8f8480'; ctx.lineCap = 'round'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(32, 66); ctx.quadraticCurveTo(10, 110, 14, 164); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(58, 66); ctx.quadraticCurveTo(84, 108, 76, 166); ctx.stroke();
  ctx.lineWidth = 3; // fingers
  [[14, 164], [76, 166]].forEach(([x, y]) => { for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + i * 3, y + 6 + Math.abs(i)); ctx.stroke(); } });
  ctx.lineWidth = 7; ctx.strokeStyle = '#6f6561';
  ctx.beginPath(); ctx.moveTo(38, 140); ctx.lineTo(34, 168); ctx.stroke(); ctx.beginPath(); ctx.moveTo(52, 140); ctx.lineTo(58, 168); ctx.stroke();
  ctx.strokeStyle = '#b3a9a4'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(45, 54); ctx.lineTo(45, 66); ctx.stroke(); // neck
  ctx.save(); ctx.translate(45, 30); ctx.rotate(0.12); ctx.translate(-45, -30); paleFace(ctx, 45, 30, 17, 25, 8, 4.2, 14, 26); ctx.restore();
  ctx.strokeStyle = '#150f18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(30, 12); ctx.quadraticCurveTo(45, -4, 62, 14); ctx.stroke(); // stringy hair
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(30 + i * 6, 8); ctx.lineTo(26 + i * 7, 38 + (i % 3) * 8); ctx.stroke(); }
}
function drawSmiler(ctx) {
  ctx.strokeStyle = '#120c16'; ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(28 + i * 4.5, 40); ctx.quadraticCurveTo(10 + i * 8, 90, 20 + i * 7, 108); ctx.stroke(); }
  const g = ctx.createRadialGradient(46, 40, 4, 55, 50, 56); g.addColorStop(0, '#f3ede6'); g.addColorStop(1, '#a4989a');
  ell(ctx, 55, 50, 46, 42, g);
  ell(ctx, 36, 40, 6, 8, '#06030a'); ell(ctx, 76, 38, 5, 7, '#06030a'); ell(ctx, 37, 37, 1.6, 1.6, '#fff'); ell(ctx, 77, 35, 1.4, 1.4, '#fff');
  grin(ctx, 55, 58, 76, 22, 1);
  ell(ctx, 24, 54, 7, 4, 'rgba(210,90,110,0.4)'); ell(ctx, 86, 54, 7, 4, 'rgba(210,90,110,0.4)');
}
function drawCrawler(ctx) {
  ctx.strokeStyle = '#a89c98'; ctx.lineCap = 'round'; ctx.lineWidth = 6;
  [[30, 30, 6, 60], [50, 32, 40, 74], [86, 30, 112, 74], [106, 28, 136, 58]].forEach(([x1, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(x1, y1 + 8); ctx.lineTo((x1 + x2) / 2 + 6, y1 - 4); ctx.lineTo(x2, y2); ctx.stroke(); ctx.lineWidth = 2.5; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 + i * 4, y2 + 7); ctx.stroke(); } ctx.lineWidth = 6; });
  ell(ctx, 68, 36, 40, 17, '#201722'); ell(ctx, 68, 34, 34, 11, '#33263a');
  ctx.save(); ctx.translate(112, 30); ctx.rotate(Math.PI * 0.92); paleFace(ctx, 0, 0, 15, 19, 6, 3.4, 11, 20); ctx.restore();
}
function drawWarden(ctx) {
  ctx.fillStyle = '#120d14'; ctx.beginPath(); ctx.moveTo(70, 90); ctx.lineTo(170, 90); ctx.lineTo(210, 296); ctx.lineTo(30, 296); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#6e6668'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (let i = 0; i < 5; i++) { const y = 112 + i * 28; ctx.beginPath(); ctx.moveTo(78 + i * 3, y); ctx.quadraticCurveTo(120, y + 24, 162 - i * 3, y); ctx.stroke(); }
  ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(120, 96); ctx.lineTo(120, 232); ctx.stroke();
  ctx.strokeStyle = '#9a8f8d'; ctx.lineWidth = 12; // long arms with chains
  ctx.beginPath(); ctx.moveTo(72, 100); ctx.quadraticCurveTo(14, 170, 22, 270); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(168, 100); ctx.quadraticCurveTo(226, 170, 218, 270); ctx.stroke();
  ctx.strokeStyle = '#2a2428'; ctx.lineWidth = 4; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(22 + (i % 2) * 4, 228 + i * 6, 5, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.arc(218 - (i % 2) * 4, 228 + i * 6, 5, 0, 7); ctx.stroke(); }
  ell(ctx, 120, 62, 46, 52, '#1c1620');
  paleFace(ctx, 120, 62, 36, 46, 15, 7.5, 20, 52);
  ctx.strokeStyle = '#53494c'; ctx.lineWidth = 5; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(120 + i * 12, 10); ctx.lineTo(120 + i * 14, 112); ctx.stroke(); } // cage over face
}
function drawMother(ctx) {
  ctx.fillStyle = '#0f0a14'; ctx.beginPath(); ctx.moveTo(100, 120); ctx.lineTo(200, 120); ctx.lineTo(290, 326); ctx.lineTo(10, 326); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, 120, 0, 326); g.addColorStop(0, 'rgba(230,220,235,0.35)'); g.addColorStop(1, 'rgba(230,220,235,0.05)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(110, 130); ctx.lineTo(190, 130); ctx.lineTo(270, 322); ctx.lineTo(30, 322); ctx.closePath(); ctx.fill(); // pale veil-like gown
  ctx.strokeStyle = '#b4aaa8'; ctx.lineCap = 'round'; ctx.lineWidth = 7; // many too-long arms
  [[-1, 30, 210], [-1, 90, 250], [-1, 150, 190], [1, 30, 210], [1, 90, 250], [1, 150, 190]].forEach(([s, dy, ex]) => {
    const sx = 150 + s * 40, sy = 130 + dy * 0.3;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(150 + s * 130, sy + dy, 150 + s * (ex * 0.55), 200 + dy); ctx.stroke();
    ctx.lineWidth = 3; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(150 + s * (ex * 0.55), 200 + dy); ctx.lineTo(150 + s * (ex * 0.55) + i * 4, 212 + dy + Math.abs(i)); ctx.stroke(); } ctx.lineWidth = 7; });
  ctx.strokeStyle = '#cfc6c2'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(150, 100); ctx.lineTo(150, 136); ctx.stroke(); // neck
  ctx.strokeStyle = 'rgba(15,10,20,0.9)'; ctx.lineWidth = 3; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.moveTo(120 + i * 4.5, 22); ctx.quadraticCurveTo(100 + i * 7, 90, 90 + i * 9, 190 + (i % 4) * 10); ctx.stroke(); }
  paleFace(ctx, 150, 66, 40, 52, 16, 8, 24, 60);
  ell(ctx, 150, 30, 7, 9, '#07040a'); // third eye
  ctx.fillStyle = 'rgba(235,230,240,0.55)'; ctx.beginPath(); ctx.moveTo(100, 20); ctx.quadraticCurveTo(150, -6, 200, 20); ctx.lineTo(210, 140); ctx.lineTo(90, 140); ctx.closePath(); ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1; // veil
}

// ---------- props / items ----------
function drawDoor(ctx, art) {
  const crypt = art === 'crypt';
  ctx.fillStyle = crypt ? '#3a2c38' : '#55606c'; archShape(ctx, 0, 190, 120, 130, crypt ? '#3a2c38' : '#55606c');
  const g = ctx.createLinearGradient(0, 40, 0, 190); g.addColorStop(0, '#05030a'); g.addColorStop(1, crypt ? '#240a16' : '#14202c');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(26, 190); ctx.lineTo(26, 80); ctx.quadraticCurveTo(60, 20, 94, 80); ctx.lineTo(94, 190); ctx.closePath(); ctx.fill();
  if (crypt) { ctx.strokeStyle = '#6a5a60'; ctx.lineWidth = 4; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(34 + i * 13, 190); ctx.lineTo(34 + i * 13, 60 + Math.abs(2 - i) * 14); ctx.stroke(); }
    ell(ctx, 60, 36, 9, 11, '#d7cdc3'); ell(ctx, 56, 34, 2.4, 3, '#05030a'); ell(ctx, 64, 34, 2.4, 3, '#05030a'); }
  else { const mg = ctx.createRadialGradient(60, 130, 4, 60, 130, 60); mg.addColorStop(0, 'rgba(190,220,255,0.55)'); mg.addColorStop(1, 'rgba(190,220,255,0)'); ctx.fillStyle = mg; ctx.fillRect(20, 60, 80, 130); }
  ctx.fillStyle = 'rgba(80,140,70,0.9)'; ctx.fillRect(0, 56, 26, 6); ctx.fillRect(94, 56, 26, 6);
}
function drawSign(ctx) {
  ctx.fillStyle = '#2a2420'; ctx.fillRect(34, 40, 8, 40);
  const g = ctx.createLinearGradient(0, 0, 0, 44); g.addColorStop(0, '#7b7a82'); g.addColorStop(1, '#46444e');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(8, 40); ctx.lineTo(8, 14); ctx.quadraticCurveTo(38, -6, 68, 14); ctx.lineTo(68, 40); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(190,150,255,0.95)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(38, 24, 8, 0, 6.3); ctx.moveTo(38, 14); ctx.lineTo(38, 34); ctx.moveTo(30, 24); ctx.lineTo(46, 24); ctx.stroke();
  ctx.fillStyle = 'rgba(80,140,70,0.9)'; ctx.fillRect(8, 12, 60, 4);
}
function drawSpikes(ctx, w) {
  for (let x = 0; x < w; x += 18) { const g = ctx.createLinearGradient(0, 0, 0, 34); g.addColorStop(0, '#d8d0d4'); g.addColorStop(1, '#4a3c46');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 34); ctx.lineTo(x + 9, 2); ctx.lineTo(x + 18, 34); ctx.closePath(); ctx.fill(); }
}
function drawBook(ctx, col) {
  icoBase(ctx, 'rgba(30,20,40,0.9)', 'rgba(10,6,16,0.95)');
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(18, 20); ctx.lineTo(46, 17); ctx.lineTo(46, 46); ctx.lineTo(18, 49); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(22, 24, 20, 3); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(18, 20, 5, 29);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(34, 35, 6, 0, 6.3); ctx.stroke();
}
function drawPowerIcon(ctx, id) {
  icoBase(ctx, '#3a2358', '#150c24'); ctx.strokeStyle = '#f0e4ff'; ctx.fillStyle = '#f0e4ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  if (id === 'slow_time') { ctx.beginPath(); ctx.moveTo(22, 16); ctx.lineTo(42, 16); ctx.lineTo(32, 32); ctx.lineTo(42, 48); ctx.lineTo(22, 48); ctx.lineTo(32, 32); ctx.closePath(); ctx.stroke(); ctx.fillRect(28, 40, 8, 5); }
  else if (id === 'shroud') { ctx.beginPath(); ctx.ellipse(32, 32, 16, 9, 0, 0, 6.3); ctx.stroke(); ell(ctx, 32, 32, 5, 5, '#f0e4ff'); ctx.beginPath(); ctx.moveTo(16, 46); ctx.lineTo(48, 18); ctx.stroke(); }
  else if (id === 'step') { [14, 26, 38].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 18); ctx.lineTo(x + 10, 32); ctx.lineTo(x, 46); ctx.stroke(); }); }
  else if (id === 'blades') { [[-12, 0], [0, -4], [12, 0]].forEach(([dx]) => { ctx.beginPath(); ctx.moveTo(32 + dx, 48); ctx.lineTo(32 + dx * 1.4, 14); ctx.stroke(); }); }
  else if (id === 'bone') { ctx.beginPath(); ctx.moveTo(32, 14); ctx.lineTo(48, 20); ctx.lineTo(46, 38); ctx.quadraticCurveTo(40, 50, 32, 52); ctx.quadraticCurveTo(24, 50, 18, 38); ctx.lineTo(16, 20); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(32, 20); ctx.lineTo(32, 46); ctx.moveTo(22, 28); ctx.lineTo(42, 28); ctx.stroke(); }
  else if (id === 'moon') { ctx.beginPath(); ctx.arc(32, 32, 16, 0.6, 5.7); ctx.stroke(); ctx.beginPath(); ctx.arc(40, 28, 12, 0.7, 5.6); ctx.stroke(); }
}
function drawGearIcon(ctx, slot, tint) {
  icoBase(ctx, '#2b2236', '#100a18'); ctx.fillStyle = tint; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  if (slot === 'head') { ctx.beginPath(); ctx.moveTo(32, 10); ctx.lineTo(44, 40); ctx.lineTo(54, 44); ctx.lineTo(10, 44); ctx.lineTo(20, 40); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (slot === 'chest') { ctx.beginPath(); ctx.moveTo(18, 16); ctx.lineTo(46, 16); ctx.lineTo(50, 28); ctx.lineTo(42, 30); ctx.lineTo(42, 50); ctx.lineTo(22, 50); ctx.lineTo(22, 30); ctx.lineTo(14, 28); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else if (slot === 'feet') { ctx.beginPath(); ctx.moveTo(22, 14); ctx.lineTo(36, 14); ctx.lineTo(36, 38); ctx.lineTo(52, 44); ctx.lineTo(52, 52); ctx.lineTo(18, 52); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(32, 36, 14, 0, 6.3); ctx.lineWidth = 6; ctx.strokeStyle = tint; ctx.stroke(); ell(ctx, 32, 20, 6, 6, '#fff'); }
}

function buildTextures(scene) {
  ['ruins', 'crypt', 'chapel'].forEach(th => {
    mkTex(scene, 'bgfar_' + th, W, H, (c, w, h) => bgFar(c, w, h, th));
    mkTex(scene, 'bgmid_' + th, W, H, (c, w, h) => bgMid(c, w, h, th));
    mkTex(scene, 'bgfog_' + th, W, H, (c, w, h) => bgFog(c, w, h, th));
  });
  mkTex(scene, 'hollow', 90, 170, drawHollow);
  mkTex(scene, 'smiler', 110, 110, drawSmiler);
  mkTex(scene, 'crawler', 140, 80, drawCrawler);
  mkTex(scene, 'warden', 240, 300, drawWarden);
  mkTex(scene, 'mother', 300, 330, drawMother);
  mkTex(scene, 'door_arch', 120, 190, c => drawDoor(c, 'arch'));
  mkTex(scene, 'door_crypt', 120, 190, c => drawDoor(c, 'crypt'));
  mkTex(scene, 'sign', 76, 80, drawSign);
  [130, 140, 160].forEach(w => mkTex(scene, 'spikes_' + w, w, 36, c => drawSpikes(c, w)));
  mkTex(scene, 'dot', 24, 24, c => { const g = c.createRadialGradient(12, 12, 1, 12, 12, 12); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 24, 24); });
  mkTex(scene, 'orb', 44, 44, c => { const g = c.createRadialGradient(22, 22, 2, 22, 22, 22); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 44, 44); });
  mkTex(scene, 'blade', 40, 14, c => { c.fillStyle = '#e8d8ff'; c.beginPath(); c.moveTo(0, 7); c.lineTo(30, 0); c.lineTo(40, 7); c.lineTo(30, 14); c.closePath(); c.fill(); });
  mkTex(scene, 'tear', 26, 26, c => { const g = c.createRadialGradient(13, 13, 1, 13, 13, 13); g.addColorStop(0, '#ffe0e8'); g.addColorStop(0.5, '#e03a6a'); g.addColorStop(1, 'rgba(120,10,40,0)'); c.fillStyle = g; c.fillRect(0, 0, 26, 26); });
  mkTex(scene, 'shock', 60, 44, c => { const g = c.createLinearGradient(0, 44, 0, 0); g.addColorStop(0, 'rgba(255,180,255,0.9)'); g.addColorStop(1, 'rgba(255,180,255,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(0, 44); c.lineTo(30, 0); c.lineTo(60, 44); c.closePath(); c.fill(); });
  mkTex(scene, 'ring', 120, 120, c => { c.strokeStyle = 'rgba(240,235,225,0.9)'; c.lineWidth = 4; c.beginPath(); c.arc(60, 60, 54, 0, 6.3); c.stroke(); c.lineWidth = 3; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; c.beginPath(); c.moveTo(60 + Math.cos(a) * 54, 60 + Math.sin(a) * 54); c.lineTo(60 + Math.cos(a + 0.25) * 40, 60 + Math.sin(a + 0.25) * 40); c.stroke(); } });
  mkTex(scene, 'chest', 72, 54, c => { c.fillStyle = '#4a2f26'; c.fillRect(4, 22, 64, 30); const g = c.createLinearGradient(0, 4, 0, 24); g.addColorStop(0, '#7a4e3c'); g.addColorStop(1, '#4a2f26'); c.fillStyle = g; c.beginPath(); c.moveTo(4, 24); c.quadraticCurveTo(36, -6, 68, 24); c.closePath(); c.fill(); c.fillStyle = '#b8a060'; c.fillRect(30, 22, 12, 14); c.fillRect(4, 22, 64, 4); });
  mkTex(scene, 'chest_open', 72, 54, c => { c.fillStyle = '#4a2f26'; c.fillRect(4, 22, 64, 30); c.fillStyle = '#12090c'; c.fillRect(8, 22, 56, 8); c.fillStyle = '#6a4030'; c.beginPath(); c.moveTo(4, 22); c.lineTo(10, 2); c.lineTo(62, 2); c.lineTo(68, 22); c.closePath(); c.fill(); });
  mkTex(scene, 'orb_heal', 28, 28, c => { const g = c.createRadialGradient(14, 14, 1, 14, 14, 14); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#ff4a6a'); g.addColorStop(1, 'rgba(255,60,100,0)'); c.fillStyle = g; c.fillRect(0, 0, 28, 28); });
  mkTex(scene, 'orb_mana', 28, 28, c => { const g = c.createRadialGradient(14, 14, 1, 14, 14, 14); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#5aa8ff'); g.addColorStop(1, 'rgba(60,120,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 28, 28); });
  Object.keys(SPELLS).forEach(id => mkTex(scene, 'book_' + id, 64, 64, c => drawBook(c, hex(SPELLS[id].color))));
  Object.keys(POWERS).forEach(id => mkTex(scene, 'pow_' + id, 64, 64, c => drawPowerIcon(c, id)));
  const tints = { witch_hat: '#7a4ac0', veil: '#4a4a66', bone_corset: '#d8d0c0', rune_cloak: '#5a3a9a', moon_boots: '#8ac0ff', hex_ring: '#b06cff', locket: '#d8b0c0' };
  Object.keys(GEAR).forEach(id => mkTex(scene, 'gear_' + id, 64, 64, c => drawGearIcon(c, GEAR[id].slot, tints[id] || '#aaa')));
}
