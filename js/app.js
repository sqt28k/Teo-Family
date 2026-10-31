import {
  buildFamily, relate, childrenView, resolve, buildChain, childrenViewOfChain,
  describeChain, whenText, generationOf, isElderResult, GREETING,
} from './kinship.js';
import { deriveKey, decryptWithKey, exportKey, importKey } from './vault.js';
import { makeChart } from './chart.js';
import { scheduleReview, reviewTicker, openZodiacWeb } from './extras.js';

const app = document.getElementById('app');
const KEY_STORE = 'teo.key.v1';
const ME_STORE = 'teo.me';
let fam = null;
let audioSet = new Set();

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SEAL = size => `<div class="seal ${size}"><img src="assets/seal.svg" alt="張 Teo family seal"></div>`;
const CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';
const SURNAMES = new Set('teo tay tan lim lee ng goh chua low koh ong wong chan lau ho yeo yap neo tio heng sim seah quek toh chia chew foo kwek ang aw khoo loh oh png poh soh tng wee yeoh zhang chen lin li huang wang'.split(' '));
// "Teo Jun Jie" -> "Jun Jie", "Sarah Koh" -> "Sarah". A person can also set "short" in the data.
const shortName = p => {
  if (p.short) return p.short;
  const parts = p.name.trim().split(/\s+/);
  if (parts.length > 1 && SURNAMES.has(parts[0].toLowerCase())) return parts.slice(1).join(' ');
  return parts[0];
};

// Relationship with family-specific overrides (e.g. someone called by name)
function rel(a, b) {
  const out = relate(fam, a, b);
  if (a.callByName?.includes(b.id)) out.result = { kind: 'named' };
  return out;
}

// Everyday English label for how `p` relates to `me`: Uncle, Aunty, Grand Uncle, Cousin...
const isUpS = s => s === 'F' || s === 'M', isDownS = s => s === 'S' || s === 'D';
const isSpouseS = s => s === 'H' || s === 'W', isSibS = s => /^(OB|YB|OS|YS|B|Z)$/.test(s);
function enLabel(me, p) {
  if (p === me) return 'You';
  const { chain } = relate(fam, me, p);
  if (!chain || !chain.length) return '';
  let steps = chain.map(n => n.step);
  const male = p.gender === 'M';
  if (steps.length === 1 && isSpouseS(steps[0])) return male ? 'Husband' : 'Wife';
  // Anyone reached through a marriage (yours, or theirs) is an in-law at the same generation.
  const viaSpouse = steps.length > 1 && isSpouseS(steps[0]);
  if (viaSpouse) steps = steps.slice(1);
  const marriedIn = steps.length > 1 && isSpouseS(steps[steps.length - 1]);
  const inLaw = viaSpouse || marriedIn;
  const core = marriedIn ? steps.slice(0, -1) : steps;
  const g = core.reduce((n, s) => n + (isUpS(s) ? 1 : isDownS(s) ? -1 : 0), 0);
  const directUp = core.every(isUpS), directDown = core.every(isDownS);
  if (g >= 1) {
    if (directUp) {
      if (g === 1) return viaSpouse && !marriedIn ? (male ? 'Father-in-law' : 'Mother-in-law') : (male ? 'Dad' : 'Mum');
      return g === 2 ? (male ? 'Grandpa' : 'Grandma') : (male ? 'Great Grandpa' : 'Great Grandma');
    }
    return (g === 1 ? '' : g === 2 ? 'Grand ' : 'Great Grand ') + (male ? 'Uncle' : 'Aunty');
  }
  if (g === 0) {
    if (core.length === 1 && isSibS(core[0])) return inLaw ? (male ? 'Brother-in-law' : 'Sister-in-law') : (male ? 'Brother' : 'Sister');
    return inLaw ? 'Cousin-in-law' : 'Cousin';
  }
  if (g === -1) {
    if (directDown) return marriedIn ? (male ? 'Son-in-law' : 'Daughter-in-law') : (male ? 'Son' : 'Daughter');
    return marriedIn ? '' : (male ? 'Nephew' : 'Niece');
  }
  if (g === -2) {
    if (directDown) return marriedIn ? '' : (male ? 'Grandson' : 'Granddaughter');
    return marriedIn ? '' : (male ? 'Grand-nephew' : 'Grand-niece');
  }
  return '';
}
const labelled = (me, p) => {
  const l = enLabel(me, p);
  if (l === 'Dad' || l === 'Mum') return l;               // "Mum & Dad"
  if (!l || l === 'You' || l === 'Husband' || l === 'Wife') return p.name;
  return `${l} ${p.name}`;
};

