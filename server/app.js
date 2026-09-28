// Inti aplikasi berbasis Web standard (Request -> Response).
// Dipakai oleh server/node.js (lokal/VPS) dan worker/index.js (Cloudflare Workers + D1 + R2).
//
// db      : { get(sql,...a), all(sql,...a), run(sql,...a) -> {lastId,changes}, batch([[sql,...a]]) }  (semua async)
// storage : { put(key, bytes, type), get(key) -> {body,type}|null, delete(key) }                       (semua async)
import { SCHEMA } from './schema.js';
import { defaultSite, defaultCourses } from './seed.js';
import { hashPassword, verifyPassword, newToken, randomHex } from './crypto.js';
import { renderLanding, esc, themeVars } from './render.js';
import { renderCertificate, renderCertLookup } from './certificate.js';

const SESSION_DAYS = 14;
const UPLOAD_TYPES = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/gif': '.gif', 'application/pdf': '.pdf' };
const UPLOAD_MIME = Object.fromEntries(Object.entries(UPLOAD_TYPES).map(([m, e]) => [e, m]));
const BASE_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' };

class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const fail = (status, msg) => { throw new HttpError(status, msg); };
const str = (v, max = 500) => String(v ?? '').trim().slice(0, max);
const today = () => new Date().toISOString().slice(0, 10);
const clone = (o) => JSON.parse(JSON.stringify(o));

const parseCookies = (header = '') => Object.fromEntries(header.split(';').map((p) => p.trim().split('=')).filter((p) => p[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));

// Gabungkan konten tersimpan dengan default agar field baru tetap muncul setelah update kode.
const merge = (base, over) => {
  if (Array.isArray(base) || Array.isArray(over)) return over ?? base;
  if (base && typeof base === 'object') {
    const out = { ...base };
    for (const k of Object.keys(over || {})) out[k] = merge(base[k], over[k]);
    return out;
  }
  return over ?? base;
};

// LMS helpers
const parseCourse = (c) => c && ({ ...c, curriculum: JSON.parse(c.curriculum || '[]'), published: !!c.published });
const lessonsOf = (course) => course.curriculum.flatMap((s) => s.lessons || []);
const stripAnswers = (course) => ({
  ...course,
  curriculum: course.curriculum.map((s) => ({
    ...s, lessons: (s.lessons || []).map((l) => (l.type === 'quiz' ? { ...l, questions: (l.questions || []).map(({ answer, explain, ...q }) => q) } : l)),
  })),
});
const outline = (course) => ({
  ...course,
  curriculum: course.curriculum.map((s) => ({ ...s, lessons: (s.lessons || []).map(({ id, title, type, minutes }) => ({ id, title, type, minutes })) })),
});
const progressSummary = (course, prog) => {
  const total = lessonsOf(course).length;
  const done = lessonsOf(course).filter((l) => prog?.[l.id]?.done).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
};
const publicUser = (u) => u && ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, xp: u.xp, streak: u.streak });
const isAdmin = (u) => u && (u.role === 'superadmin' || u.role === 'admin');
const needUser = (u) => u || fail(401, 'Silakan masuk terlebih dahulu');
const needAdmin = (u) => (isAdmin(u) ? u : fail(u ? 403 : 401, 'Akses khusus admin'));
const needSuper = (u) => (u?.role === 'superadmin' ? u : fail(403, 'Akses khusus superadmin'));

const courseInput = (b) => {
  const slug = str(b.slug || b.title, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!str(b.title)) fail(400, 'Judul kelas wajib diisi');
  if (!slug) fail(400, 'Slug tidak valid');
  const curriculum = Array.isArray(b.curriculum) ? b.curriculum : [];
  return [slug, str(b.title, 160), str(b.category, 60), str(b.summary, 600), str(b.cover, 500), str(b.level, 40),
    b.access === 'approval' ? 'approval' : 'open', b.published ? 1 : 0, Math.min(100, Math.max(0, Number(b.pass_score) || 70)), JSON.stringify(curriculum)];
};

