// Entry untuk Cloudflare Workers: D1 (database) + R2 (upload) + Workers Assets (folder /public).
// File statis di /public dilayani otomatis oleh Cloudflare; Worker ini hanya menangani
// halaman dinamis (/, /sertifikat), API (/api/*), dan file upload (/uploads/*).
import { createApp } from '../server/app.js';

let app;

function build(env) {
  if (!env.DB) throw new Error('Binding D1 "DB" belum diatur di wrangler.jsonc');
  if (!env.MEDIA) throw new Error('Binding R2 "MEDIA" belum diatur di wrangler.jsonc');
  const D = env.DB;
  const db = {
    get: (sql, ...a) => D.prepare(sql).bind(...a).first(),
    all: async (sql, ...a) => (await D.prepare(sql).bind(...a).all()).results,
    run: async (sql, ...a) => { const r = await D.prepare(sql).bind(...a).run(); return { lastId: r.meta.last_row_id, changes: r.meta.changes }; },
    batch: (list) => D.batch(list.map(([sql, ...a]) => D.prepare(sql).bind(...a))),
  };
  const storage = {
    put: (key, bytes, type) => env.MEDIA.put(key, bytes, { httpMetadata: { contentType: type } }),
    get: async (key) => { const o = await env.MEDIA.get(key); return o ? { body: o.body, type: o.httpMetadata?.contentType } : null; },
    delete: (key) => env.MEDIA.delete(key),
  };
  return createApp({ db, storage, adminEmail: env.ADMIN_EMAIL, adminPassword: env.ADMIN_PASSWORD });
}

export default {
  async fetch(request, env) {
    app ??= build(env);
    return app(request, { ip: request.headers.get('cf-connecting-ip') || 'x' });
  },
};