// Godparents (Lucy & Tony for Shawn & Esther, etc.)
function godNote(me, p) {
  if (p.godchildren?.includes(me.id)) return `Also your ${p.gender === 'M' ? 'godfather 干爹 gān diē' : 'godmother 干妈 gān mā'}.`;
  if (me.godchildren?.includes(p.id)) return `Also your ${p.gender === 'M' ? 'godson 干儿子' : 'goddaughter 干女儿'}.`;
  return '';
}

// ---------------------------------------------------------------------------
// Zodiac, just for fun
// ---------------------------------------------------------------------------
const ZODIAC = {
  Rat: ['鼠', 'Quick-witted and resourceful.', 'Won the Great Race by riding on the Ox and leaping off at the finish line.'],
  Ox: ['牛', 'Steady, hardworking and dependable.', 'Came 2nd in the Great Race, carrying the sneaky Rat the whole way.'],
  Tiger: ['虎', 'Brave, confident, a natural leader.', 'Fought the river currents to finish 3rd in the Great Race.'],
  Rabbit: ['兔', 'Gentle, kind and elegant.', 'Hopped across the river on stones and a floating log to finish 4th.'],
  Dragon: ['龙', 'Energetic, ambitious and lucky.', 'Finished 5th because it stopped to make rain for thirsty villagers.'],
  Snake: ['蛇', 'Wise, calm and intuitive.', 'Hid on the Horse\'s hoof and sprang out at the finish to take 6th.'],
  Horse: ['马', 'Free-spirited and full of energy.', 'Was surprised by the Snake at the finish and came 7th.'],
  Goat: ['羊', 'Creative, gentle and caring.', 'Shared a raft with the Monkey and Rooster and came 8th.'],
  Monkey: ['猴', 'Clever, playful and curious.', 'Helped steer the raft across the river and came 9th.'],
  Rooster: ['鸡', 'Sharp, hardworking and proud.', 'Spotted the raft that carried the Goat and Monkey, and came 10th.'],
  Dog: ['狗', 'Loyal, honest and protective.', 'Came 11th because it could not resist a swim in the river.'],
  Pig: ['猪', 'Generous, warm and easy-going.', 'Came last after stopping for a feast and a nap. No regrets.'],
};
const Z_ORDER = Object.keys(ZODIAC);
const NEXT_CNY = { year: 2027, sign: 'Goat' };
const benming = p => p.zodiac === NEXT_CNY.sign;
const zChip = p => (ZODIAC[p.zodiac] ? `<span class="zchip" title="Year of the ${esc(p.zodiac)}">${ZODIAC[p.zodiac][0]}</span>` : '');
function zodiacHero(p) {
  const z = ZODIAC[p.zodiac];
  if (!z) return '';
  return `<div class="zhero"><span class="zbig">${z[0]}</span><div><b>Year of the ${esc(p.zodiac)}.</b> ${esc(z[1])}<br><span>${esc(z[2])}</span>
    ${benming(p) ? `<br><span class="zred">${NEXT_CNY.year} is your 本命年 (zodiac year). Tradition says wear something red for luck.</span>` : ''}</div></div>`;
}
function zodiacStrip() {
  const count = Object.fromEntries(Z_ORDER.map(k => [k, 0]));
  fam.people.forEach(p => { if (count[p.zodiac] != null) count[p.zodiac]++; });
  const top = Math.max(...Object.values(count));
  return `<section class="zstrip wrap narrow"><p class="eyebrow">Our family zodiac</p>
    <div class="zgrid">${Z_ORDER.map(k => `<button class="zcell ${count[k] === top ? 'top' : ''}" data-sign="${k}" aria-label="Year of the ${k}: ${count[k]} in the family"><span>${ZODIAC[k][0]}</span><small>${k}</small><b>${count[k]}</b></button>`).join('')}</div>
    <p class="note">Tap a sign to see who shares it and how they're connected.</p>
    <p class="note">${NEXT_CNY.year} is the Year of the ${NEXT_CNY.sign} 羊. ${esc(fam.people.filter(benming).map(shortName).join(', ') || 'No one')}: it's your 本命年!</p></section>`;
}

