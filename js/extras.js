// Extras: star-rating popup, scrolling review ticker, and the 3D zodiac web.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

// ---------------------------------------------------------------------------
// Review popup (appears once, 20 seconds after the app is unlocked)
// ---------------------------------------------------------------------------
const REVIEW_DONE = 'teo.review.done';
let reviewTimer = null;

export function scheduleReview({ getName, mail, delay = 20000 }) {
  if (store.get(REVIEW_DONE) || reviewTimer) return;
  let asked = false;
  try { asked = sessionStorage.getItem('teo.review.asked') === '1'; } catch { /* ignore */ }
  if (asked) return;
  reviewTimer = setTimeout(() => {
    if (document.querySelector('.modal')) { reviewTimer = null; return scheduleReview({ getName, mail, delay: 10000 }); }
    openReview(getName, mail);
  }, delay);
}

function openReview(getName, mail) {
  try { sessionStorage.setItem('teo.review.asked', '1'); } catch { /* ignore */ }
  const m = document.createElement('div');
  m.className = 'modal review';
  m.innerHTML = `
    <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="rvTitle">
      <button class="modal-x" aria-label="Close">×</button>
      <p class="eyebrow">Quick favour</p>
      <h3 id="rvTitle">How useful is this app?</h3>
      <div class="stars" role="radiogroup" aria-label="Star rating">
        ${[1, 2, 3, 4, 5].map(n => `<button role="radio" aria-checked="false" data-n="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">★</button>`).join('')}
      </div>
      <label class="rv-label" for="rvText">Anything to add? <span>(optional)</span></label>
      <textarea id="rvText" rows="3" maxlength="400" placeholder="A wrong title, a missing relative, or just a hello"></textarea>
      <div class="rv-actions">
        <button class="btn-ghost" id="rvLater">Maybe later</button>
        <button class="btn" id="rvSend" disabled>Send</button>
      </div>
      <p class="rv-status" id="rvStatus" role="status"></p>
    </div>`;
  document.body.appendChild(m);
  let stars = 0;
  const btns = [...m.querySelectorAll('.stars button')];
  const paint = n => btns.forEach(b => { const on = +b.dataset.n <= n; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(+b.dataset.n === stars)); });
  btns.forEach(b => {
    b.addEventListener('click', () => { stars = +b.dataset.n; paint(stars); m.querySelector('#rvSend').disabled = false; });
    b.addEventListener('mouseenter', () => paint(+b.dataset.n));
    b.addEventListener('mouseleave', () => paint(stars));
  });
  const close = () => m.remove();
  m.querySelector('.modal-x').onclick = close;
  m.querySelector('#rvLater').onclick = close;
  m.addEventListener('click', e => { if (e.target === m) close(); });
  m.querySelector('#rvSend').onclick = async () => {
    const status = m.querySelector('#rvStatus');
    const comment = m.querySelector('#rvText').value.trim();
    const name = getName() || 'A family member';
    m.querySelector('#rvSend').disabled = true;
    status.textContent = 'Sending…';
    try {
      const res = await fetch(`https://formsubmit.co/ajax/${mail}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Teo Family app: ${stars} star${stars > 1 ? 's' : ''} from ${name}`,
          _template: 'table', _captcha: 'false',
          name, stars: '★'.repeat(stars) + '☆'.repeat(5 - stars), comment: comment || '(no comment)',
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      store.set(REVIEW_DONE, '1');
      m.querySelector('.modal-card').innerHTML = `<p class="eyebrow">Thank you</p><h3>多谢! Thanks, ${esc(name)}.</h3>
        <p class="rv-status">SQ will read it soon.</p><div class="rv-actions"><button class="btn" id="rvOk">Close</button></div>`;
      m.querySelector('#rvOk').onclick = close;
    } catch {
      m.querySelector('#rvSend').disabled = false;
      status.innerHTML = `Couldn't send from here. Please email it to SQ at <b>${esc(mail)}</b>.`;
    }
  };
}

// ---------------------------------------------------------------------------
// Scrolling review ticker (reviews SQ chose to show)
// ---------------------------------------------------------------------------
export function reviewTicker(reviews) {
  if (!reviews || !reviews.length) return '';
  const shuffled = [...reviews].sort(() => Math.random() - 0.5);
  const item = r => `<span class="tick-item"><b>${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</b>
    ${r.comment ? `“${esc(r.comment)}”` : ''} <em>${esc(r.name)}</em></span>`;
  const row = shuffled.map(item).join('');
  const secs = Math.max(30, shuffled.length * 9);
  return `<section class="ticker" aria-label="What the family says">
    <p class="eyebrow">What the family says</p>
    <div class="tick-track" style="--secs:${secs}s"><div class="tick-row">${row}${row}</div></div>
  </section>`;
}

