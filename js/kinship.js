// Teo Family kinship engine
// Works out what one person calls another, in Mandarin and Teochew,
// from a family tree or from a hand-built relationship chain.
//
// Steps: F father, M mother, H husband, W wife, S son, D daughter,
//        OB/YB elder/younger brother, OS/YS elder/younger sister,
//        B/Z brother/sister of unknown relative age.

// ---------------------------------------------------------------------------
// Term dictionary. zh/py = Mandarin + Hanyu Pinyin. tc/ts = Teochew characters
// + easy "sound it out" spelling. num = pattern when birth order is known.
// conf = how sure we are of the Teochew line (family elders should review).
// ---------------------------------------------------------------------------
export const T = {
  baba:   { zh: '爸爸', py: 'bà ba', tc: '阿爸', ts: 'ah-pa', alt: { tc: '阿爹', ts: 'ah-tia' }, conf: 'likely' },
  mama:   { zh: '妈妈', py: 'mā ma', tc: '阿妈', ts: 'ah-mah', alt: { tc: '阿娘', ts: 'ah-nia' }, conf: 'likely' },

  yeye:    { zh: '爷爷', py: 'yé ye', tc: '阿公', ts: 'ah-gong', conf: 'certain' },
  nainai:  { zh: '奶奶', py: 'nǎi nai', tc: '阿嫲', ts: 'ah-ma', conf: 'certain' },
  waigong: { zh: '外公', py: 'wài gōng', tc: '阿公', ts: 'ah-gong', conf: 'likely' },
  waipo:   { zh: '外婆', py: 'wài pó', tc: '阿嫲', ts: 'ah-ma', conf: 'likely' },

  zengzufu:     { zh: '曾祖父', py: 'zēng zǔ fù', tc: '老公', ts: 'lao-gong', conf: 'likely' },
  zengzumu:     { zh: '曾祖母', py: 'zēng zǔ mǔ', tc: '老嫲', ts: 'lao-ma', conf: 'likely' },
  waizengzufu:  { zh: '外曾祖父', py: 'wài zēng zǔ fù', tc: '老公', ts: 'lao-gong', conf: 'likely' },
  waizengzumu:  { zh: '外曾祖母', py: 'wài zēng zǔ mǔ', tc: '老嫲', ts: 'lao-ma', conf: 'likely' },
  zengwaizufu:  { zh: '曾外祖父', py: 'zēng wài zǔ fù', tc: '老公', ts: 'lao-gong', conf: 'likely' },
  zengwaizumu:  { zh: '曾外祖母', py: 'zēng wài zǔ mǔ', tc: '老嫲', ts: 'lao-ma', conf: 'likely' },
  taigong:      { zh: '太公', py: 'tài gōng', tc: '老公', ts: 'lao-gong', conf: 'likely' },
  taipo:        { zh: '太婆', py: 'tài pó', tc: '老嫲', ts: 'lao-ma', conf: 'likely' },

  bogong:      { zh: '伯公', py: 'bó gōng', tc: '老伯', ts: 'lao-beh', num: ['{n}伯公', '{n} bó gōng', '{n}老伯', '{n}-lao-beh'], conf: 'likely' },
  shugong:     { zh: '叔公', py: 'shū gōng', tc: '老叔', ts: 'lao-chek', num: ['{n}叔公', '{n} shū gōng', '{n}老叔', '{n}-lao-chek'], conf: 'likely' },
  gupo:        { zh: '姑婆', py: 'gū pó', tc: '老姑', ts: 'lao-kou', num: ['{n}姑婆', '{n} gū pó', '{n}老姑', '{n}-lao-kou'], conf: 'likely' },
  jiugong:     { zh: '舅公', py: 'jiù gōng', tc: '老舅', ts: 'lao-ku', num: ['{n}舅公', '{n} jiù gōng', '{n}老舅', '{n}-lao-ku'], conf: 'likely' },
  yipo:        { zh: '姨婆', py: 'yí pó', tc: '老姨', ts: 'lao-ee', num: ['{n}姨婆', '{n} yí pó', '{n}老姨', '{n}-lao-ee'], conf: 'likely' },
  bopo:        { zh: '伯婆', py: 'bó pó', tc: '老姆', ts: 'lao-m', num: ['{n}伯婆', '{n} bó pó', '{n}老姆', '{n}-lao-m'], conf: 'likely' },
  shupo:       { zh: '叔婆', py: 'shū pó', tc: '老婶', ts: 'lao-sim', num: ['{n}叔婆', '{n} shū pó', '{n}老婶', '{n}-lao-sim'], conf: 'likely' },
  guzhanggong: { zh: '姑丈公', py: 'gū zhàng gōng', tc: '老丈', ts: 'lao-tieo', num: ['{n}姑丈公', '{n} gū zhàng gōng', '{n}老丈', '{n}-lao-tieo'], conf: 'likely' },
  jiupo:       { zh: '舅婆', py: 'jiù pó', tc: '老妗', ts: 'lao-kim', num: ['{n}舅婆', '{n} jiù pó', '{n}老妗', '{n}-lao-kim'], conf: 'likely' },
  yizhanggong: { zh: '姨丈公', py: 'yí zhàng gōng', tc: '老丈', ts: 'lao-tieo', num: ['{n}姨丈公', '{n} yí zhàng gōng', '{n}老丈', '{n}-lao-tieo'], conf: 'likely' },

  bobo:     { zh: '伯伯', py: 'bó bo', tc: '阿伯', ts: 'ah-beh', num: ['{n}伯', '{n} bó', '{n}伯', '{n}-beh'], conf: 'certain' },
  bomu:     { zh: '伯母', py: 'bó mǔ', tc: '阿姆', ts: 'ah-m', num: ['{n}伯母', '{n} bó mǔ', '{n}姆', '{n}-m'], conf: 'likely' },
  shushu:   { zh: '叔叔', py: 'shū shu', tc: '阿叔', ts: 'ah-chek', num: ['{n}叔', '{n} shū', '{n}叔', '{n}-chek'], conf: 'certain' },
  shenshen: { zh: '婶婶', py: 'shěn shen', tc: '阿婶', ts: 'ah-sim', num: ['{n}婶', '{n} shěn', '{n}婶', '{n}-sim'], conf: 'certain' },
  gugu:     { zh: '姑姑', py: 'gū gu', tc: '阿姑', ts: 'ah-kou', num: ['{n}姑', '{n} gū', '{n}姑', '{n}-kou'], conf: 'certain' },
  guzhang:  { zh: '姑丈', py: 'gū zhàng', tc: '阿丈', ts: 'ah-tieo', num: ['{n}姑丈', '{n} gū zhàng', '{n}丈', '{n}-tieo'], conf: 'likely' },
  jiujiu:   { zh: '舅舅', py: 'jiù jiu', tc: '阿舅', ts: 'ah-ku', num: ['{n}舅', '{n} jiù', '{n}舅', '{n}-ku'], conf: 'certain' },
  jiuma:    { zh: '舅妈', py: 'jiù mā', tc: '阿妗', ts: 'ah-kim', num: ['{n}舅妈', '{n} jiù mā', '{n}妗', '{n}-kim'], conf: 'certain' },
  ayi:      { zh: '阿姨', py: 'ā yí', tc: '阿姨', ts: 'ah-ee', num: ['{n}姨', '{n} yí', '{n}姨', '{n}-ee'], conf: 'certain' },
  yizhang:  { zh: '姨丈', py: 'yí zhàng', tc: '阿丈', ts: 'ah-tieo', num: ['{n}姨丈', '{n} yí zhàng', '{n}丈', '{n}-tieo'], conf: 'likely' },

  gege:      { zh: '哥哥', py: 'gē ge', tc: '阿兄', ts: 'ah-hia', num: ['{n}哥', '{n} gē', '{n}兄', '{n}-hia'], conf: 'likely' },
  jiejie:    { zh: '姐姐', py: 'jiě jie', tc: '阿姐', ts: 'ah-jieh', num: ['{n}姐', '{n} jiě', '{n}姐', '{n}-jieh'], conf: 'likely' },
  tangge:    { zh: '堂哥', py: 'táng gē', tc: '阿兄', ts: 'ah-hia', conf: 'likely' },
  tangjie:   { zh: '堂姐', py: 'táng jiě', tc: '阿姐', ts: 'ah-jieh', conf: 'likely' },
  biaoge:    { zh: '表哥', py: 'biǎo gē', tc: '阿兄', ts: 'ah-hia', conf: 'likely' },
  biaojie:   { zh: '表姐', py: 'biǎo jiě', tc: '阿姐', ts: 'ah-jieh', conf: 'likely' },
  saosao:    { zh: '嫂嫂', py: 'sǎo sao', tc: '阿嫂', ts: 'ah-so', num: ['{n}嫂', '{n} sǎo', '{n}嫂', '{n}-so'], conf: 'certain' },
  tangsao:   { zh: '堂嫂', py: 'táng sǎo', tc: '阿嫂', ts: 'ah-so', conf: 'likely' },
  biaosao:   { zh: '表嫂', py: 'biǎo sǎo', tc: '阿嫂', ts: 'ah-so', conf: 'likely' },
  jiefu:     { zh: '姐夫', py: 'jiě fu', tc: '姐夫', ts: 'jieh-hu', num: ['{n}姐夫', '{n} jiě fu', '{n}姐夫', '{n}-jieh-hu'], conf: 'likely' },
  tangjiefu: { zh: '堂姐夫', py: 'táng jiě fu', tc: '姐夫', ts: 'jieh-hu', conf: 'likely' },
  biaojiefu: { zh: '表姐夫', py: 'biǎo jiě fu', tc: '姐夫', ts: 'jieh-hu', conf: 'likely' },

  qingjiagong: { zh: '亲家公', py: 'qìng jia gōng', tc: '亲家', ts: 'chin-ke', conf: 'guessing' },
  qingjiamu:   { zh: '亲家母', py: 'qìng jia mǔ', tc: '亲家姆', ts: 'chin-ke-m', conf: 'guessing' },

  gonggong: { zh: '公公', py: 'gōng gong', tc: '阿公', ts: 'ah-gong', conf: 'likely' },
  popo:     { zh: '婆婆', py: 'pó po', tc: '阿嫲', ts: 'ah-ma', conf: 'likely' },
};