// ---------------------------------------------------------------------------
// Boot: unlock the encrypted family list
// ---------------------------------------------------------------------------
let box = null;
let started = false;
async function boot() {
  try {
    if (window.__PREVIEW_FAMILY__) throw 'preview';
    if (window.__PREVIEW_BOX__) throw 'box';
    const [b, m] = await Promise.all([
      fetch('data/family.enc.json', { cache: 'no-cache' }).then(r => r.json()),
      fetch('audio/teochew/manifest.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({ files: [] })),
    ]);
    box = b;
    audioSet = new Set((m.files || []).map(f => f.replace(/\.[a-z0-9]+$/i, '')));
  } catch (e) {
    if (e === 'preview') return start(window.__PREVIEW_FAMILY__);
    if (e === 'box') { box = window.__PREVIEW_BOX__; return renderGate(); }
    app.innerHTML = `<section class="hero wrap">${SEAL('seal-lg')}<p class="sub" style="margin-top:24px">Could not load the family list. Check your connection and refresh.</p></section>`;
    return;
  }
  if (window.__PREVIEW_FAMILY__) return start(window.__PREVIEW_FAMILY__);
  const saved = store.get(KEY_STORE);
  if (saved) {
    try {
      const data = await decryptWithKey(await importKey(saved), box);
      return start(data);
    } catch { store.del(KEY_STORE); }
  }
  renderGate();
}

function renderGate() {
  app.innerHTML = `
  <section class="hero gate wrap narrow fade">
    ${SEAL('seal-lg')}
    <p class="eyebrow">张家 · Teo Family</p>
    <h1>Welcome home.</h1>
    <p class="sub">Enter the family passcode to open the greetings guide.</p>
    <form id="gate" autocomplete="off">
      <input class="field" id="pc" type="password" placeholder="Family passcode" autocomplete="current-password" required>
      <label class="check"><input type="checkbox" id="remember" checked> Remember on this device</label>
      <button class="btn" type="submit">Unlock</button>
      <div class="err" id="err" role="alert"></div>
    </form>
  </section>`;
  const form = document.getElementById('gate');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button'), err = document.getElementById('err');
    btn.disabled = true; btn.textContent = 'Unlocking…'; err.textContent = '';
    try {
      const key = await deriveKey(document.getElementById('pc').value, box.salt, box.iter);
      const data = await decryptWithKey(key, box);
      if (document.getElementById('remember').checked) store.set(KEY_STORE, await exportKey(key));
      start(data);
    } catch {
      err.textContent = 'That passcode did not work. Try again.';
      btn.disabled = false; btn.textContent = 'Unlock';
    }
  });
  document.getElementById('pc').focus();
}

let reviews = [];
function start(data) {
  fam = buildFamily(data.people);
  reviews = data.reviews || [];
  scheduleReview({ getName: () => { const id = store.get(ME_STORE); const p = id && fam && fam.byId.get(id); return p ? p.name : ''; }, mail: SQ_MAIL });
  if (!started) { window.addEventListener('hashchange', () => fam && route()); started = true; }
  route();
}

