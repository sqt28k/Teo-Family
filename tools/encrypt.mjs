// Usage: PASSCODE="your family passcode" node tools/encrypt.mjs path/to/family.json
// Writes data/family.enc.json (safe to publish). Never commit the plain JSON.
import fs from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
const [, , src = 'data/family.json'] = process.argv;
const pass = process.env.PASSCODE;
if (!pass) { console.error('Set PASSCODE env var'); process.exit(1); }
const plain = JSON.parse(fs.readFileSync(src, 'utf8'));
const ITER = 600000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.trim().toLowerCase().replace(/\s+/g, ' ')), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(plain)));
const b64 = u => Buffer.from(u).toString('base64');
fs.writeFileSync('data/family.enc.json', JSON.stringify({ v: 1, iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(new Uint8Array(ct)) }));
console.log(`Encrypted ${plain.people.length} people -> data/family.enc.json`);