// Reference terms for juniors (you call them by name; this is what they ARE to you).
export const R = {
  erzi: ['儿子', 'ér zi', 'son'], nuer: ['女儿', 'nǚ ér', 'daughter'],
  didi: ['弟弟', 'dì di', 'younger brother'], meimei: ['妹妹', 'mèi mei', 'younger sister'],
  tangdi: ['堂弟', 'táng dì', 'younger cousin'], tangmei: ['堂妹', 'táng mèi', 'younger cousin'],
  biaodi: ['表弟', 'biǎo dì', 'younger cousin'], biaomei: ['表妹', 'biǎo mèi', 'younger cousin'],
  zhizi: ['侄子', 'zhí zi', 'nephew'], zhinu: ['侄女', 'zhí nǚ', 'niece'],
  waisheng: ['外甥', 'wài sheng', 'nephew'], waishengnu: ['外甥女', 'wài sheng nǚ', 'niece'],
  tangzhi: ['堂侄', 'táng zhí', "cousin's son"], tangzhinu: ['堂侄女', 'táng zhí nǚ', "cousin's daughter"],
  biaozhi: ['表侄', 'biǎo zhí', "cousin's son"], biaozhinu: ['表侄女', 'biǎo zhí nǚ', "cousin's daughter"],
  sunzi: ['孙子', 'sūn zi', 'grandson'], sunnu: ['孙女', 'sūn nǚ', 'granddaughter'],
  waisun: ['外孙', 'wài sūn', 'grandson'], waisunnu: ['外孙女', 'wài sūn nǚ', 'granddaughter'],
  zhisun: ['侄孙', 'zhí sūn', 'grand-nephew'], zhisunnu: ['侄孙女', 'zhí sūn nǚ', 'grand-niece'],
  tangzhisun: ['堂侄孙', 'táng zhí sūn', "cousin's grandson"], tangzhisunnu: ['堂侄孙女', 'táng zhí sūn nǚ', "cousin's granddaughter"],
  biaozhisun: ['表侄孙', 'biǎo zhí sūn', "cousin's grandson"], biaozhisunnu: ['表侄孙女', 'biǎo zhí sūn nǚ', "cousin's granddaughter"],
  zengsun: ['曾孙', 'zēng sūn', 'great-grandson'], zengsunnu: ['曾孙女', 'zēng sūn nǚ', 'great-granddaughter'],
  dimei: ['弟妹', 'dì mèi', "younger brother's wife"], meifu: ['妹夫', 'mèi fu', "younger sister's husband"],
  xifu: ['媳妇', 'xí fu', 'daughter-in-law'], nuxu: ['女婿', 'nǚ xu', 'son-in-law'],
  zhixifu: ['侄媳妇', 'zhí xí fu', "nephew's wife"], zhinuxu: ['侄女婿', 'zhí nǚ xu', "niece's husband"],
  waishengxifu: ['外甥媳妇', 'wài sheng xí fu', "nephew's wife"], waishengnuxu: ['外甥女婿', 'wài sheng nǚ xu', "niece's husband"],
  xiaoshu: ['小叔', 'xiǎo shū', "husband's younger brother"], xiaogu: ['小姑', 'xiǎo gū', "husband's younger sister"],
  xiaojiuzi: ['小舅子', 'xiǎo jiù zi', "wife's younger brother"], xiaoyizi: ['小姨子', 'xiǎo yí zi', "wife's younger sister"],
  sunxifu: ['孙媳妇', 'sūn xí fu', "grandson's wife"], sunnuxu: ['孙女婿', 'sūn nǚ xu', "granddaughter's husband"],
};

