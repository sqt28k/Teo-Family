// "Save my chart": a personal family-title poster, laid out as a CNY calling sheet.
// Father's side on the left, your own family in the middle, mother's side on the right.
import { compareAge } from './kinship.js';

const INK = '#1d1d1f', INK2 = '#6e6e73', INK3 = '#9a9aa0', LINE = '#e6e6ea', WHITE = '#ffffff';
const SIDES = {
  L: { main: '#1d5fb3', tint: '#eaf2fc', soft: '#cfe0f6' },  // father's side
  C: { main: '#b8860b', tint: '#fbf5e6', soft: '#f1e2b8' },  // your family
  R: { main: '#c8102e', tint: '#fcecee', soft: '#f6cdd3' },  // mother's side
  M: { main: '#8e8e93', tint: '#f2f2f4', soft: '#d8d8dc', text: '#6e6e73' },  // in loving memory
};
SIDES.L.text = '#a3122e'; SIDES.C.text = '#c8102e'; SIDES.R.text = '#c8102e';
const RED = '#c8102e';
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif';
const TW = 196, TH = 260, G = 14, PP = 18, COLGAP = 22, PAD = 40;
const HEAD_H = 46, GROUP_GAP = 22, BANNER_H = 64;

const f = (size, weight = 400, style = '') => `${style} ${weight} ${size}px ${FONT}`.trim();
const isUp = s => s === 'F' || s === 'M';
const isDown = s => s === 'S' || s === 'D';
const isSpouse = s => s === 'H' || s === 'W';
const genOf = steps => steps.reduce((g, s) => g + (isUp(s) ? 1 : isDown(s) ? -1 : 0), 0);