function route() {
  const m = location.hash.match(/^#p-([A-Za-z0-9-]+)$/);
  const person = m && fam.byId.get(decodeURIComponent(m[1]));
  if (person) renderPerson(person); else renderHome();
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------------------
// Home
// ---------------------------------------------------------------------------
function renderHome() {
  const meId = store.get(ME_STORE);
  const me = meId && fam.byId.get(meId);
  app.innerHTML = `
  <section class="hero wrap narrow fade">
    ${SEAL('seal-lg')}
    <p class="eyebrow">张家称呼 · Teo Family</p>
    <h1>What do I call them?</h1>
    <p class="sub">Every title in the family, in Mandarin and Teochew. Ready for Chinese New Year.</p>
    <div class="picker" id="picker">
      <button class="picker-btn" id="pickBtn" aria-haspopup="listbox" aria-expanded="false">
        <span class="ph">Who are you?</span>${CHEV}
      </button>
      <div class="panel hidden" id="panel">
        <input id="q" type="search" placeholder="Type your name" aria-label="Search names">
        <ul id="list" role="listbox"></ul>
      </div>
    </div>
    ${me ? `<p class="continue">Continue as <button class="link" id="cont">${esc(me.name)}</button></p>` : ''}
  </section>
  ${zodiacStrip()}
  ${reviewTicker(reviews)}
  ${footer()}`;

  const btn = document.getElementById('pickBtn'), panel = document.getElementById('panel');
  const q = document.getElementById('q'), list = document.getElementById('list');
  const sorted = fam.people.filter(p => !p.remembered).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  const draw = () => {
    const term = q.value.trim().toLowerCase();
    const items = sorted.filter(p => !term || p.name.toLowerCase().includes(term) || (p.zh || '').includes(term));
    let last = '';
    list.innerHTML = items.length ? items.map(p => {
      const L = p.name[0].toUpperCase();
      const head = !term && L !== last ? `<li class="letter" aria-hidden="true">${esc(L)}</li>` : '';
      last = L;
      return `${head}<li><button role="option" data-id="${esc(p.id)}"><span>${esc(p.name)}</span><span class="zh">${esc(p.zh || '')}</span></button></li>`;
    }).join('') : '<li class="empty">No one by that name yet.</li>';
  };
  const open = v => { panel.classList.toggle('hidden', !v); btn.setAttribute('aria-expanded', String(v)); if (v) { draw(); q.focus(); } };
  btn.addEventListener('click', () => open(panel.classList.contains('hidden')));
  q.addEventListener('input', draw);
  q.addEventListener('keydown', e => {
    if (e.key === 'Escape') open(false);
    if (e.key === 'Enter') { const first = list.querySelector('button[data-id]'); if (first) first.click(); }
  });
  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    store.set(ME_STORE, b.dataset.id);
    location.hash = `#p-${b.dataset.id}`;
  });
  closePicker = () => open(false);
  document.querySelectorAll('.zcell[data-sign]').forEach(b => b.addEventListener('click', () => {
    const sign = b.dataset.sign;
    const people = fam.people.filter(p => p.zodiac === sign).sort((a, c) => (a.born || 0) - (c.born || 0));
    openZodiacWeb({
      sign, glyph: ZODIAC[sign][0], trait: ZODIAC[sign][1], people,
      yearText: p => (p.born ? `${p.bornEst ? 'c.' : 'b.'} ${p.born}` : ''),
      connect: (a, c) => {
        const l = enLabel(a, c);
        return l ? `${c.name} is ${a.name}'s ${l.toLowerCase()}` : `${a.name} and ${c.name} are family by marriage`;
      },
    });
  }));
  document.getElementById('cont')?.addEventListener('click', () => { location.hash = `#p-${me.id}`; });
  bindFooter();
}

function footer() {
  return `<footer class="wrap">
    <div class="cny">新正如意</div>
    <div>Made with love for the Teo family. Spotted a wrong title? <a class="link" id="tellSQ" href="#">Tell SQ</a> <span id="sqMail" class="mail"></span></div>
    <button class="link" id="lock">Lock this device</button>
  </footer>`;
}
const SQ_MAIL = ['shawnq', 'gmail.com'].join('@');
function bindFooter() {
  const a = document.getElementById('tellSQ');
  if (a) {
    a.href = `mailto:${SQ_MAIL}?subject=${encodeURIComponent('Teo Family Greetings app')}`;
    document.getElementById('sqMail').textContent = `(${SQ_MAIL})`;
  }
  document.getElementById('lock')?.addEventListener('click', () => {
    store.del(KEY_STORE); store.del(ME_STORE); history.replaceState(null, '', location.pathname); fam = null; renderGate();
  });
}