const INLAW_JUNIOR = { HYB: 'xiaoshu', HYS: 'xiaogu', WYB: 'xiaojiuzi', WYS: 'xiaoyizi', HS: 'erzi', HD: 'nuer', WS: 'erzi', WD: 'nuer' };

const NUM_SMALL = { zh: '小', py: 'xiǎo', ts: 'suey' };
const NUM = {
  zh: ['', '大', '二', '三', '四', '五', '六', '七', '八', '九', '十'],
  py: ['', 'dà', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ', 'shí'],
  ts: ['', 'tua', 'ji', 'sa', 'si', 'ngou', 'lak', 'chit', 'poih', 'kau', 'tsap'],
};
NUM.zh.small = NUM_SMALL.zh; NUM.py.small = NUM_SMALL.py; NUM.ts.small = NUM_SMALL.ts;

const SPOUSE_OF = {
  bobo: 'bomu', shushu: 'shenshen', gugu: 'guzhang', jiujiu: 'jiuma', ayi: 'yizhang',
  bogong: 'bopo', shugong: 'shupo', gupo: 'guzhanggong', jiugong: 'jiupo', yipo: 'yizhanggong',
  yeye: 'nainai', nainai: 'yeye', waigong: 'waipo', waipo: 'waigong', baba: 'mama', mama: 'baba',
  zengzufu: 'zengzumu', zengzumu: 'zengzufu', zengwaizufu: 'zengwaizumu', zengwaizumu: 'zengwaizufu', waizengzufu: 'waizengzumu', waizengzumu: 'waizengzufu',
  taigong: 'taipo', taipo: 'taigong', gonggong: 'popo', popo: 'gonggong',
  gege: 'saosao', tangge: 'tangsao', biaoge: 'biaosao', jiejie: 'jiefu', tangjie: 'tangjiefu', biaojie: 'biaojiefu',
};
const JUNIOR_SPOUSE_OF = {
  didi: 'dimei', tangdi: 'dimei', biaodi: 'dimei', meimei: 'meifu', tangmei: 'meifu', biaomei: 'meifu',
  erzi: 'xifu', nuer: 'nuxu', zhizi: 'zhixifu', zhinu: 'zhinuxu', tangzhi: 'zhixifu', tangzhinu: 'zhinuxu',
  biaozhi: 'zhixifu', biaozhinu: 'zhinuxu', waisheng: 'waishengxifu', waishengnu: 'waishengnuxu',
  sunzi: 'sunxifu', sunnu: 'sunnuxu', waisun: 'sunxifu', waisunnu: 'sunnuxu',
};

const STEP_EN = {
  F: 'father', M: 'mother', H: 'husband', W: 'wife', S: 'son', D: 'daughter',
  OB: 'elder brother', YB: 'younger brother', OS: 'elder sister', YS: 'younger sister', B: 'brother', Z: 'sister',
};
const isUp = s => s === 'F' || s === 'M';
const isDown = s => s === 'S' || s === 'D';
const isSib = s => ['OB', 'YB', 'OS', 'YS', 'B', 'Z'].includes(s);
const isSpouse = s => s === 'H' || s === 'W';
const genderOf = s => (['F', 'H', 'S', 'OB', 'YB', 'B'].includes(s) ? 'M' : 'F');

// ---------------------------------------------------------------------------
// Family tree index
// ---------------------------------------------------------------------------
export function buildFamily(people) {
  const byId = new Map();
  people.forEach((p, i) => byId.set(p.id, { ...p, _i: i, children: [], spouses: [] }));
  for (const p of byId.values()) {
    for (const k of ['father', 'mother']) {
      const par = p[k] && byId.get(p[k]);
      if (par) par.children.push(p);
      else p[k] = null;
    }
    const sp = p.spouse && byId.get(p.spouse);
    if (sp) {
      if (!p.spouses.includes(sp)) p.spouses.push(sp);
      if (!sp.spouses.includes(p)) sp.spouses.push(p);
    }
  }
  for (const p of byId.values()) p.children.sort((a, b) => ageOrder(a, b));
  return { byId, people: [...byId.values()] };
}

function sharesParent(a, b) {
  return (a.father && a.father === b.father) || (a.mother && a.mother === b.mother);
}
// Birth year can be exact ("born": 1981, decimals allowed to order same-year births)
// or a range when only the zodiac is known ("bornRange": [2012, 2024]).
function span(p) {
  if (p.born != null) return [p.born, p.born];
  if (Array.isArray(p.bornRange)) return [Math.min(...p.bornRange), Math.max(...p.bornRange)];
  return null;
}
// negative => a is older
function ageOrder(a, b) {
  if (a.born != null && b.born != null && a.born !== b.born) return a.born - b.born;
  if (a.order != null && b.order != null && a.order !== b.order) return a.order - b.order;
  return a._i - b._i;
}
// 1 = a older than b, -1 = a younger, null = unknown
export function compareAge(a, b) {
  if (!a || !b || a === b) return null;
  if (a.born != null && b.born != null && a.born !== b.born) return a.born < b.born ? 1 : -1;
  // same birth year: optional ageRank (1 = born earlier in that year)
  if (a.born != null && a.born === b.born && a.ageRank != null && b.ageRank != null && a.ageRank !== b.ageRank) return a.ageRank < b.ageRank ? 1 : -1;
  if (sharesParent(a, b)) return ageOrder(a, b) < 0 ? 1 : -1;
  const sa = span(a), sb = span(b);
  if (sa && sb) {
    if (sa[1] < sb[0]) return 1;
    if (sa[0] > sb[1]) return -1;
  }
  return null;
}

function siblingsOf(fam, p) {
  const set = new Set();
  for (const k of ['father', 'mother']) {
    const par = p[k] && fam.byId.get(p[k]);
    if (par) par.children.forEach(c => c !== p && set.add(c));
  }
  return [...set];
}

// Birth-order rank of p among same-gender children of p's parents (1 = eldest).
// Returns 0 when there is only one, so no number is shown.
function rankOf(fam, p, allowSmall = true) {
  if (!p) return 0;
  const group = [p, ...siblingsOf(fam, p)].filter(x => x.gender === p.gender);
  if (group.length < 2) return 0;
  group.sort(ageOrder);
  const r = group.indexOf(p) + 1;
  if (allowSmall && r === group.length) return -1; // youngest: 小 (eldest stays 大, middle ones are numbered)
  return r <= 10 ? r : 0;
}

// Shortest path through the tree, preferring blood links over marriage links.
export function findPath(fam, from, to) {
  if (from === to) return [];
  const dist = new Map([[from.id, 0]]);
  const prev = new Map();
  const queue = [[0, from]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, cur] = queue.shift();
    if (cur === to) break;
    if (d > (dist.get(cur.id) ?? Infinity)) continue;
    for (const [step, nb, cost] of neighbours(fam, cur)) {
      const nd = d + cost;
      if (nd < (dist.get(nb.id) ?? Infinity)) {
        dist.set(nb.id, nd);
        prev.set(nb.id, [cur, step]);
        queue.push([nd, nb]);
      }
    }
  }
  if (!prev.has(to.id)) return null;
  const chain = [];
  let cur = to;
  while (cur !== from) {
    const [p, step] = prev.get(cur.id);
    chain.unshift({ step, p: cur });
    cur = p;
  }
  return chain;
}

