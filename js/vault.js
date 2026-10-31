// Family list is stored encrypted (AES-GCM, key from passcode via PBKDF2).
// The public repo only ever holds ciphertext.
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

export async function deriveKey(passcode, saltB64, iter) {
  const base = await crypto.subtle.importKey('raw', enc.encode(passcode.trim().toLowerCase().replace(/\s+/g, ' ')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: unb64(saltB64), iterations: iter, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
}
export async function decryptWithKey(key, box) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
  return JSON.parse(dec.decode(pt));
}
export async function exportKey(key) { return b64(await crypto.subtle.exportKey('raw', key)); }
export async function importKey(rawB64) {
  return crypto.subtle.importKey('raw', unb64(rawB64), { name: 'AES-GCM' }, true, ['decrypt']);
}