// ---------------------------------------------------------------------------
// Families (households), in tree order
// ---------------------------------------------------------------------------
function households() {
  const seen = new Set(), out = [];
  const byAge = (a, b) => (a.born || 9999) - (b.born || 9999) || a._i - b._i;
  const visit = (p, depth) => {
    if (seen.has(p.id)) return;
    const couple = [p, ...p.spouses.filter(s => !seen.has(s.id))];
    couple.forEach(x => seen.add(x.id));
    const kids = [...new Set(couple.flatMap(x => x.children))].sort(byAge);
    const members = [...couple], later = [];
    for (const k of kids) {
      if (seen.has(k.id)) continue;
      if (k.spouses.length || k.children.length) later.push(k);
      else { members.push(k); seen.add(k.id); }
    }
    out.push({ head: p, members, depth });
    later.forEach(k => visit(k, depth + 1));
  };
  const roots = fam.people.filter(p => !p.father && !p.mother && !p.spouses.some(s => s.father || s.mother)).sort(byAge);
  roots.forEach(r => visit(r, 0));
  fam.people.filter(p => !seen.has(p.id)).sort(byAge).forEach(p => visit(p, 0));
  return out;
}

// ---------------------------------------------------------------------------
// Rendering a title
// ---------------------------------------------------------------------------
function playBtn(key) {
  return audioSet.has(key) ? `<button class="play" data-audio="${esc(key)}" aria-label="Play Teochew">${PLAY}</button>` : '';
}

function termBlock(t) {
  return `<div class="lang">
    <div class="lbl">Mandarin</div>
    <div class="term"><span class="hz">${esc(t.zh)}</span><span class="pr">${esc(t.py)}</span></div>
    <div class="lbl">Teochew</div>
    <div class="term"><span class="hz">${esc(t.tc)}</span><span class="say">“${esc(t.ts)}”</span>${playBtn(t.audio)}
      ${t.alt ? `<span class="alt">Some families say ${esc(t.alt.tc)} “${esc(t.alt.ts)}”</span>` : ''}</div>
  </div>`;
}

function byNameBlock(ref, en) {
  return `<div class="lang"><div class="lbl">Call</div>
    <div class="byname">By name${ref ? `<small>${esc(ref.zh)} ${esc(ref.py)} · ${esc(ref.en)}</small>` : en ? `<small>${esc(en)}</small>` : ''}</div></div>`;
}

function resultBody(r, view = 'self') {
  if (!r) return '<p class="note">Not linked in the family tree yet.</p>';
  if (r.kind === 'junior') return byNameBlock(r.ref);
  if (r.kind === 'named') return byNameBlock(null);
  if (r.kind === 'elder' || r.kind === 'peer') return termBlock(r.term);
  if (r.kind === 'either') {
    const v = r.viaSpouse && view === 'self' ? 'spouse' : view;
    return r.options.map(o => `<div class="opt"><div class="cond">${esc(whenText(r.who, o.older, v))}</div>
      ${o.term ? termBlock(o.term) : byNameBlock(o.ref)}</div>`).join('');
  }
  return '';
}

function inline(r, view) {
  if (!r) return '';
  const one = t => `<b>${esc(t.zh)}</b> ${esc(t.py)} · <b>${esc(t.tc)}</b> “${esc(t.ts)}”${playBtn(t.audio)}`;
  if (r.kind === 'elder' || r.kind === 'peer') return one(r.term);
  if (r.kind === 'named') return '<b>by name</b>';
  if (r.kind === 'junior') return `<b>by name</b>${r.ref ? ` (${esc(r.ref.zh)}, ${esc(r.ref.en)})` : ''}`;
  if (r.kind === 'either') return r.options.map(o => (o.term ? one(o.term) : '<b>by name</b>') + ` <span style="color:var(--red)">${esc(whenText(r.who, o.older, view))}</span>`).join('<br>');
  return '';
}

function greeting(r, gen) {
  if (!r) return '';
  if (r.kind === 'elder' || r.kind === 'peer') {
    const t = r.term, senior = gen >= 2;
    return `<div class="greet"><span class="k">At CNY say</span>
      <div class="line">${esc(t.zh)}，${senior ? GREETING.zhSenior : GREETING.zh}</div>
      <div class="pr">${esc(t.py)}, ${senior ? GREETING.pySenior : GREETING.py}</div>
      <div class="gap"></div>
      <div class="line">${esc(t.tc)}，${GREETING.tc} ${playBtn('greeting')}</div>
      <div class="pr">“${esc(t.ts)}, ${GREETING.ts}”</div></div>`;
  }
  return '';
}