function neighbours(fam, p) {
  const out = [];
  for (const s of siblingsOf(fam, p)) {
    const c = compareAge(s, p);
    const m = s.gender === 'M';
    out.push([c === 1 ? (m ? 'OB' : 'OS') : c === -1 ? (m ? 'YB' : 'YS') : (m ? 'B' : 'Z'), s, 1]);
  }
  if (p.father) out.push(['F', fam.byId.get(p.father), 1]);
  if (p.mother) out.push(['M', fam.byId.get(p.mother), 1]);
  for (const c of p.children) out.push([c.gender === 'M' ? 'S' : 'D', c, 1]);
  for (const s of p.spouses) out.push([s.gender === 'M' ? 'H' : 'W', s, 1.05]);
  return out;
}

// ---------------------------------------------------------------------------
// Chain normalisation (used for hand-built chains and the children's view)
// ---------------------------------------------------------------------------
function sibStep(gender, older) {
  if (older === true) return gender === 'M' ? 'OB' : 'OS';
  if (older === false) return gender === 'M' ? 'YB' : 'YS';
  return gender === 'M' ? 'B' : 'Z';
}
const olderFlag = s => (s === 'OB' || s === 'OS' ? true : s === 'YB' || s === 'YS' ? false : null);

export function normalise(chain) {
  let c = chain.map(n => ({ ...n }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < c.length - 1; i++) {
      const a = c[i].step, b = c[i + 1].step;
      let rep = null;
      if (a === 'F' && b === 'W') rep = { step: 'M' };
      else if (a === 'M' && b === 'H') rep = { step: 'F' };
      else if (isUp(a) && isDown(b)) rep = { step: sibStep(genderOf(b), null) };
      else if (isSib(a) && isUp(b)) rep = { step: b };
      else if (isSib(a) && isSib(b)) {
        const oa = olderFlag(a), ob = olderFlag(b);
        rep = { step: sibStep(genderOf(b), oa === ob ? oa : null) };
      } else if (isSpouse(a) && isDown(b)) rep = { step: b };
      if (rep) {
        c.splice(i, 2, { ...c[i + 1], step: rep.step });
        changed = true;
        break;
      }
    }
  }
  return c;
}