function fit(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
// Shrink the font until the text fits, down to a floor; then truncate.
function fitText(ctx, text, maxW, size, weight, min = 14, style = '') {
  let s = size;
  ctx.font = f(s, weight, style);
  while (s > min && ctx.measureText(text).width > maxW) { s -= 1; ctx.font = f(s, weight, style); }
  return fit(ctx, text, maxW);
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function heart(ctx, cx, cy, s, color) {
  ctx.save(); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.35);
  ctx.bezierCurveTo(cx - s, cy - s * 0.35, cx - s * 0.45, cy - s, cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx + s * 0.45, cy - s, cx + s, cy - s * 0.35, cx, cy + s * 0.35);
  ctx.fill(); ctx.restore();
}
function loadImg(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

// Flatten a result into display lines.
function lines(r) {
  if (!r) return { kind: 'none' };
  if (r.kind === 'elder' || r.kind === 'peer') return { kind: 'title', zh: r.term.zh, py: r.term.py, tc: r.term.tc, ts: r.term.ts };
  if (r.kind === 'either') {
    const t = r.options.map(o => o.term);
    return {
      kind: 'title',
      zh: t.map(x => (x ? x.zh : '名字')).join(' / '), py: 'depends who is older',
      tc: t.map(x => (x ? x.tc : '名字')).join(' / '), ts: t.map(x => (x ? x.ts : 'name')).join(' / '),
    };
  }
  if (r.kind === 'junior') return { kind: 'name', ref: r.ref ? `${r.ref.zh} ${r.ref.py}` : '' };
  if (r.kind === 'named') return { kind: 'name', ref: '' };
  if (r.kind === 'spouse') return { kind: 'spouse' };
  return { kind: 'none' };
}

// Which column and group a relative belongs to, from the path that links you.
function classify(chain) {
  let steps = chain.map(n => n.step);
  let nodes = chain;
  const via = steps.length > 1 && isSpouse(steps[0]) ? steps[0] : null;
  if (steps.length === 1 && isSpouse(steps[0])) return { col: 'C', group: 'me' };
  if (via) { steps = steps.slice(1); nodes = chain.slice(1); }
  const g = genOf(steps), first = steps[0];
  const marriedIn = steps.length > 1 && isSpouse(steps[steps.length - 1]);
  const blood = marriedIn ? nodes[nodes.length - 2].p : nodes[nodes.length - 1].p;
  if (isUp(first)) {
    if (steps.length === 1) return { col: 'C', group: 'parents', blood };
    const col = first === 'F' ? 'L' : 'R';
    if (g >= 2) return { col, group: 'elders', blood, direct: steps.every(isUp) };
    if (g === 1) {
      const c = compareAge(blood, nodes[0].p);
      return { col, group: c === -1 ? 'younger' : 'older', blood, anchor: nodes[0].p };
    }
    if (g === 0) return { col, group: 'cousins', blood };
    return { col, group: 'next', blood };
  }
  if (isDown(first)) return { col: 'C', group: 'kids', blood };
  if (g === 0) return { col: 'C', group: 'siblings', blood };
  return { col: 'C', group: 'nephews', blood };
}

const GROUP_ORDER = {
  L: ['elders', 'older', 'younger', 'cousins', 'next'],
  R: ['elders', 'older', 'younger', 'cousins', 'next'],
  C: ['parents', 'me', 'siblings', 'kids', 'nephews'],
};

function groupLabel(col, group, anchorName, via) {
  const parent = col === 'L' ? ['爸爸', 'Dad'] : ['妈妈', 'Mum'];
  switch (group) {
    case 'elders': return ['祖辈', 'Grandparents & elders'];
    case 'older': return via ? ['长辈', `Older than ${anchorName}`] : [`比${parent[0]}大`, `Older than ${parent[1]}`];
    case 'younger': return via ? ['长辈', `Younger than ${anchorName}`] : [`比${parent[0]}小`, `Younger than ${parent[1]}`];
    case 'cousins': return ['堂表亲', 'Cousins'];
    case 'next': return ['下一代', 'Their children'];
    case 'parents': return ['父母', 'Parents'];
    case 'me': return ['我', 'Me'];
    case 'siblings': return ['兄弟姐妹', 'Brothers & sisters'];
    case 'kids': return ['子孙', 'Children & grandchildren'];
    case 'nephews': return ['侄甥', 'Nephews & nieces'];
    default: return ['', ''];
  }
}

// Turn a group's people into units: a blood relative followed by their spouse.
function unitsOf(items) {
  const byBlood = new Map();
  for (const it of items) {
    const key = it.cls.blood ? it.cls.blood.id : it.p.id;
    if (!byBlood.has(key)) byBlood.set(key, []);
    byBlood.get(key).push(it);
  }
  const units = [...byBlood.values()].map(u => u.sort((a, b) => (a.p === a.cls.blood ? -1 : 0) - (b.p === b.cls.blood ? -1 : 0)));
  const order = u => {
    const head = u[0].cls.blood || u[0].p;
    return [u[0].cls.direct ? 0 : 1, head.born ?? 9999, head._i];
  };
  units.sort((a, b) => { const x = order(a), y = order(b); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
  return units;
}

// Place units in a grid of `cols` slots per row, keeping couples on one row.
function place(units, cols) {
  const out = []; let row = 0, slot = 0;
  for (const u of units) {
    const size = Math.min(u.length, cols);
    if (slot + size > cols) { row++; slot = 0; }
    u.slice(0, size).forEach((it, i) => out.push({ it, row, slot: slot + i, pairLeft: i > 0 }));
    // extra spouses beyond the row width wrap
    u.slice(size).forEach(it => { row++; slot = 0; out.push({ it, row, slot: 0, pairLeft: false }); });
    slot += size;
    if (slot >= cols) { row++; slot = 0; }
  }
  const rows = out.length ? Math.max(...out.map(o => o.row)) + 1 : 0;
  return { cells: out, rows };
}

function columnHeight(groups, cols) {
  let h = BANNER_H + PP;
  for (const g of groups) {
    const { rows } = place(g.units, cols);
    h += HEAD_H + 12 + rows * (TH + G) - G + GROUP_GAP;
  }
  return h + PP - GROUP_GAP;
}

export async function makeChart({ fam, me, rel, shortName, ZODIAC }) {
  const items = [], remembered = [];
  for (const p of fam.people) {
    if (p === me) continue;
    const r = rel(me, p);
    if (!r.chain) continue;
    if (p.remembered) { remembered.push({ p, r: r.result }); continue; }
    items.push({ p, r: r.result, cls: classify(r.chain) });
  }
  remembered.sort((a, b) => (a.p.born || 0) - (b.p.born || 0));
  const meItem = { p: me, r: { kind: 'self' }, cls: { col: 'C', group: 'me', blood: me } };
  items.push(meItem);
  // spouse sits with me
  items.forEach(it => { if (it.cls.group === 'me' && it.p !== me) it.cls.blood = me; });

  const cols = {};
  for (const c of ['L', 'C', 'R']) {
    cols[c] = GROUP_ORDER[c]
      .map(g => ({ key: g, items: items.filter(it => it.cls.col === c && it.cls.group === g) }))
      .filter(g => g.items.length)
      .map(g => ({ ...g, units: unitsOf(g.items) }));
  }
  // anchor names for spouse-side viewers
  // a married-in viewer reaches the sides through their spouse
  const sideItem = items.find(it => it.cls.col !== 'C');
  const sideChain = sideItem ? rel(me, sideItem.p).chain : null;
  const viaSpouse = !!(sideChain && isSpouse(sideChain[0].step));
  const spouseName = viaSpouse ? shortName(sideChain[0].p) : '';
  const anchorName = c => {
    const g = cols[c].find(x => x.key === 'older' || x.key === 'younger');
    const a = g && g.items[0].cls.anchor;
    return a ? shortName(a) : '';
  };

  // choose how many tile columns each side gets so the poster is balanced
  const CW = 2, SIDE_SLOTS = 6;
  const hasL = cols.L.length > 0, hasR = cols.R.length > 0;
  let best = null;
  const tries = hasL && hasR ? [...Array(SIDE_SLOTS - 3).keys()].map(i => [i + 2, SIDE_SLOTS - i - 2]) : hasL ? [[SIDE_SLOTS, 0]] : hasR ? [[0, SIDE_SLOTS]] : [[0, 0]];
  for (const [cl, cr] of tries) {
    const h = Math.max(hasL ? columnHeight(cols.L, cl) : 0, hasR ? columnHeight(cols.R, cr) : 0, columnHeight(cols.C, CW));
    if (!best || h < best.h) best = { cl, cr, h };
  }
  const colW = n => n * TW + (n - 1) * G + PP * 2;
  const order = [hasL && ['L', best.cl], ['C', CW], hasR && ['R', best.cr]].filter(Boolean);
  const W = PAD * 2 + order.reduce((s, [, n]) => s + colW(n), 0) + COLGAP * (order.length - 1);
  const HEADER = 300, FOOTER = 150;
  const memCols = Math.max(1, Math.floor((W - PAD * 2 - PP * 2 + G) / (TW + G)));
  const memRows = Math.ceil(remembered.length / memCols);
  const MEM_H = remembered.length ? 30 + BANNER_H + PP + memRows * (TH + G) - G + PP : 0;
  const H = HEADER + best.h + MEM_H + FOOTER;

  const scale = 1.5;
  const cv = document.createElement('canvas');
  cv.width = Math.round(W * scale); cv.height = Math.round(H * scale);
  const ctx = cv.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H);

  // ---- header
  ctx.fillStyle = RED; ctx.fillRect(0, 0, W, 12);
  const sealSrc = document.querySelector('.seal img')?.src;
  const seal = sealSrc ? await loadImg(sealSrc) : null;
  if (seal) ctx.drawImage(seal, W / 2 - 52, 36, 104, 104);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillStyle = RED; ctx.font = f(24, 700); ctx.fillText('张家称呼 · TEO FAMILY CNY CALLING SHEET', W / 2, 156);
  ctx.fillStyle = INK; ctx.font = f(60, 800); ctx.fillText(fit(ctx, `${shortName(me)}'s Family Titles`, W - PAD * 2), W / 2, 190);
  ctx.fillStyle = INK2; ctx.font = f(22);
  ctx.fillText('Big characters: Mandarin + Hanyu Pinyin.   Red line: Teochew + how to say it.', W / 2, 262);
  ctx.fillStyle = RED; ctx.font = f(26, 700);
  ctx.textAlign = 'left'; ctx.fillText('恭喜发财', PAD, 40);
  ctx.textAlign = 'right'; ctx.fillText('新年快乐', W - PAD, 40);

  // ---- columns
  let x = PAD;
  for (const [c, n] of order) {
    const S = SIDES[c], w = colW(n), y0 = HEADER;
    ctx.save(); rr(ctx, x, y0, w, best.h, 26); ctx.fillStyle = S.tint; ctx.fill(); ctx.restore();
    // banner
    ctx.save(); rr(ctx, x, y0, w, BANNER_H, 26); ctx.fillStyle = S.main; ctx.fill(); ctx.fillRect(x, y0 + BANNER_H - 26, w, 26); ctx.restore();
    const title = c === 'C' ? ['我家', 'My family'] : c === 'L'
      ? (viaSpouse ? ['', `${spouseName}'s father's side`] : ['爸爸那边', "Father's side"])
      : (viaSpouse ? ['', `${spouseName}'s mother's side`] : ['妈妈那边', "Mother's side"]);
    ctx.fillStyle = WHITE; ctx.textAlign = 'center';
    ctx.font = f(26, 800); ctx.fillText(fit(ctx, [title[0], title[1]].filter(Boolean).join(' · '), w - 24), x + w / 2, y0 + 17);
    let y = y0 + BANNER_H + PP;
    for (const g of cols[c]) {
      const [zh, en] = groupLabel(c, g.key, anchorName(c), viaSpouse);
      // group header pill
      ctx.save(); rr(ctx, x + PP, y, w - PP * 2, HEAD_H, HEAD_H / 2); ctx.fillStyle = WHITE; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = S.soft; ctx.stroke(); ctx.restore();
      ctx.textAlign = 'center'; ctx.fillStyle = S.main;
      ctx.font = f(20, 800);
      const label = fit(ctx, `${zh}  ${en.toUpperCase()}`, w - PP * 2 - 24);
      ctx.fillText(label, x + w / 2, y + 12);
      y += HEAD_H + 12;
      const { cells, rows } = place(g.units, n);
      for (const cell of cells) {
        const tx = x + PP + cell.slot * (TW + G), ty = y + cell.row * (TH + G);
        drawTile(ctx, tx, ty, cell.it, S, me, rel, shortName, ZODIAC);
        if (cell.pairLeft) heart(ctx, tx - G / 2, ty + 44, 12, S.main);
      }
      y += rows * (TH + G) - G + GROUP_GAP;
    }
    x += w + COLGAP;
  }

  // ---- in loving memory
  if (remembered.length) {
    const S = SIDES.M, y0 = HEADER + best.h + 30, w = W - PAD * 2;
    ctx.save(); rr(ctx, PAD, y0, w, MEM_H - 30, 26); ctx.fillStyle = S.tint; ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx, PAD, y0, w, BANNER_H, 26); ctx.fillStyle = S.main; ctx.fill(); ctx.fillRect(PAD, y0 + BANNER_H - 26, w, 26); ctx.restore();
    ctx.fillStyle = WHITE; ctx.textAlign = 'center'; ctx.font = f(26, 800);
    ctx.fillText('永远怀念 · In loving memory', W / 2, y0 + 17);
    const rowW = Math.min(remembered.length, memCols) * (TW + G) - G;
    remembered.forEach((it, i) => {
      const col = i % memCols, row = Math.floor(i / memCols);
      const tx = W / 2 - rowW / 2 + col * (TW + G), ty = y0 + BANNER_H + PP + row * (TH + G);
      drawTile(ctx, tx, ty, it, S, me, rel, shortName, ZODIAC);
    });
  }

  // ---- footer
  const fy = HEADER + best.h + MEM_H + 40;
  ctx.textAlign = 'center';
  ctx.fillStyle = RED; ctx.font = f(36, 800); ctx.fillText('新正如意 · 新年发财', W / 2, fy);
  ctx.fillStyle = INK2; ctx.font = f(20); ctx.fillText('Teochew: "sing-jia ju-ee, sing-ni huat-chai"   ·   Juniors are called by name', W / 2, fy + 52);

  await save(cv, `${shortName(me).replace(/\s+/g, '-')}-CNY-titles.png`, `${shortName(me)}'s family titles`);
}

function drawTile(ctx, x, y, it, S, me, rel, shortName, ZODIAC) {
  const isMe = it.p === me;
  ctx.save();
  rr(ctx, x, y, TW, TH, 18);
  ctx.fillStyle = WHITE; ctx.fill();
  ctx.lineWidth = isMe ? 3 : 1.5; ctx.strokeStyle = isMe ? S.main : S.soft; ctx.stroke();
  ctx.restore();
  const cx = x + TW / 2, iw = TW - 20;
  // avatar with zodiac character
  const z = ZODIAC[it.p.zodiac];
  ctx.beginPath(); ctx.arc(cx, y + 44, 28, 0, Math.PI * 2); ctx.fillStyle = S.main; ctx.fill();
  ctx.fillStyle = WHITE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = f(28, 700); ctx.fillText(z ? z[0] : it.p.name[0], cx, y + 45);
  ctx.textBaseline = 'top';
  const L = isMe ? { kind: 'me' } : lines(it.r);
  if (L.kind === 'title') {
    ctx.fillStyle = INK; const zh = fitText(ctx, L.zh, iw, 40, 800, 18); ctx.fillText(zh, cx, y + 84);
    ctx.fillStyle = INK2; const py = fitText(ctx, L.py, iw, 17, 500, 12); ctx.fillText(py, cx, y + 132);
    ctx.fillStyle = S.text;
    const tc = fitText(ctx, `${L.tc} “${L.ts}”`, iw, 18, 700, 12); ctx.fillText(tc, cx, y + 158);
  } else if (L.kind === 'name') {
    ctx.fillStyle = INK; const nm = fitText(ctx, 'By name', iw, 30, 800, 18); ctx.fillText(nm, cx, y + 88);
    if (L.ref) { ctx.fillStyle = INK2; const rf = fitText(ctx, L.ref, iw, 16, 500, 12); ctx.fillText(rf, cx, y + 128); }
    const back = lines(rel(it.p, me).result);
    if (back.kind === 'title') {
      ctx.fillStyle = RED; const t = fitText(ctx, `Calls you ${back.zh}`, iw, 16, 700, 12); ctx.fillText(t, cx, y + 156);
    }
  } else if (L.kind === 'spouse') {
    ctx.fillStyle = INK; ctx.font = f(34, 800); ctx.fillText('另一半', cx, y + 86);
    ctx.fillStyle = INK2; ctx.font = f(16, 500); ctx.fillText('lìng yí bàn · other half', cx, y + 132);
  } else if (L.kind === 'me') {
    ctx.fillStyle = S.main; ctx.font = f(44, 800); ctx.fillText('我', cx, y + 82);
    ctx.fillStyle = INK2; ctx.font = f(16, 600); ctx.fillText('wǒ · ME', cx, y + 134);
  }
  // name
  ctx.fillStyle = LINE; ctx.fillRect(x + 16, y + 190, TW - 32, 1.5);
  ctx.fillStyle = INK; const name = fitText(ctx, it.p.name, iw, 28, 800, 16); ctx.fillText(name, cx, y + 209);
}

async function save(cv, name, title) {
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  // Inside a Claude-hosted page, saving goes through the viewer's download prompt.
  const dl = window.claude?.use ? await window.claude.use('downloads').catch(() => null) : null;
  if (dl) {
    try { await dl.save({ filename: name, data: blob }); } catch (e) { /* declined or unavailable */ }
    return;
  }
  const file = new File([blob], name, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