function juniorTip(speaker) {
  return `<div class="note">They greet you first.${speaker.spouses.length ? ' Have an ang pow (红包) ready.' : ' Wish them 新年快乐 back.'}</div>`;
}

// ---------------------------------------------------------------------------
// Person page
// ---------------------------------------------------------------------------
function card(me, p) {
  const z = zChip(p);
  if (p === me) {
    return `<article class="card you" data-search="${esc((p.name + ' you').toLowerCase())}">
      <div class="who"><span class="name">${esc(p.name)} <span class="pill">YOU</span></span>${z}</div></article>`;
  }
  const { chain, result: r, en } = rel(me, p);
  if (p.remembered) {
    return `<article class="card memorial" data-search="${esc([p.name, en, r?.term?.zh].filter(Boolean).join(' ').toLowerCase())}">
      <div class="who"><span class="name">${esc(p.name)}</span>${z}</div>
      <div class="rel">${esc(en)}</div>
      ${resultBody(r)}
    </article>`;
  }
  const gen = chain ? generationOf(chain) : 0;
  const kinds = r ? r.kind : 'none';
  const elderish = isElderResult(r);
  let body = '';
  if (r && r.kind === 'spouse') body = `<div class="note">新年快乐 to your other half.</div>`;
  else body = resultBody(r);
  // what the speaker's children call them
  let kidsHtml = '';
  const cv = r && r.kind !== 'spouse' ? childrenView(fam, me, p) : null;
  if (cv && cv.length) {
    const groups = new Map();
    for (const x of cv) {
      if (!x.result || x.result.kind === 'spouse' || x.result.kind === 'self') continue;
      const res = x.child && x.child.callByName?.includes(p.id) ? { kind: 'named' } : x.result;
      const html = inline(res, 'child');
      if (!html) continue;
      if (!groups.has(html)) groups.set(html, []);
      if (x.child) groups.get(html).push(shortName(x.child));
    }
    const rows = [...groups.entries()].map(([html, names]) => {
      const label = names.length ? `${names.join(' & ')} ${names.length > 1 ? 'call' : 'calls'} them` : 'Your children call them';
      return `<div class="row"><span class="k">${esc(label)}</span>${html}</div>`;
    });
    if (rows.length) kidsHtml = `<div class="extra">${rows.join('')}</div>`;
  }
  // juniors: what they call you
  let theyHtml = '';
  if (r && r.kind === 'junior') {
    const back = rel(p, me);
    if (back.result) theyHtml = `<div class="extra"><div class="row"><span class="k">They call you</span>${inline(back.result, 'self')}</div></div>${juniorTip(me)}`;
  }
  const notes = [r?.general ? 'General polite term. Families sometimes use their own.' : '', r?.note || '', godNote(me, p)].filter(Boolean);
  const search = [p.name, p.zh, en, p.zodiac, r?.term?.zh, r?.term?.tc, r?.ref?.zh].filter(Boolean).join(' ').toLowerCase();
  return `<article class="card ${elderish ? 'elder' : ''} ${kinds}" data-search="${esc(search)}">
    <div class="who"><span class="name">${esc(p.name)}${benming(p) ? ' <span class="pill">本命年</span>' : ''}</span>${z}</div>
    <div class="rel">${esc(en)}</div>
    ${body}
    ${theyHtml}
    ${kidsHtml}
    ${elderish ? greeting(r, gen) : ''}
    ${notes.map(n => `<div class="note">${esc(n)}</div>`).join('')}
  </article>`;
}

function familyTag(me, head) {
  if (head === me || me.spouses.includes(head)) return 'Your family';
  const { result: r } = rel(me, head);
  if (!r) return '';
  if (r.kind === 'named') return 'By name';
  if (r.term) return `${r.term.zh} · ${r.term.ts}`;
  if (r.kind === 'junior' && r.ref) return `${r.ref.zh} · your ${r.ref.en}`;
  if (r.kind === 'either') return r.options.map(o => o.term?.zh || o.ref?.zh).filter(Boolean).join(' / ');
  return '';
}