// ---------------------------------------------------------------------------
// Term resolution
// ---------------------------------------------------------------------------
function mk(key, rank = 0) {
  const t = T[key];
  if (!t) return null;
  if (rank && t.num) {
    const pick = arr => (rank === -1 ? arr.small : arr[rank]);
    const f = (pat, arr) => pat.replace('{n}', pick(arr));
    return { key, rank, zh: f(t.num[0], NUM.zh), py: f(t.num[1], NUM.py), tc: f(t.num[2], NUM.zh), ts: f(t.num[3], NUM.ts), conf: t.conf, audio: `${key}-${rank === -1 ? 'small' : rank}` };
  }
  return { key, rank: 0, zh: t.zh, py: t.py, tc: t.tc, ts: t.ts, alt: t.alt, conf: t.conf, audio: key };
}
function junior(refKey, extra = {}) {
  const r = R[refKey];
  return { kind: 'junior', ref: r ? { zh: r[0], py: r[1], en: r[2], key: refKey } : null, ...extra };
}
function elder(key, rank = 0, extra = {}) {
  return { kind: 'elder', term: mk(key, rank), ...extra };
}
// Two possibilities depending on relative age.
// `who` is whose age to compare with: 'self' | 'father' | 'grandfather' | 'parents'
function either(older, younger, who) {
  return { kind: 'either', who, options: [{ older: true, ...older }, { older: false, ...younger }] };
}
// Text for an option, from the speaker's view ('self') or the speaker's child's view ('child').
export function whenText(who, older, view = 'self') {
  const names = view === 'spouse'
    ? { self: 'your spouse', father: "your spouse's father", grandfather: "your spouse's grandfather", parents: "your spouse's parents" }
    : view === 'child'
    ? { self: 'your child', father: 'you', grandfather: 'your father', parents: 'you' }
    : { self: 'you', father: 'your father', grandfather: 'your grandfather', parents: 'your parents' };
  return `if ${older ? 'older' : 'younger'} than ${names[who] || 'you'}`;
}