function decodeBase64(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function createApp({ db, storage, adminEmail, adminPassword, onAdminCreated, legacyVerify }) {
  // ---------- data situs ----------
  const getKV = async (key) => { const r = await db.get('SELECT value FROM kv WHERE key = ?', key); return r ? JSON.parse(r.value) : null; };
  const setKV = (key, value) => db.run('INSERT INTO kv(key, value, updated_at) VALUES(?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP', key, JSON.stringify(value));
  const getSite = async () => merge(defaultSite, (await getKV('site')) || {});

  // ---------- inisialisasi sekali per instance ----------
  let ready;
  const ensureReady = () => (ready ??= (async () => {
    await db.batch(SCHEMA.map((s) => [s]));
    if (!(await getKV('site'))) await setKV('site', defaultSite);
    if (!(await db.get('SELECT 1 FROM courses LIMIT 1'))) {
      await db.batch(defaultCourses.map((c, i) => ['INSERT INTO courses(slug,title,category,summary,cover,level,access,published,pass_score,curriculum,position) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        c.slug, c.title, c.category, c.summary, c.cover, c.level, c.access, c.published, c.passScore, JSON.stringify(c.curriculum), i]));
    }
    if (!(await db.get("SELECT 1 FROM users WHERE role = 'superadmin'"))) {
      const email = adminEmail || 'admin@lpkrita.id';
      const password = typeof adminPassword === 'function' ? adminPassword() : adminPassword;
      if (password) {
        await db.run("INSERT INTO users(name,email,password,role) VALUES (?,?,?, 'superadmin')", 'Super Admin', email, await hashPassword(password));
        await onAdminCreated?.(email, password);
      } else {
        console.warn('[lpkrita] ADMIN_PASSWORD belum diset — akun superadmin belum dibuat.');
      }
    }
  })().catch((e) => { ready = null; throw e; }));

  // ---------- sesi ----------
  async function currentUser(request) {
    const token = parseCookies(request.headers.get('cookie') || '').sid;
    if (!token) return null;
    const row = await db.get('SELECT u.id,u.name,u.email,u.phone,u.role,u.active,u.xp,u.streak,u.last_active,s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?', token);
    if (!row || row.expires_at < Date.now() || !row.active) return null;
    return row;
  }
  async function startSession(ctx, userId) {
    const token = newToken();
    await db.run('INSERT INTO sessions(token,user_id,expires_at) VALUES (?,?,?)', token, userId, Date.now() + SESSION_DAYS * 864e5);
    await db.run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
    ctx.cookies.push(`sid=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${ctx.secure ? '; Secure' : ''}`);
  }

  // Batas percobaan sederhana per IP (per instance).
  const hits = new Map();
  function rateLimit(ctx, key, max, windowMs) {
    const k = `${key}:${ctx.ip}`; const now = Date.now();
    const h = (hits.get(k) || []).filter((t) => now - t < windowMs);
    if (h.length >= max) fail(429, 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
    h.push(now); hits.set(k, h);
    if (hits.size > 5000) hits.clear();
  }

  // ---------- LMS ----------
  const getEnrollment = (userId, courseId) => db.get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', userId, courseId);

  async function touchActivity(user, xpGain) {
    const t = today();
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const streak = user.last_active === t ? user.streak : user.last_active === y ? user.streak + 1 : 1;
    await db.run('UPDATE users SET xp = xp + ?, streak = ?, last_active = ? WHERE id = ?', xpGain, streak, t, user.id);
  }

  async function finishLesson(user, enr, course, lessonId, data, xp) {
    const prog = JSON.parse(enr.progress || '{}');
    const first = !prog[lessonId]?.done;
    prog[lessonId] = { ...prog[lessonId], ...data, done: true, at: new Date().toISOString() };
    let completed = enr.completed_at; let cert = enr.cert_code; let bonus = 0;
    const sum = progressSummary(course, prog);
    if (!completed && sum.done === sum.total && sum.total > 0) {
      completed = new Date().toISOString();
      cert = `LPKR-${new Date().getFullYear()}-${randomHex(3).toUpperCase()}`;
      bonus = 100;
    }
    await db.run("UPDATE enrollments SET progress = ?, completed_at = ?, cert_code = ?, status = CASE WHEN ? IS NOT NULL THEN 'completed' ELSE status END WHERE id = ?",
      JSON.stringify(prog), completed ?? null, cert ?? null, completed ?? null, enr.id);
    await touchActivity(user, (first ? xp : 0) + bonus);
    return { progress: prog, summary: sum, completed: !!completed, justCompleted: bonus > 0, certCode: cert, xpGained: (first ? xp : 0) + bonus };
  }

  async function lessonCtx(user, params) {
    const c = parseCourse(await db.get('SELECT * FROM courses WHERE id = ?', params.id)) || fail(404, 'Kelas tidak ditemukan');
    let e = await getEnrollment(user.id, c.id);
    if (!e && isAdmin(user)) { await db.run("INSERT INTO enrollments(user_id,course_id,status) VALUES (?,?,'active')", user.id, c.id); e = await getEnrollment(user.id, c.id); }
    if (!e || e.status === 'pending' || e.status === 'blocked') fail(403, 'Anda belum terdaftar aktif di kelas ini');
    const lesson = lessonsOf(c).find((l) => l.id === params.lid) || fail(404, 'Materi tidak ditemukan');
    return { c, e, lesson };
  }

  // ---------- routes ----------
  const routes = [];
  const on = (method, path, handler) => {
    const keys = []; const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
    routes.push({ method, re, keys, handler });
  };

  // Auth
  on('POST', '/api/auth/login', async ({ body, ctx }) => {
    rateLimit(ctx, 'login', 10, 10 * 60e3);
    const u = await db.get('SELECT * FROM users WHERE email = ?', str(body.email, 200));
    if (!u || !(await verifyPassword(body.password, u.password, legacyVerify))) fail(401, 'Email atau kata sandi salah');
    if (!u.active) fail(403, 'Akun dinonaktifkan. Hubungi admin.');
    // Tingkatkan hash lama ke format baru saat login berhasil.
    if (!String(u.password).startsWith('pbkdf2$')) await db.run('UPDATE users SET password = ? WHERE id = ?', await hashPassword(body.password), u.id);
    await startSession(ctx, u.id);
    return { user: publicUser(u) };
  });
  on('POST', '/api/auth/register', async ({ body, ctx }) => {
    rateLimit(ctx, 'register', 5, 60 * 60e3);
    const name = str(body.name, 120); const email = str(body.email, 200).toLowerCase(); const phone = str(body.phone, 30);
    if (name.length < 2) fail(400, 'Nama wajib diisi');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Email tidak valid');
    if (String(body.password || '').length < 8) fail(400, 'Kata sandi minimal 8 karakter');
    if (await db.get('SELECT 1 FROM users WHERE email = ?', email)) fail(409, 'Email sudah terdaftar. Silakan masuk.');
    const r = await db.run("INSERT INTO users(name,email,phone,password,role) VALUES (?,?,?,?,'student')", name, email, phone, await hashPassword(body.password));
    await startSession(ctx, r.lastId);
    return { user: publicUser(await db.get('SELECT * FROM users WHERE id = ?', r.lastId)) };
  });
  on('POST', '/api/auth/logout', async ({ request, ctx }) => {
    const token = parseCookies(request.headers.get('cookie') || '').sid;
    if (token) await db.run('DELETE FROM sessions WHERE token = ?', token);
    ctx.cookies.push(`sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${ctx.secure ? '; Secure' : ''}`);
    return { ok: true };
  });
  on('GET', '/api/auth/me', async ({ user }) => ({ user: publicUser(user) }));
  on('POST', '/api/auth/password', async ({ user, body }) => {
    needUser(user);
    const row = await db.get('SELECT password FROM users WHERE id = ?', user.id);
    if (!(await verifyPassword(body.current, row.password, legacyVerify))) fail(400, 'Kata sandi saat ini salah');
    if (String(body.next || '').length < 8) fail(400, 'Kata sandi baru minimal 8 karakter');
    await db.run('UPDATE users SET password = ? WHERE id = ?', await hashPassword(body.next), user.id);
    return { ok: true };
  });
  on('PATCH', '/api/auth/profile', async ({ user, body }) => {
    needUser(user);
    await db.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', str(body.name, 120) || user.name, str(body.phone, 30), user.id);
    return { ok: true };
  });

  // Publik
  on('GET', '/api/public/brand', async () => { const s = await getSite(); return { brand: s.brand, theme: s.theme }; });
  on('POST', '/api/leads', async ({ body, ctx }) => {
    if (body.website) return { ok: true }; // honeypot bot
    rateLimit(ctx, 'lead', 5, 30 * 60e3);
    const name = str(body.name, 120); const phone = str(body.phone, 30);
    if (name.length < 2) fail(400, 'Nama wajib diisi');
    if (!/^[+\d][\d\s-]{7,}$/.test(phone)) fail(400, 'Nomor WhatsApp tidak valid');
    await db.run('INSERT INTO leads(name,phone,email,program,message) VALUES (?,?,?,?,?)', name, phone, str(body.email, 200), str(body.program, 120), str(body.message, 1000));
    return { ok: true };
  });

  // LMS siswa
  on('GET', '/api/lms/courses', async ({ user }) => {
    needUser(user);
    const courses = (await db.all('SELECT * FROM courses WHERE published = 1 ORDER BY position, id')).map(parseCourse);
    const enrs = Object.fromEntries((await db.all('SELECT * FROM enrollments WHERE user_id = ?', user.id)).map((e) => [e.course_id, e]));
    return {
      courses: courses.map((c) => {
        const e = enrs[c.id]; const prog = e ? JSON.parse(e.progress) : {};
        const minutes = lessonsOf(c).reduce((a, l) => a + (Number(l.minutes) || 0), 0);
        return { id: c.id, slug: c.slug, title: c.title, category: c.category, summary: c.summary, cover: c.cover, level: c.level, access: c.access,
          lessons: lessonsOf(c).length, minutes, enrollment: e ? { status: e.status, completed_at: e.completed_at, cert_code: e.cert_code, ...progressSummary(c, prog) } : null };
      }),
    };
  });
  on('POST', '/api/lms/courses/:id/enroll', async ({ user, params }) => {
    needUser(user);
    const c = (await db.get('SELECT * FROM courses WHERE id = ? AND published = 1', params.id)) || fail(404, 'Kelas tidak ditemukan');
    if (await getEnrollment(user.id, c.id)) return { ok: true };
    const status = c.access === 'open' || isAdmin(user) ? 'active' : 'pending';
    await db.run('INSERT INTO enrollments(user_id,course_id,status) VALUES (?,?,?)', user.id, c.id, status);
    return { ok: true, status };
  });
  on('GET', '/api/lms/courses/:slug', async ({ user, params }) => {
    needUser(user);
    const c = parseCourse(await db.get('SELECT * FROM courses WHERE slug = ?', params.slug)) || fail(404, 'Kelas tidak ditemukan');
    if (!c.published && !isAdmin(user)) fail(404, 'Kelas tidak ditemukan');
    const e = await getEnrollment(user.id, c.id);
    const canLearn = isAdmin(user) || !!(e && e.status !== 'pending' && e.status !== 'blocked');
    const prog = e ? JSON.parse(e.progress) : {};
    return {
      course: canLearn ? stripAnswers(c) : outline(c),
      enrollment: e ? { status: e.status, completed_at: e.completed_at, cert_code: e.cert_code, progress: prog, ...progressSummary(c, prog) } : null,
      canLearn,
    };
  });
  on('POST', '/api/lms/courses/:id/lessons/:lid/complete', async ({ user, params }) => {
    needUser(user);
    const { c, e, lesson } = await lessonCtx(user, params);
    if (lesson.type === 'quiz') fail(400, 'Kuis diselesaikan dengan mengirim jawaban');
    return finishLesson(user, e, c, lesson.id, {}, 10);
  });
  on('POST', '/api/lms/courses/:id/lessons/:lid/quiz', async ({ user, params, body }) => {
    needUser(user);
    const { c, e, lesson } = await lessonCtx(user, params);
    if (lesson.type !== 'quiz') fail(400, 'Materi ini bukan kuis');
    const qs = lesson.questions || [];
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const results = qs.map((q, i) => ({ correct: Number(answers[i]) === Number(q.answer), answer: q.answer, explain: q.explain || '' }));
    const score = qs.length ? Math.round((results.filter((r) => r.correct).length / qs.length) * 100) : 100;
    const passed = score >= (c.pass_score || 70);
    const prog = JSON.parse(e.progress || '{}');
    const best = Math.max(score, prog[lesson.id]?.best || 0);
    let out = { results, score, passed, best, passScore: c.pass_score };
    if (passed) out = { ...out, ...(await finishLesson(user, e, c, lesson.id, { best, score }, Math.round(10 + score / 5))) };
    else {
      prog[lesson.id] = { ...prog[lesson.id], best, score, attempts: (prog[lesson.id]?.attempts || 0) + 1 };
      await db.run('UPDATE enrollments SET progress = ? WHERE id = ?', JSON.stringify(prog), e.id);
      await touchActivity(user, 2);
    }
    return out;
  });
  on('GET', '/api/lms/leaderboard', async ({ user }) => {
    needUser(user);
    const rows = await db.all("SELECT id, name, xp FROM users WHERE role = 'student' AND active = 1 ORDER BY xp DESC, id LIMIT 5");
    return { top: rows.map((r) => ({ name: r.name.split(' ')[0] + (r.name.split(' ')[1] ? ' ' + r.name.split(' ')[1][0] + '.' : ''), xp: r.xp, me: r.id === user.id })) };
  });

  // ---------- Admin ----------
  on('GET', '/api/admin/site', async ({ user }) => { needAdmin(user); return { site: await getSite(), defaults: clone(defaultSite) }; });
  on('PUT', '/api/admin/site', async ({ user, body }) => {
    needAdmin(user);
    if (!body.site || typeof body.site !== 'object' || !body.site.sections) fail(400, 'Data situs tidak valid');
    await setKV('site', body.site);
    return { ok: true, site: await getSite() };
  });
  on('POST', '/api/admin/preview', async ({ user, body }) => {
    needAdmin(user);
    if (!body.site?.sections) fail(400, 'Data situs tidak valid');
    return { html: renderLanding(body.site, { preview: true }) };
  });
  on('POST', '/api/admin/site/reset', async ({ user }) => { needSuper(user); await setKV('site', defaultSite); return { ok: true, site: await getSite() }; });

  on('GET', '/api/admin/stats', async ({ user }) => {
    needAdmin(user);
    const one = async (sql) => Object.values((await db.get(sql)) || { n: 0 })[0];
    const [leadsNew, leadsTotal, students, activeWeek, enrollActive, pending, completed, courses, leadsByDay, leadsByProgram, recentLeads] = await Promise.all([
      one("SELECT COUNT(*) n FROM leads WHERE status = 'baru'"),
      one('SELECT COUNT(*) n FROM leads'),
      one("SELECT COUNT(*) n FROM users WHERE role = 'student'"),
      one("SELECT COUNT(*) n FROM users WHERE role = 'student' AND last_active >= date('now','-6 day')"),
      one("SELECT COUNT(*) n FROM enrollments WHERE status = 'active'"),
      one("SELECT COUNT(*) n FROM enrollments WHERE status = 'pending'"),
      one('SELECT COUNT(*) n FROM enrollments WHERE completed_at IS NOT NULL'),
      one('SELECT COUNT(*) n FROM courses'),
      db.all("SELECT date(created_at) d, COUNT(*) n FROM leads WHERE created_at >= date('now','-29 day') GROUP BY d"),
      db.all("SELECT COALESCE(NULLIF(program,''),'Belum memilih') program, COUNT(*) n FROM leads GROUP BY 1 ORDER BY n DESC LIMIT 6"),
      db.all('SELECT * FROM leads ORDER BY id DESC LIMIT 5'),
    ]);
    return { leadsNew, leadsTotal, students, activeWeek, enrollActive, pending, completed, courses, leadsByDay, leadsByProgram, recentLeads };
  });

  // Pendaftar
  on('GET', '/api/admin/leads', async ({ user }) => { needAdmin(user); return { leads: await db.all('SELECT * FROM leads ORDER BY id DESC') }; });
  on('PATCH', '/api/admin/leads/:id', async ({ user, params, body }) => {
    needAdmin(user);
    const cur = (await db.get('SELECT * FROM leads WHERE id = ?', params.id)) || fail(404, 'Data tidak ditemukan');
    await db.run('UPDATE leads SET status = ?, note = ? WHERE id = ?', str(body.status ?? cur.status, 30), str(body.note ?? cur.note, 1000), cur.id);
    return { ok: true };
  });
  on('DELETE', '/api/admin/leads/:id', async ({ user, params }) => { needAdmin(user); await db.run('DELETE FROM leads WHERE id = ?', params.id); return { ok: true }; });

  // Kelas
  on('GET', '/api/admin/courses', async ({ user }) => {
    needAdmin(user);
    const rows = await db.all('SELECT c.*, (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) students, (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.completed_at IS NOT NULL) graduates FROM courses c ORDER BY position, id');
    return { courses: rows.map(parseCourse) };
  });
  on('GET', '/api/admin/courses/:id', async ({ user, params }) => {
    needAdmin(user);
    return { course: parseCourse(await db.get('SELECT * FROM courses WHERE id = ?', params.id)) || fail(404, 'Kelas tidak ditemukan') };
  });
  on('POST', '/api/admin/courses/reorder', async ({ user, body }) => {
    needAdmin(user);
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (ids.length) await db.batch(ids.map((id, i) => ['UPDATE courses SET position = ? WHERE id = ?', i, Number(id)]));
    return { ok: true };
  });
  on('POST', '/api/admin/courses', async ({ user, body }) => {
    needAdmin(user);
    const v = courseInput(body);
    if (await db.get('SELECT 1 FROM courses WHERE slug = ?', v[0])) v[0] += '-' + randomHex(2);
    const pos = ((await db.get('SELECT MAX(position) m FROM courses'))?.m ?? 0) + 1;
    const r = await db.run('INSERT INTO courses(slug,title,category,summary,cover,level,access,published,pass_score,curriculum,position) VALUES (?,?,?,?,?,?,?,?,?,?,?)', ...v, pos);
    return { id: r.lastId };
  });
  on('PUT', '/api/admin/courses/:id', async ({ user, params, body }) => {
    needAdmin(user);
    const v = courseInput(body);
    if (await db.get('SELECT id FROM courses WHERE slug = ? AND id != ?', v[0], params.id)) fail(409, 'Slug sudah dipakai kelas lain');
    await db.run('UPDATE courses SET slug=?,title=?,category=?,summary=?,cover=?,level=?,access=?,published=?,pass_score=?,curriculum=? WHERE id = ?', ...v, params.id);
    return { ok: true };
  });
  on('DELETE', '/api/admin/courses/:id', async ({ user, params }) => { needAdmin(user); await db.run('DELETE FROM courses WHERE id = ?', params.id); return { ok: true }; });

  // Peserta kelas
  on('GET', '/api/admin/enrollments', async ({ user }) => {
    needAdmin(user);
    const rows = await db.all('SELECT e.*, u.name, u.email, u.phone, c.title course_title, c.curriculum FROM enrollments e JOIN users u ON u.id = e.user_id JOIN courses c ON c.id = e.course_id ORDER BY e.id DESC');
    return { enrollments: rows.map(({ curriculum, progress, ...r }) => ({ ...r, ...progressSummary({ curriculum: JSON.parse(curriculum) }, JSON.parse(progress)) })) };
  });
  on('POST', '/api/admin/enrollments', async ({ user, body }) => {
    needAdmin(user);
    if (await getEnrollment(Number(body.user_id), Number(body.course_id))) fail(409, 'Siswa sudah terdaftar di kelas ini');
    await db.run("INSERT INTO enrollments(user_id,course_id,status) VALUES (?,?,'active')", Number(body.user_id), Number(body.course_id));
    return { ok: true };
  });
  on('PATCH', '/api/admin/enrollments/:id', async ({ user, params, body }) => {
    needAdmin(user);
    const status = ['active', 'pending', 'blocked', 'completed'].includes(body.status) ? body.status : fail(400, 'Status tidak valid');
    await db.run('UPDATE enrollments SET status = ? WHERE id = ?', status, params.id);
    return { ok: true };
  });
  on('DELETE', '/api/admin/enrollments/:id', async ({ user, params }) => { needAdmin(user); await db.run('DELETE FROM enrollments WHERE id = ?', params.id); return { ok: true }; });

  // Pengguna
  on('GET', '/api/admin/users', async ({ user }) => {
    needAdmin(user);
    return { users: await db.all('SELECT u.id,u.name,u.email,u.phone,u.role,u.active,u.xp,u.streak,u.last_active,u.created_at,(SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) courses FROM users u ORDER BY u.id DESC') };
  });
  on('POST', '/api/admin/users', async ({ user, body }) => {
    needAdmin(user);
    const role = ['student', 'admin', 'superadmin'].includes(body.role) ? body.role : 'student';
    if (role !== 'student') needSuper(user);
    const email = str(body.email, 200).toLowerCase();
    if (!str(body.name) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Nama dan email wajib valid');
    if (String(body.password || '').length < 8) fail(400, 'Kata sandi minimal 8 karakter');
    if (await db.get('SELECT 1 FROM users WHERE email = ?', email)) fail(409, 'Email sudah terdaftar');
    const r = await db.run('INSERT INTO users(name,email,phone,password,role) VALUES (?,?,?,?,?)', str(body.name, 120), email, str(body.phone, 30), await hashPassword(body.password), role);
    return { id: r.lastId };
  });
  on('PATCH', '/api/admin/users/:id', async ({ user, params, body }) => {
    needAdmin(user);
    const target = (await db.get('SELECT * FROM users WHERE id = ?', params.id)) || fail(404, 'Pengguna tidak ditemukan');
    if (target.role !== 'student' || (body.role && body.role !== 'student')) needSuper(user);
    if (target.id === user.id && (body.active === false || (body.role && body.role !== user.role))) fail(400, 'Tidak bisa menonaktifkan / menurunkan akun sendiri');
    const role = ['student', 'admin', 'superadmin'].includes(body.role) ? body.role : target.role;
    await db.run('UPDATE users SET name = ?, phone = ?, role = ?, active = ? WHERE id = ?',
      str(body.name ?? target.name, 120), str(body.phone ?? target.phone, 30), role, body.active === undefined ? target.active : (body.active ? 1 : 0), target.id);
    if (body.password) {
      if (String(body.password).length < 8) fail(400, 'Kata sandi minimal 8 karakter');
      await db.run('UPDATE users SET password = ? WHERE id = ?', await hashPassword(body.password), target.id);
      await db.run('DELETE FROM sessions WHERE user_id = ?', target.id);
    }
    return { ok: true };
  });
  on('DELETE', '/api/admin/users/:id', async ({ user, params }) => {
    needAdmin(user);
    const target = (await db.get('SELECT * FROM users WHERE id = ?', params.id)) || fail(404, 'Pengguna tidak ditemukan');
    if (target.id === user.id) fail(400, 'Tidak bisa menghapus akun sendiri');
    if (target.role !== 'student') needSuper(user);
    await db.run('DELETE FROM users WHERE id = ?', target.id);
    return { ok: true };
  });

  // Media
  on('GET', '/api/admin/media', async ({ user }) => { needAdmin(user); return { media: await db.all('SELECT * FROM media ORDER BY id DESC') }; });
  on('POST', '/api/admin/media', async ({ user, body }) => {
    needAdmin(user);
    const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(String(body.data || ''));
    if (!m || !UPLOAD_TYPES[m[1]]) fail(400, 'Hanya gambar (PNG, JPG, WEBP, GIF) atau PDF');
    const bytes = decodeBase64(m[2]);
    if (bytes.length > 8 * 1024 * 1024) fail(413, 'Maksimal 8 MB per file');
    const file = `${Date.now().toString(36)}-${randomHex(4)}${UPLOAD_TYPES[m[1]]}`;
    await storage.put(file, bytes, m[1]);
    const url = `/uploads/${file}`;
    const r = await db.run('INSERT INTO media(url,name,size) VALUES (?,?,?)', url, str(body.name, 200), bytes.length);
    return { id: r.lastId, url };
  });
  on('DELETE', '/api/admin/media/:id', async ({ user, params }) => {
    needAdmin(user);
    const m = (await db.get('SELECT * FROM media WHERE id = ?', params.id)) || fail(404, 'File tidak ditemukan');
    await storage.delete(m.url.replace('/uploads/', '')).catch(() => {});
    await db.run('DELETE FROM media WHERE id = ?', m.id);
    return { ok: true };
  });

  // Backup
  on('GET', '/api/admin/backup', async ({ user }) => {
    needSuper(user);
    return { exportedAt: new Date().toISOString(), site: await getSite(), courses: (await db.all('SELECT * FROM courses')).map(parseCourse) };
  });
  on('POST', '/api/admin/backup', async ({ user, body }) => {
    needSuper(user);
    if (body.site?.sections) await setKV('site', body.site);
    for (const c of Array.isArray(body.courses) ? body.courses : []) {
      const v = courseInput(c);
      const ex = await db.get('SELECT id FROM courses WHERE slug = ?', v[0]);
      if (ex) await db.run('UPDATE courses SET slug=?,title=?,category=?,summary=?,cover=?,level=?,access=?,published=?,pass_score=?,curriculum=? WHERE id = ?', ...v, ex.id);
      else await db.run('INSERT INTO courses(slug,title,category,summary,cover,level,access,published,pass_score,curriculum) VALUES (?,?,?,?,?,?,?,?,?,?)', ...v);
    }
    return { ok: true };
  });

  // ---------- responses ----------
  const respond = (status, body, headers = {}, cookies = []) => {
    const h = new Headers({ ...BASE_HEADERS, ...headers });
    for (const c of cookies) h.append('Set-Cookie', c);
    return new Response(body, { status, headers: h });
  };
  const json = (status, data, cookies) => respond(status, JSON.stringify(data), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, cookies);
  const htmlRes = (status, body, cache = 'no-cache') => respond(status, body, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache });

  async function readJson(request) {
    const len = Number(request.headers.get('content-length') || 0);
    if (len > 12 * 1024 * 1024) fail(413, 'Ukuran data terlalu besar');
    const text = await request.text();
    if (text.length > 12 * 1024 * 1024) fail(413, 'Ukuran data terlalu besar');
    if (!text) return {};
    try { return JSON.parse(text); } catch { fail(400, 'Format data tidak valid'); }
  }

  // ---------- handler utama ----------
  return async function fetch(request, { ip = 'x' } = {}) {
    const url = new URL(request.url);
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { return htmlRes(400, 'Bad request'); }
    const ctx = { cookies: [], ip, secure: url.protocol === 'https:' };
    try {
      await ensureReady();
      if (path.startsWith('/api/')) {
        // CSRF: mutasi wajib JSON dan (jika ada) Origin harus sama dengan host.
        if (request.method !== 'GET') {
          if (!String(request.headers.get('content-type') || '').includes('application/json')) fail(415, 'Content-Type harus application/json');
          const origin = request.headers.get('origin');
          if (origin && new URL(origin).host !== url.host) fail(403, 'Origin tidak diizinkan');
        }
        for (const r of routes) {
          if (r.method !== request.method) continue;
          const m = r.re.exec(path);
          if (!m) continue;
          const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
          const body = request.method === 'GET' ? {} : await readJson(request);
          const user = await currentUser(request);
          const out = await r.handler({ request, params, body, user, ctx, query: url.searchParams });
          return json(200, out, ctx.cookies);
        }
        fail(404, 'Endpoint tidak ditemukan');
      }

      if (path === '/' || path === '/index.html') return htmlRes(200, renderLanding(await getSite()));
      if (path === '/sertifikat' || path === '/sertifikat/') return htmlRes(200, renderCertLookup(await getSite(), url.searchParams.get('kode')));
      const cert = /^\/sertifikat\/([\w-]+)$/.exec(path);
      if (cert) {
        const row = await db.get('SELECT e.cert_code, e.completed_at, u.name, c.title, c.category FROM enrollments e JOIN users u ON u.id = e.user_id JOIN courses c ON c.id = e.course_id WHERE e.cert_code = ?', cert[1]);
        const site = await getSite();
        return htmlRes(row ? 200 : 404, row ? renderCertificate(site, row) : renderCertLookup(site, cert[1], true));
      }
      const up = /^\/uploads\/([\w.-]+)$/.exec(path);
      if (up) {
        const obj = await storage.get(up[1]);
        if (obj) {
          return respond(200, obj.body, {
            'Content-Type': obj.type || UPLOAD_MIME[up[1].slice(up[1].lastIndexOf('.'))] || 'application/octet-stream',
            'Cache-Control': 'public, max-age=604800, immutable',
            'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
          });
        }
      }
      const site = await getSite();
      return htmlRes(404, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Halaman tidak ditemukan</title><style>${themeVars(site.theme)}body{font-family:system-ui;background:var(--paper);color:var(--ink);display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}a{color:var(--accent)}</style><div><h1>404</h1><p>Halaman tidak ditemukan.</p><a href="/">Kembali ke beranda</a></div>`);
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) console.error(err);
      if (path.startsWith('/api/')) return json(status, { error: status === 500 ? 'Terjadi kesalahan server' : err.message }, ctx.cookies);
      return htmlRes(status, esc(status === 500 ? 'Terjadi kesalahan server' : err.message));
    }
  };
}