function renderPerson(me) {
  store.set(ME_STORE, me.id);
  const fams = households();
  const sections = fams.map(h => {
    const members = h.members.filter(p => !p.remembered);
    if (!members.length) return '';
    const mine = members.includes(me);
    const couple = members.filter(x => x === h.head || h.head.spouses.includes(x));
    const heads = couple.length ? couple : [members[0]];
    const title = heads.map(x => esc(x === me ? 'You' : labelled(me, x))).join(' &amp; ');
    return `<section class="family ${mine ? 'mine' : ''}">
      <div class="family-head"><h2>${title}</h2><span class="tag">${esc(familyTag(me, heads[0]))}</span></div>
      <div class="grid">${members.map(p => card(me, p)).join('')}</div>
    </section>`;
  }).join('');
  const gone = fam.people.filter(p => p.remembered && p !== me).sort((a, b) => (a.born || 0) - (b.born || 0));
  const memorial = gone.length ? `<section class="family memorial-section">
      <div class="family-head"><h2>In loving memory</h2><span class="tag grey">永远怀念</span></div>
      <div class="grid">${gone.map(p => card(me, p)).join('')}</div>
    </section>` : '';

  app.innerHTML = `
  <header class="topbar"><div class="wrap">
    <button class="back" id="back">‹ Everyone</button>
    <div id="home">${SEAL('seal-sm')}</div>
    <button class="jump" id="jump">Not listed?</button>
  </div></header>
  <section class="p-hero wrap narrow fade">
    <p class="eyebrow">张家称呼</p>
    <h1>Hi, ${esc(shortName(me))}.</h1>
    <p class="sub">Here is what to call everyone, family by family.${audioSet.size ? ' Tap the red button to hear the Teochew.' : ''}</p>
    ${zodiacHero(me)}
    <div class="hero-actions"><button class="btn" id="chartBtn">Save my chart</button></div>
    <input class="search" id="filter" type="search" placeholder="Find a name or title" aria-label="Filter">
  </section>
  <div class="wrap" id="families">${sections}${memorial}</div>
  ${builderHtml()}
  ${footer()}`;

  document.getElementById('back').onclick = () => { location.hash = ''; };
  document.getElementById('home').onclick = () => { location.hash = ''; };
  document.getElementById('jump').onclick = () => document.getElementById('builder').scrollIntoView({ behavior: 'smooth' });
  const filter = document.getElementById('filter');
  filter.addEventListener('input', () => {
    const t = filter.value.trim().toLowerCase();
    document.querySelectorAll('#families .card').forEach(c => c.classList.toggle('hidden', !!t && !c.dataset.search.includes(t)));
    document.querySelectorAll('#families .family').forEach(s => s.classList.toggle('hidden', !s.querySelector('.card:not(.hidden)')));
  });
  document.getElementById('chartBtn').onclick = async e => {
    const b = e.currentTarget; b.disabled = true; b.textContent = 'Drawing…';
    try { await makeChart({ fam, me, rel, shortName, ZODIAC, households: households() }); }
    finally { b.disabled = false; b.textContent = 'Save my chart'; }
  };
  bindBuilder(me);
  bindFooter();
}

// ---------------------------------------------------------------------------
// Relationship builder ("Not on the list?")
// ---------------------------------------------------------------------------
const OPTIONS = [
  ['Family', [['F', 'Father'], ['M', 'Mother'], ['OB', 'Elder brother'], ['YB', 'Younger brother'], ['OS', 'Elder sister'], ['YS', 'Younger sister'], ['SP', 'Husband / Wife'], ['S', 'Son'], ['D', 'Daughter']]],
  ['In-laws', [['OB+W', 'Elder brother’s wife'], ['YB+W', 'Younger brother’s wife'], ['OS+H', 'Elder sister’s husband'], ['YS+H', 'Younger sister’s husband'], ['SP+F', 'Father-in-law'], ['SP+M', 'Mother-in-law'], ['S+W', 'Daughter-in-law'], ['D+H', 'Son-in-law']]],
];
const MAX_STEPS = 4;
const optionsHtml = () => `<option value="" disabled selected>Choose…</option>` + OPTIONS.map(([g, list]) =>
  `<optgroup label="${g}">${list.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</optgroup>`).join('');