export function generationOf(chain) {
  return chain.reduce((g, n) => g + (isUp(n.step) ? 1 : isDown(n.step) ? -1 : 0), 0);
}

// nodes[0] is the speaker; nodes[i] is chain[i-1]
function ageCmp(nodes, i, j) {
  const x = nodes[i], y = nodes[j];
  if (x.p && y.p && !x.p.virtual && !y.p.virtual) {
    const c = compareAge(x.p, y.p);
    if (c != null) return c;
  }
  if (i === j + 1) {
    const f = olderFlag(x.step);
    if (f != null) return f ? 1 : -1;
  }
  if (j === i + 1) {
    const f = olderFlag(y.step);
    if (f != null) return f ? -1 : 1;
  }
  return null;
}

export function describeChain(chain) {
  if (!chain.length) return 'You';
  const words = chain.map(n => STEP_EN[n.step]);
  return 'Your ' + words.join("'s ");
}

/**
 * Resolve what the speaker calls the last person in chain.
 * @param chain array of {step, p?} (p = person object, may be absent for virtual)
 * @param speaker person object or {virtual:true, gender}
 * @param fam family index (optional, enables birth-order numbering)
 */
export function resolve(chain, speaker, fam = null) {
  chain = normalise(chain);
  if (!chain.length) return { kind: 'self' };
  const s0 = chain[0].step;

  if (chain.length === 1 && isSpouse(s0)) return { kind: 'spouse' };

  // Spouse's relatives: you call them what your spouse calls them.
  if (isSpouse(s0)) {
    const spouse = chain[0].p || { virtual: true, gender: genderOf(s0) };
    const rest = chain.slice(1);
    if (rest.length === 1 && isUp(rest[0].step)) {
      return elder(rest[0].step === 'F' ? 'baba' : 'mama', 0, { note: 'In-law: most families say 爸爸 / 妈妈, same as your spouse.' });
    }
    const r = resolve(rest, spouse, fam);
    if (r.kind === 'elder' || r.kind === 'peer' || r.kind === 'either') r.note = 'Same as your spouse calls them.';
    if (r.kind === 'either') {
      r.viaSpouse = true;
      r.options.forEach(o => { if (o.byName) o.ref = null; });
    }
    if (r.kind === 'junior') {
      // the junior's reference term is from your spouse's side, so name it as an in-law
      const k = rest.length === 1 ? INLAW_JUNIOR[s0 + rest[0].step] : null;
      r.ref = k ? refObj(k) : null;
    }
    return r;
  }

  const spIdx = chain.map((n, i) => (isSpouse(n.step) ? i : -1)).filter(i => i >= 0);
  if (spIdx.length === 0) return blood(chain, speaker, fam);
  if (spIdx.length === 1 && spIdx[0] === chain.length - 1) return marriedIn(chain, speaker, fam);
  // child's spouse's parent = 亲家
  if (chain.length === 3 && isDown(s0) && isSpouse(chain[1].step) && isUp(chain[2].step)) {
    return elder(chain[2].step === 'F' ? 'qingjiagong' : 'qingjiamu');
  }
  return generic(chain, speaker);
}

