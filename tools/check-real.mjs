// Prints titles from a few viewpoints of the real (private) list. Not committed output.
import fs from 'node:fs';
import { buildFamily, relate, childrenView, whenText } from '../js/kinship.js';
const fam = buildFamily(JSON.parse(fs.readFileSync('data/family.json')).people);
const fmt = r => !r ? '-' : r.kind === 'either' ? r.options.map(o => (o.term ? o.term.zh : 'name') + '(' + whenText(r.who, o.older) + ')').join('/') : r.kind === 'junior' ? 'name:' + (r.ref?.zh || '?') : r.term ? `${r.term.zh} ${r.term.ts}` : r.kind;
for (const v of process.argv.slice(2)) {
  const me = fam.byId.get(v);
  console.log(`\n=== ${me.name}`);
  for (const p of fam.people) if (p !== me) {
    const { result, en } = relate(fam, me, p);
    const kids = childrenView(fam, me, p);
    console.log(`${p.name.padEnd(14)} ${fmt(result).padEnd(22)} ${en}${kids && kids.length ? '  | kids: ' + fmt(kids[0].result) : ''}`);
  }
}