function builderHtml() {
  return `<section class="builder wrap narrow" id="builder">
    <p class="eyebrow">Not on the list?</p>
    <h2>Work out any title.</h2>
    <p class="sub">Build the relationship one step at a time, up to four steps.</p>
    <div class="steps" id="steps"></div>
    <div class="b-actions">
      <button class="btn-ghost" id="addStep">+ Add step</button>
      <button class="btn" id="go">Go!</button>
    </div>
    <div class="b-result" id="bResult"></div>
  </section>`;
}

function bindBuilder(me) {
  const wrap = document.getElementById('steps');
  const add = document.getElementById('addStep');
  const addRow = () => {
    const n = wrap.children.length;
    if (n >= MAX_STEPS) return;
    const row = document.createElement('div');
    row.className = 'step';
    row.innerHTML = `<span class="pre">${n === 0 ? 'Your' : '’s'}</span><select aria-label="Relationship step ${n + 1}">${optionsHtml()}</select>
      ${n === 0 ? '<span></span>' : '<button class="rm" aria-label="Remove step">×</button>'}`;
    row.querySelector('.rm')?.addEventListener('click', () => { row.remove(); relabel(); });
    wrap.appendChild(row);
    relabel();
  };
  const relabel = () => {
    [...wrap.children].forEach((r, i) => { r.querySelector('.pre').textContent = i === 0 ? 'Your' : '’s'; });
    add.disabled = wrap.children.length >= MAX_STEPS;
  };
  add.addEventListener('click', addRow);
  addRow();

  document.getElementById('go').addEventListener('click', () => {
    const out = document.getElementById('bResult');
    const values = [...wrap.querySelectorAll('select')].map(s => s.value).filter(Boolean);
    if (!values.length) { out.innerHTML = '<p class="note" style="text-align:center">Pick at least one relationship first.</p>'; return; }
    // expand to primitive steps, resolving "husband / wife" by the gender at that point
    const steps = [];
    let gender = me.gender;
    for (const v of values) {
      for (let s of v.split('+')) {
        if (s === 'SP') s = gender === 'M' ? 'W' : 'H';
        steps.push(s);
        gender = ['F', 'H', 'S', 'OB', 'YB'].includes(s) ? 'M' : 'F';
      }
    }
    const chain = buildChain(steps);
    const r = resolve(chain, me, null);
    const en = describeChain(chain);
    let html;
    if (r.kind === 'self') html = '<div class="note">That works out to be you!</div>';
    else if (r.kind === 'spouse') html = '<div class="note">That is your husband or wife.</div>';
    else html = resultBody(r);
    const kv = r.kind !== 'self' && r.kind !== 'spouse' ? childrenViewOfChain(me, steps, null) : null;
    const kids = kv && kv.kind !== 'self' ? `<div class="extra"><div class="row"><span class="k">Your children call them</span>${inline(kv, 'child')}</div></div>` : '';
    const gen = generationOf(chain);
    const notes = [r.general ? 'General polite term. Families sometimes use their own.' : '', r.note || ''].filter(Boolean);
    out.innerHTML = `<article class="card ${isElderResult(r) ? 'elder' : ''} fade">
      <div class="who"><span class="name">${esc(en)}</span></div>
      ${html}${kids}${isElderResult(r) ? greeting(r, gen) : r.kind === 'junior' ? juniorTip(me) : ''}
      ${notes.map(n => `<div class="note">${esc(n)}</div>`).join('')}
    </article>`;
    out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

// ---------------------------------------------------------------------------
// Audio (Teochew clips recorded by the family)
// ---------------------------------------------------------------------------
let closePicker = () => {};
document.addEventListener('click', e => { if (!e.target.closest('#picker')) closePicker(); });
let current = null;
document.addEventListener('click', e => {
  const b = e.target.closest('.play');
  if (!b) return;
  if (current) { current.pause(); document.querySelectorAll('.play.on').forEach(x => x.classList.remove('on')); }
  current = new Audio(`audio/teochew/${b.dataset.audio}.m4a`);
  b.classList.add('on');
  current.onended = current.onerror = () => b.classList.remove('on');
  current.play().catch(() => b.classList.remove('on'));
});

boot();