function blood(chain, speaker, fam) {
  const nodes = [{ p: speaker, step: null }, ...chain];
  let i = 0;
  while (i < chain.length && isUp(chain[i].step)) i++;
  const u = i;
  let sib = null;
  if (i < chain.length && isSib(chain[i].step)) { sib = i; i++; }
  while (i < chain.length && isDown(chain[i].step)) i++;
  if (i !== chain.length) return generic(chain, speaker);
  const d = chain.length - u - (sib != null ? 1 : 0);
  const g = u - d;
  const B = chain[chain.length - 1];
  const bMale = genderOf(B.step) === 'M';
  const last = nodes.length - 1;

  // Direct ancestors
  if (sib == null && d === 0) {
    const firstF = chain[0].step === 'F';
    if (g === 1) return elder(bMale ? 'baba' : 'mama');
    if (g === 2) return elder(firstF ? (bMale ? 'yeye' : 'nainai') : (bMale ? 'waigong' : 'waipo'));
    if (g === 3) {
      const allF = chain.every(n => n.step === 'F' || (n === B && n.step === 'M'));
      if (allF) return elder(bMale ? 'zengzufu' : 'zengzumu');
      return elder(firstF ? (bMale ? 'zengwaizufu' : 'zengwaizumu') : (bMale ? 'waizengzufu' : 'waizengzumu'));
    }
    return elder(bMale ? 'taigong' : 'taipo');
  }

  // Direct descendants
  if (sib == null && u === 0) {
    const firstS = chain[0].step === 'S';
    if (d === 1) return junior(bMale ? 'erzi' : 'nuer');
    if (d === 2) return junior(firstS ? (bMale ? 'sunzi' : 'sunnu') : (bMale ? 'waisun' : 'waisunnu'));
    if (d === 3) return junior(bMale ? 'zengsun' : 'zengsunnu');
    return junior(null);
  }

  // Collateral, elder generation: depends on the speaker's ancestor at B's level
  if (g >= 1) {
    const anchorIdx = g; // nodes index of the ancestor at B's generation
    const anchor = nodes[anchorIdx];
    const aMale = genderOf(anchor.step) === 'M';
    const direct = u === g && sib != null && d === 0; // B is that ancestor's own sibling
    const rank = direct && fam && B.p && !B.p.virtual ? rankOf(fam, B.p) : 0;
    if (g >= 3) return elder(bMale ? 'taigong' : 'taipo');
    const tbl = g === 1
      ? { mo: 'bobo', my: 'shushu', f: 'gugu', mm: 'jiujiu', mf: 'ayi' }
      : { mo: 'bogong', my: 'shugong', f: 'gupo', mm: 'jiugong', mf: 'yipo' };
    if (aMale && bMale) {
      const c = ageCmp(nodes, last, anchorIdx);
      if (c === 1) return elder(tbl.mo, rank);
      if (c === -1) return elder(tbl.my, rank);
      const who = g === 1 ? 'father' : 'grandfather';
      return either({ term: mk(tbl.mo) }, { term: mk(tbl.my) }, who);
    }
    if (aMale) return elder(tbl.f, rank);
    return elder(bMale ? tbl.mm : tbl.mf, rank);
  }

  // Same generation
  if (g === 0) {
    const c = ageCmp(nodes, last, 0);
    if (u === 0) {
      // own brothers and sisters keep plain numbers (大哥, 二哥), never 小
      const rank = fam && B.p && !B.p.virtual ? rankOf(fam, B.p, false) : 0;
      if (c === 1) return { kind: 'peer', term: mk(bMale ? 'gege' : 'jiejie', rank) };
      if (c === -1) return junior(bMale ? 'didi' : 'meimei');
      return either({ term: mk(bMale ? 'gege' : 'jiejie') }, { byName: true, ref: refObj(bMale ? 'didi' : 'meimei') }, 'self');
    }
    const tang = chain.slice(0, -1).every(n => genderOf(n.step) === 'M');
    const olderKey = tang ? (bMale ? 'tangge' : 'tangjie') : (bMale ? 'biaoge' : 'biaojie');
    const youngerKey = tang ? (bMale ? 'tangdi' : 'tangmei') : (bMale ? 'biaodi' : 'biaomei');
    if (c === 1) return { kind: 'peer', term: mk(olderKey) };
    if (c === -1) return junior(youngerKey);
    return either({ term: mk(olderKey) }, { byName: true, ref: refObj(youngerKey) }, 'self');
  }

  // Younger generation
  const sibNode = chain[sib];
  const sibMale = genderOf(sibNode.step) === 'M';
  if (u === 0) {
    if (g === -1) return junior(sibMale ? (bMale ? 'zhizi' : 'zhinu') : (bMale ? 'waisheng' : 'waishengnu'));
    if (g === -2) return junior(bMale ? 'zhisun' : 'zhisunnu');
    return junior(null);
  }
  if (g === -1) {
    const tang = chain.slice(0, -1).every(n => genderOf(n.step) === 'M');
    return junior(tang ? (bMale ? 'tangzhi' : 'tangzhinu') : (bMale ? 'biaozhi' : 'biaozhinu'));
  }
  if (g === -2) {
    const tang = chain.slice(0, -1).every(n => genderOf(n.step) === 'M');
    return junior(tang ? (bMale ? 'tangzhisun' : 'tangzhisunnu') : (bMale ? 'biaozhisun' : 'biaozhisunnu'));
  }
  return junior(null);
}

