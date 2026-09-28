// Entry untuk Node.js (lokal / VPS): SQLite bawaan Node + folder upload + file statis dari /public.
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { readFile, writeFile, unlink, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const UPLOAD_DIR = join(DATA_DIR, 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

const sqlite = new DatabaseSync(join(DATA_DIR, 'lpkrita.db'));
sqlite.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
const db = {
  get: async (sql, ...a) => sqlite.prepare(sql).get(...a) ?? null,
  all: async (sql, ...a) => sqlite.prepare(sql).all(...a),
  run: async (sql, ...a) => { const r = sqlite.prepare(sql).run(...a); return { lastId: Number(r.lastInsertRowid), changes: Number(r.changes) }; },
  batch: async (list) => { for (const [sql, ...a] of list) sqlite.prepare(sql).run(...a); },
};

const storage = {
  put: (key, bytes) => writeFile(join(UPLOAD_DIR, key), bytes),
  get: async (key) => { try { return { body: await readFile(join(UPLOAD_DIR, key)) }; } catch { return null; } },
  delete: (key) => unlink(join(UPLOAD_DIR, key)),
};

// Verifikasi hash scrypt dari versi awal (otomatis di-upgrade ke PBKDF2 saat login).
const legacyVerify = (pw, stored) => {
  const [algo, saltHex, hashHex] = String(stored).split('$');
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
  const hash = scryptSync(String(pw), Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === hash.length && timingSafeEqual(hash, expected);
};

const app = createApp({
  db, storage, legacyVerify,
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: () => process.env.ADMIN_PASSWORD || randomBytes(9).toString('base64url'),
  onAdminCreated: (email, password) => {
    if (process.env.ADMIN_PASSWORD) return;
    const file = join(DATA_DIR, 'admin-credentials.txt');
    writeFileSync(file, `Login superadmin LPK Rita\nURL      : /admin\nEmail    : ${email}\nPassword : ${password}\n\nSegera ganti password dari menu Akun, lalu hapus file ini.\n`);
    console.log(`[seed] Akun superadmin dibuat. Kredensial disimpan di ${file}`);
  },
});

// File statis (di Cloudflare ini ditangani otomatis oleh Workers Assets).
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};
async function serveStatic(pathname, res) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  const full = normalize(join(PUBLIC_DIR, rel));
  if (!full.startsWith(PUBLIC_DIR)) return false;
  try {
    let file = full;
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': rel.startsWith('/assets/img') ? 'public, max-age=604800' : 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
    return true;
  } catch { return false; }
}

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');
    if ((req.method === 'GET' || req.method === 'HEAD') && pathname !== '/' && !pathname.startsWith('/api/') && await serveStatic(pathname, res)) return;
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
      method: req.method, headers: req.headers, body: hasBody ? Readable.toWeb(req) : undefined, duplex: 'half',
    });
    const response = await app(request, { ip: req.socket.remoteAddress });
    const headers = Object.fromEntries(response.headers);
    const cookies = response.headers.getSetCookie();
    if (cookies.length) headers['set-cookie'] = cookies;
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500);
    res.end('Terjadi kesalahan server');
  }
}).listen(PORT, () => console.log(`LPK Rita berjalan di http://localhost:${PORT}  ·  admin: /admin  ·  kelas: /belajar`));
