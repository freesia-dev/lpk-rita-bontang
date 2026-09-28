// Kriptografi berbasis Web Crypto: jalan sama di Node 20+ dan Cloudflare Workers.
const enc = new TextEncoder();
const ITER = 100_000; // batas maksimum PBKDF2 di Workers
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex) => new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16)));

export const randomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));
export const randomHex = (n) => toHex(randomBytes(n));
export const newToken = () => btoa(String.fromCharCode(...randomBytes(32))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  return `pbkdf2$${ITER}$${toHex(salt)}$${toHex(await pbkdf2(password, salt, ITER))}`;
}

// Perbandingan waktu-konstan agar tidak bocor lewat timing.
const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export async function verifyPassword(password, stored, legacy) {
  const parts = String(stored || '').split('$');
  if (parts[0] === 'pbkdf2' && parts.length === 4) {
    const hash = toHex(await pbkdf2(password, fromHex(parts[2]), Number(parts[1])));
    return safeEqual(hash, parts[3]);
  }
  // Hash lama (scrypt) dari versi Node sebelumnya.
  return legacy ? legacy(password, stored) : false;
}