function refObj(k) {
  const r = R[k];
  return r ? { zh: r[0], py: r[1], en: r[2], key: k } : null;
}

function marriedIn(chain, speaker, fam) {
  const base = blood(chain.slice(0, -1), speaker, fam);
  const mapTerm = t => {
    const k = t && SPOUSE_OF[t.key];
    return k ? mk(k, t.rank && T[k].num ? t.rank : 0) : null;
  };
  if (base.kind === 'elder' || base.kind === 'peer') {
    const t = mapTerm(base.term);
    if (t) return { kind: base.kind, term: t };
  }
  if (base.kind === 'either') {
    const opts = base.options.map(o => (o.term ? { ...o, term: mapTerm(o.term) } : { ...o, ref: o.ref ? refObj(JUNIOR_SPOUSE_OF[o.ref.key]) : null }));
    if (opts.every(o => o.term || o.byName)) return { kind: 'either', who: base.who, options: opts };
  }
  if (base.kind === 'junior') {
    const k = base.ref && JUNIOR_SPOUSE_OF[base.ref.key];
    return junior(k || null);
  }
  return generic(chain, speaker);
}

// Polite general term when the exact title is unusual.
function generic(chain, speaker) {
  const g = generationOf(chain);
  const bMale = genderOf(chain[chain.length - 1].step) === 'M';
  const tag = { general: true };
  if (g >= 3) return elder(bMale ? 'taigong' : 'taipo', 0, tag);
  if (g === 2) return elder(bMale ? 'gonggong' : 'popo', 0, tag);
  if (g === 1) {
    if (!bMale) return elder('ayi', 0, tag);
    return { ...either({ term: mk('bobo') }, { term: mk('shushu') }, 'parents'), ...tag };
  }
  if (g === 0) {
    const nodes = [{ p: speaker }, ...chain];
    const c = ageCmp(nodes, nodes.length - 1, 0);
    if (c === 1) return { kind: 'peer', term: mk(bMale ? 'gege' : 'jiejie'), ...tag };
    if (c === -1) return junior(null, tag);
    return { ...either({ term: mk(bMale ? 'gege' : 'jiejie') }, { byName: true, ref: null }, 'self'), ...tag };
  }
  return junior(null, tag);
}

// ---------------------------------------------------------------------------
// High-level helpers for the app
// ---------------------------------------------------------------------------
export function relate(fam, speaker, target) {
  const chain = findPath(fam, speaker, target);
  if (chain == null) return { chain: null, result: null, en: 'Not linked in the family tree yet' };
  return { chain, result: resolve(chain, speaker, fam), en: describeChain(chain) };
}

// What the speaker's children call target. Uses real children when listed,
// otherwise an imagined child of the speaker.
export function childrenView(fam, speaker, target) {
  if (target === speaker || speaker.spouses.includes(target) || speaker.children.includes(target)) return null;
  if (speaker.children.length) {
    return speaker.children
      .filter(c => c !== target)
      .map(c => {
        const ch = findPath(fam, c, target);
        return ch ? { child: c, result: resolve(ch, c, fam) } : null;
      })
      .filter(Boolean);
  }
  const base = findPath(fam, speaker, target);
  if (!base) return null;
  const kid = { virtual: true, gender: null };
  const chain = [{ step: speaker.gender === 'M' ? 'F' : 'M', p: speaker }, ...base];
  return [{ child: null, result: resolve(chain, kid, fam) }];
}

// For the hand-built chain on the page.
export function buildChain(steps) {
  return steps.map(s => ({ step: s, p: null }));
}

export function childrenViewOfChain(speaker, steps, fam) {
  const chain = [{ step: speaker.gender === 'M' ? 'F' : 'M', p: speaker }, ...buildChain(steps)];
  return resolve(chain, { virtual: true, gender: null }, fam);
}

// Is the result someone you greet first at CNY?
export function isElderResult(r) {
  return r && (r.kind === 'elder' || r.kind === 'peer' || (r.kind === 'either' && r.options.some(o => o.term)));
}

export const GREETING = {
  zh: '新年快乐！恭喜发财！', py: 'xīn nián kuài lè! gōng xǐ fā cái!',
  zhSenior: '新年快乐！身体健康！', pySenior: 'xīn nián kuài lè! shēn tǐ jiàn kāng!',
  tc: '新正如意，新年发财！', ts: 'sing-jia ju-ee, sing-ni huat-chai!',
};