// ---------------------------------------------------------------------------
// Zodiac web: everyone born in one sign, floating in 3D, with how they connect
// ---------------------------------------------------------------------------
export function openZodiacWeb({ sign, glyph, trait, people, connect, yearText }) {
  const m = document.createElement('div');
  m.className = 'modal zweb';
  const pairs = [];
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
    const [a, b] = [people[i], people[j]].sort((x, y) => (x.born || 0) - (y.born || 0));
    pairs.push({ a, b, text: connect(a, b) });
  }
  m.innerHTML = `
    <div class="modal-card wide" role="dialog" aria-modal="true" aria-labelledby="zwTitle">
      <button class="modal-x" aria-label="Close">×</button>
      <div class="zw-head"><span class="zw-glyph">${glyph}</span>
        <div><h3 id="zwTitle">Year of the ${esc(sign)}</h3><p class="note">${esc(trait)} ${people.length} in the family. Drag to spin, tap a name.</p></div></div>
      <canvas class="zw-canvas" width="640" height="420" aria-label="Family members born in the Year of the ${esc(sign)}, shown as a rotating web"></canvas>
      <div class="zw-info" id="zwInfo">${people.length ? 'Tap a name to see how they are connected.' : `No one in the family is a ${esc(sign)} yet.`}</div>
      <details class="zw-list"><summary>All ${esc(sign)}s and connections</summary>
        <ul>${people.map(p => `<li><b>${esc(p.name)}</b> · ${esc(yearText(p))}${p.remembered ? ' · 永远怀念' : ''}</li>`).join('')}</ul>
        ${pairs.length ? `<ul class="zw-pairs">${pairs.map(x => `<li>${esc(x.text)}</li>`).join('')}</ul>` : ''}
      </details>
    </div>`;
  document.body.appendChild(m);
  const cv = m.querySelector('canvas'), info = m.querySelector('#zwInfo');
  const ctx = cv.getContext('2d');
  let raf = 0;
  const close = () => { cancelAnimationFrame(raf); m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  m.querySelector('.modal-x').onclick = close;
  m.addEventListener('click', e => { if (e.target === m) close(); });

  // crisp canvas
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => {
    const w = cv.clientWidth || 600, h = Math.round(Math.max(320, Math.min(w * 0.85, 460)));
    cv.width = w * dpr; cv.height = h * dpr; cv.style.height = h + 'px';
    return { w, h };
  };
  let dim = size();
  window.addEventListener('resize', () => { dim = size(); }, { once: true });

  // points on a sphere (Fibonacci), one person each
  const n = people.length;
  const nodes = people.map((p, i) => {
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y), phi = i * Math.PI * (3 - Math.sqrt(5));
    return { p, x: Math.cos(phi) * r, y, z: Math.sin(phi) * r, sx: 0, sy: 0, s: 1 };
  });
  let rotY = 0.4, rotX = -0.25, vel = 0.004, drag = null, selected = null;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) vel = 0;

  const project = () => {
    const { w, h } = dim, R = Math.min(w * 0.4, h * 0.36), f = 4.5;
    const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);
    for (const nd of nodes) {
      const x1 = nd.x * cy + nd.z * sy, z1 = -nd.x * sy + nd.z * cy;
      const y2 = nd.y * cx - z1 * sx, z2 = nd.y * sx + z1 * cx;
      nd.s = f / (f + z2); nd.depth = z2;
      nd.sx = w / 2 + x1 * R * nd.s; nd.sy = h / 2 + y2 * R * nd.s;
    }
  };
  const draw = () => {
    const { w, h } = dim;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    project();
    // web lines
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = nodes[i], b = nodes[j];
      const hot = selected && (a === selected || b === selected);
      ctx.strokeStyle = hot ? 'rgba(200,16,46,.85)' : `rgba(110,110,115,${0.12 + 0.18 * ((a.s + b.s) / 2 - 0.6)})`;
      ctx.lineWidth = hot ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
    }
    // people, back to front
    [...nodes].sort((a, b) => b.depth - a.depth).forEach(nd => {
      const r = 17 * nd.s, sel = nd === selected;
      ctx.globalAlpha = 0.55 + 0.45 * Math.min(1, nd.s);
      ctx.beginPath(); ctx.arc(nd.sx, nd.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = nd.p.remembered ? '#8e8e93' : sel ? '#8f0b21' : '#c8102e'; ctx.fill();
      if (sel) { ctx.lineWidth = 3; ctx.strokeStyle = '#fbeaec'; ctx.stroke(); }
      ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(14 * nd.s)}px -apple-system, "PingFang SC", "Noto Sans SC", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(glyph, nd.sx, nd.sy + 1);
      ctx.fillStyle = '#1d1d1f'; ctx.font = `700 ${Math.round(14 * nd.s)}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(nd.p.name, nd.sx, nd.sy + r + 12 * nd.s);
      ctx.fillStyle = '#6e6e73'; ctx.font = `500 ${Math.round(11 * nd.s)}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
      ctx.fillText(yearText(nd.p), nd.sx, nd.sy + r + 28 * nd.s);
      ctx.globalAlpha = 1;
    });
  };
  const loop = () => { if (!drag) rotY += vel; draw(); raf = requestAnimationFrame(loop); };
  loop();

  const pos = e => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  cv.addEventListener('pointerdown', e => { drag = { ...pos(e), moved: false, rotY, rotX }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const p = pos(e), dx = p.x - drag.x, dy = p.y - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    rotY = drag.rotY + dx * 0.01; rotX = Math.max(-1.2, Math.min(1.2, drag.rotX + dy * 0.01));
  });
  cv.addEventListener('pointerup', e => {
    const p = pos(e), wasDrag = drag && drag.moved; drag = null;
    if (wasDrag) return;
    const hit = [...nodes].sort((a, b) => a.depth - b.depth).find(nd => Math.hypot(nd.sx - p.x, nd.sy - p.y) < 26 * nd.s);
    selected = hit || null;
    if (!hit) { info.textContent = 'Tap a name to see how they are connected.'; return; }
    const lines = pairs.filter(x => x.a === hit.p || x.b === hit.p).map(x => `<li>${esc(x.text)}</li>`).join('');
    info.innerHTML = `<b>${esc(hit.p.name)}</b> · ${esc(yearText(hit.p))}${hit.p.remembered ? ' · 永远怀念' : ''}${lines ? `<ul>${lines}</ul>` : '<p>The only one in this sign.</p>'}`;
  });
}
