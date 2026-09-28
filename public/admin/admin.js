import { api, html, raw, render, esc, $, $$, toast, ico, fmtDate, fmtDateTime } from '/assets/js/core.js';

const app = $('#app');
const state = { user: null, site: null, saved: null, defaults: null, dirty: false, stats: null };
const clone = (o) => structuredClone(o);

// ---------------------------------------------------------------------------
// Skema konten: menentukan form apa yang muncul untuk setiap bagian landing page.
// t: text | textarea | image | url | color | number | select | toggle | list | strings | font
// ---------------------------------------------------------------------------
const ACCENT_HINT = 'Tip: apit kata dengan *bintang* untuk huruf miring berwarna aksen.';
const SECTIONS = {
  hero: { label: 'Hero (pembuka)', desc: 'Bagian paling atas yang pertama dilihat pengunjung.', fields: [
    { k: 'eyebrow', label: 'Label kecil di atas judul' },
    { k: 'title', label: 'Judul utama', t: 'textarea', rows: 2, hint: ACCENT_HINT },
    { k: 'subtitle', label: 'Deskripsi', t: 'textarea' },
    { group: 'Tombol', fields: [
      { k: 'primaryCta', label: 'Teks tombol utama', half: true }, { k: 'primaryHref', label: 'Tautan tombol utama', half: true },
      { k: 'secondaryCta', label: 'Teks tombol kedua', half: true }, { k: 'secondaryHref', label: 'Tautan tombol kedua', half: true },
    ] },
    { group: 'Foto', fields: [
      { k: 'image', label: 'Foto utama', t: 'image' }, { k: 'imageAlt', label: 'Deskripsi foto utama (alt)' },
      { k: 'image2', label: 'Foto kecil', t: 'image' }, { k: 'image2Alt', label: 'Deskripsi foto kecil (alt)' },
    ] },
    { k: 'badgeTitle', label: 'Judul lencana melayang', half: true }, { k: 'badgeText', label: 'Teks lencana', half: true },
    { k: 'stats', label: 'Angka unggulan', t: 'list', item: [{ k: 'value', label: 'Angka', half: true }, { k: 'label', label: 'Keterangan', half: true }], title: (x) => `${x.value} — ${x.label}`, max: 4 },
  ] },
  marquee: { label: 'Pita kejuruan', desc: 'Teks berjalan berisi daftar kejuruan.', fields: [
    { k: 'items', label: 'Daftar kejuruan', t: 'strings' },
  ] },
  about: { label: 'Tentang kami', fields: [
    { k: 'kicker', label: 'Label bagian', half: true }, { k: 'title', label: 'Judul', t: 'textarea', rows: 2, hint: ACCENT_HINT },
    { k: 'body', label: 'Cerita singkat', t: 'textarea', rows: 7, hint: 'Pisahkan paragraf dengan baris kosong.' },
    { k: 'image', label: 'Foto', t: 'image' }, { k: 'imageAlt', label: 'Deskripsi foto (alt)' },
    { k: 'quote', label: 'Kutipan pendiri', t: 'textarea' }, { k: 'quoteAuthor', label: 'Nama & jabatan pengutip' },
    { k: 'vision', label: 'Visi', t: 'textarea' },
    { k: 'missions', label: 'Misi', t: 'strings', multiline: true },
    { k: 'facts', label: 'Fakta lembaga', t: 'list', item: [{ k: 'label', label: 'Label', half: true }, { k: 'value', label: 'Isi', half: true }], title: (x) => `${x.label}: ${x.value}` },
  ] },
  programs: { label: 'Program pelatihan', desc: 'Daftar program juga dipakai di pilihan formulir pendaftaran.', fields: [
    { k: 'kicker', label: 'Label bagian', half: true }, { k: 'title', label: 'Judul', hint: ACCENT_HINT },
    { k: 'subtitle', label: 'Deskripsi', t: 'textarea' },
    { k: 'items', label: 'Program', t: 'list', title: (x) => x.title || 'Program baru', sub: (x) => x.category, thumb: 'image', item: [
      { k: 'title', label: 'Nama program', half: true }, { k: 'category', label: 'Kategori (untuk filter)', half: true },
      { k: 'desc', label: 'Deskripsi', t: 'textarea' },
      { k: 'duration', label: 'Durasi', half: true }, { k: 'level', label: 'Tingkat', half: true },
      { k: 'image', label: 'Foto', t: 'image' },
      { k: 'featured', label: 'Tampilkan besar (unggulan)', t: 'toggle' },
    ], blank: { title: '', category: 'Kecantikan', desc: '', duration: '± 1 bulan', level: 'Pemula', image: '', featured: false } },
  ] },
  why: { label: 'Keunggulan', fields: [
    { k: 'kicker', label: 'Label bagian', half: true }, { k: 'title', label: 'Judul', hint: ACCENT_HINT },
    { k: 'items', label: 'Poin keunggulan', t: 'list', title: (x) => x.title, item: [{ k: 'title', label: 'Judul' }, { k: 'desc', label: 'Penjelasan', t: 'textarea', rows: 2 }] },
  ] },
  steps: { label: 'Alur pendaftaran', fields: [
    { k: 'kicker', label: 'Label bagian', half: true }, { k: 'title', label: 'Judul', hint: ACCENT_HINT },
    { k: 'items', label: 'Langkah', t: 'list', title: (x) => x.title, item: [{ k: 'title', label: 'Judul langkah' }, { k: 'desc', label: 'Penjelasan', t: 'textarea', rows: 2 }], max: 6 },
  ] },
  gallery: { label: 'Galeri', fields: [
    { k: 'kicker', label: 'Label bagian', half: true }, { k: 'title', label: 'Judul', hint: ACCENT_HINT },
    { k: 'items', label: 'Foto', t: 'list', grid: true, title: (x) => x.caption || 'Foto', thumb: 'image', item: [{ k: 'image', label: 'Foto', t: 'image' }, { k: 'caption', label: 'Keterangan' }], blank: { image: '', caption: '' } },
  ] },
  team: { label: 'Instruktur & tim', fields: [
    { k: 'kicker', label: 'Label bagian', half: true }, { k: 'title', label: 'Judul', hint: ACCENT_HINT },
    { k: 'items', label: 'Anggota', t: 'list', title: (x) => x.name, sub: (x) => x.role, item: [{ k: 'name', label: 'Nama', half: true }, { k: 'role', label: 'Peran', half: true }, { k: 'photo', label: 'Foto (opsional)', t: 'image' }] },
  ] },
  testimonials: { label: 'Testimoni', fields: [
    { k: 'kicker', label: 'Label bagian', half: true }, { k: 'title', label: 'Judul', hint: ACCENT_HINT },
    { k: 'items', label: 'Testimoni', t: 'list', title: (x) => x.name, sub: (x) => x.quote, item: [{ k: 'quote', label: 'Isi testimoni', t: 'textarea' }, { k: 'name', label: 'Nama', half: true }, { k: 'meta', label: 'Keterangan (asal/kelas)', half: true }] },
  ] },
  partners: { label: 'Mitra & pengakuan', fields: [
    { k: 'title', label: 'Judul' },
    { k: 'items', label: 'Logo', t: 'list', grid: true, title: (x) => x.name, thumb: 'logo', item: [{ k: 'name', label: 'Nama lembaga' }, { k: 'logo', label: 'Logo', t: 'image' }] },
  ] },
  faq: { label: 'FAQ', fields: [
    { k: 'kicker', label: 'Label bagian', half: true }, { k: 'title', label: 'Judul', hint: ACCENT_HINT },
    { k: 'items', label: 'Pertanyaan', t: 'list', title: (x) => x.q, item: [{ k: 'q', label: 'Pertanyaan' }, { k: 'a', label: 'Jawaban', t: 'textarea' }] },
  ] },
  cta: { label: 'Formulir pendaftaran', desc: 'Data yang masuk tampil di menu Pendaftar.', fields: [
    { k: 'title', label: 'Judul', hint: ACCENT_HINT }, { k: 'subtitle', label: 'Deskripsi', t: 'textarea' },
    { k: 'image', label: 'Foto samping', t: 'image' }, { k: 'success', label: 'Pesan setelah terkirim', t: 'textarea', rows: 2 },
  ] },
  contact: { label: 'Kontak & peta', desc: 'Alamat, telepon, dan email diambil dari menu Identitas.', fields: [
    { k: 'kicker', label: 'Label bagian', half: true }, { k: 'title', label: 'Judul' },
  ] },
};
const BRAND_FIELDS = [
  { group: 'Identitas', fields: [
    { k: 'brand.name', label: 'Nama lembaga', half: true }, { k: 'brand.shortName', label: 'Nama singkat', half: true },
    { k: 'brand.tagline', label: 'Tagline' }, { k: 'brand.logo', label: 'Logo', t: 'image' },
  ] },
  { group: 'Kontak', fields: [
    { k: 'brand.phone', label: 'Telepon utama', half: true }, { k: 'brand.whatsapp', label: 'Nomor WhatsApp (format 62…)', half: true },
    { k: 'brand.phoneAlt', label: 'Telepon kantor', half: true }, { k: 'brand.email', label: 'Email', half: true },
    { k: 'brand.address', label: 'Alamat lengkap', t: 'textarea', rows: 2 }, { k: 'brand.mapsQuery', label: 'Kata kunci peta Google Maps', hint: 'Nama tempat / alamat yang dicari di Google Maps.' },
    { k: 'brand.hours', label: 'Jam operasional' },
  ] },
  { group: 'Media sosial', fields: [
    { k: 'brand.instagram', label: 'Instagram', t: 'url' }, { k: 'brand.facebook', label: 'Facebook', t: 'url' }, { k: 'brand.youtube', label: 'YouTube', t: 'url' },
  ] },
  { group: 'SEO & berbagi tautan', fields: [
    { k: 'seo.title', label: 'Judul halaman (tab browser & Google)' },
    { k: 'seo.description', label: 'Deskripsi untuk Google', t: 'textarea', rows: 3, max: 160 },
    { k: 'seo.ogImage', label: 'Gambar saat link dibagikan (WhatsApp, FB)', t: 'image' },
  ] },
];
const FONT_DISPLAY = ['Fraunces', 'Playfair Display', 'Cormorant Garamond', 'DM Serif Display', 'Libre Baskerville', 'Lora'];
const FONT_BODY = ['Plus Jakarta Sans', 'Manrope', 'DM Sans', 'Outfit', 'Figtree', 'Nunito Sans'];
const THEME_FIELDS = [
  { group: 'Warna', fields: [
    { k: 'theme.accent', label: 'Warna aksen (tombol, sorotan)', t: 'color', half: true }, { k: 'theme.ink', label: 'Warna teks & latar gelap', t: 'color', half: true },
    { k: 'theme.paper', label: 'Warna latar', t: 'color', half: true }, { k: 'theme.gold', label: 'Warna emas (sertifikat)', t: 'color', half: true },
  ] },
  { group: 'Tipografi & bentuk', fields: [
    { k: 'theme.displayFont', label: 'Huruf judul', t: 'select', options: FONT_DISPLAY, half: true },
    { k: 'theme.bodyFont', label: 'Huruf isi', t: 'select', options: FONT_BODY, half: true },
    { k: 'theme.radius', label: 'Kelengkungan sudut (px)', t: 'range', min: 0, max: 28 },
  ] },
];
const PRESETS = [
  { name: 'Mahkota Rita', accent: '#C8364A', ink: '#1B1416', paper: '#F7F2EC', gold: '#A9834F' },
  { name: 'Anggrek Kaltim', accent: '#7B3F8C', ink: '#1C1622', paper: '#F5F1F6', gold: '#B08D57' },
  { name: 'Hijau Mangrove', accent: '#1F6B52', ink: '#121A17', paper: '#F2F4EF', gold: '#B89A5A' },
  { name: 'Laut Bontang', accent: '#1D5FA8', ink: '#0F1720', paper: '#F3F5F8', gold: '#B08D57' },
  { name: 'Terracotta', accent: '#C0582F', ink: '#211712', paper: '#F8F1EA', gold: '#A57F48' },
];

// ---------------------------------------------------------------------------
// Path helpers
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
const setPath = (obj, path, val) => {
  const ks = path.split('.'); const last = ks.pop();
  const tgt = ks.reduce((o, k) => (o[k] ??= /^\d+$/.test(k) ? [] : {}), obj);
  tgt[last] = val;
};

// ---------------------------------------------------------------------------
// Form renderer generik
function field(f, base, root) {
  if (f.group) return html`<fieldset class="fgroup"><legend>${f.group}</legend><div class="fgrid">${f.fields.map((x) => field(x, base, root))}</div></fieldset>`;
  const path = base ? `${base}.${f.k}` : f.k;
  const v = getPath(root, path);
  const id = 'f_' + path.replace(/\./g, '_');
  const wrap = (inner, extra = '') => html`<div class="field ${f.half ? 'half' : ''} ${extra}"><label for="${id}">${f.label}</label>${inner}${f.hint ? html`<small class="hint">${f.hint}</small>` : ''}</div>`;
  switch (f.t) {
    case 'textarea':
      return wrap(html`<textarea id="${id}" data-path="${path}" rows="${f.rows || 4}" ${f.max ? raw(`maxlength="${f.max}"`) : ''}>${v ?? ''}</textarea>`);
    case 'image':
      return wrap(html`<div class="imgfield">
        <div class="imgthumb">${v ? html`<img src="${v}" alt="">` : ico('image')}</div>
        <div class="imgctl"><input id="${id}" data-path="${path}" value="${v ?? ''}" placeholder="/uploads/... atau https://...">
        <div class="row"><button type="button" class="btn sm" data-pick="${path}">${ico('image')} Pilih / unggah</button>${v ? html`<button type="button" class="btn sm ghost" data-clear="${path}">Hapus</button>` : ''}</div></div>
      </div>`);
    case 'color':
      return wrap(html`<div class="colorfield"><input type="color" data-path="${path}" value="${v || '#000000'}" aria-label="${f.label}"><input id="${id}" data-path="${path}" value="${v ?? ''}" pattern="#[0-9a-fA-F]{6}"></div>`);
    case 'select':
      return wrap(html`<select id="${id}" data-path="${path}">${f.options.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return html`<option value="${val}" ${val === v ? 'selected' : ''}>${lab}</option>`; })}</select>`);
    case 'range':
      return wrap(html`<div class="rangefield"><input id="${id}" type="range" min="${f.min}" max="${f.max}" data-path="${path}" data-num value="${v ?? 0}"><output>${v}px</output></div>`);
    case 'number':
      return wrap(html`<input id="${id}" type="number" data-path="${path}" data-num value="${v ?? ''}">`);
    case 'toggle':
      return html`<div class="field ${f.half ? 'half' : ''}"><label class="switch"><input type="checkbox" data-path="${path}" ${v ? 'checked' : ''}><span></span>${f.label}</label></div>`;
    case 'strings':
      return html`<div class="field"><label>${f.label}</label><div class="strings">
        ${(v || []).map((s, i) => html`<div class="string-row">${f.multiline ? html`<textarea rows="2" data-path="${path}.${i}">${s}</textarea>` : html`<input data-path="${path}.${i}" value="${s}">`}
          <div class="row-tools">${tools(path, i, (v || []).length)}</div></div>`)}
        <button type="button" class="btn sm ghost add" data-add="${path}" data-blank='""'>${ico('plus')} Tambah</button></div></div>`;
    case 'list': {
      const arr = v || [];
      return html`<div class="field"><div class="list-head"><label>${f.label}</label><span class="count">${arr.length} item</span></div>
        <div class="list ${f.grid ? 'is-grid' : ''}">
          ${arr.map((item, i) => html`<details class="item" ${openItems.has(`${path}.${i}`) ? 'open' : ''} data-key="${path}.${i}">
            <summary>
              ${f.thumb ? html`<span class="ithumb">${item[f.thumb] ? html`<img src="${item[f.thumb]}" alt="">` : ''}</span>` : html`<span class="inum">${String(i + 1).padStart(2, '0')}</span>`}
              <span class="ititle"><strong>${f.title?.(item) || `Item ${i + 1}`}</strong>${f.sub ? html`<small>${f.sub(item)}</small>` : ''}</span>
              <span class="row-tools">${tools(path, i, arr.length)}</span>
            </summary>
            <div class="fgrid">${f.item.map((x) => field(x, `${path}.${i}`, root))}</div>
          </details>`)}
        </div>
        ${!f.max || arr.length < f.max ? html`<button type="button" class="btn sm ghost add" data-add="${path}" data-blank="${JSON.stringify(f.blank || Object.fromEntries(f.item.map((x) => [x.k, x.t === 'toggle' ? false : ''])))}">${ico('plus')} Tambah ${f.label.toLowerCase()}</button>` : ''}
      </div>`;
    }
    case 'url':
      return wrap(html`<input id="${id}" type="url" data-path="${path}" value="${v ?? ''}" placeholder="https://">`);
    default:
      return wrap(html`<input id="${id}" data-path="${path}" value="${v ?? ''}" ${f.max ? raw(`maxlength="${f.max}"`) : ''}>`);
  }
}
const tools = (path, i, n) => html`
  <button type="button" class="tbtn" title="Naikkan" data-move="${path}" data-i="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''}>${ico('up')}</button>
  <button type="button" class="tbtn" title="Turunkan" data-move="${path}" data-i="${i}" data-d="1" ${i === n - 1 ? 'disabled' : ''}>${ico('down')}</button>
  <button type="button" class="tbtn danger" title="Hapus" data-del="${path}" data-i="${i}">${ico('trash')}</button>`;
const openItems = new Set();

// Pasang interaksi form ke objek data (dipakai editor konten & editor kelas).
function bindForm(scope, root, { onChange, rerender }) {
  scope.addEventListener('input', (e) => {
    const el = e.target.closest('[data-path]');
    if (!el) return;
    let val = el.type === 'checkbox' ? el.checked : el.value;
    if (el.dataset.num !== undefined) val = Number(val);
    setPath(root, el.dataset.path, val);
    if (el.type === 'color') { const t = scope.querySelector(`input[type=text][data-path="${el.dataset.path}"], input:not([type])[data-path="${el.dataset.path}"]`); if (t) t.value = val; }
    else if (/^#[0-9a-f]{6}$/i.test(val)) { const c = scope.querySelector(`input[type=color][data-path="${el.dataset.path}"]`); if (c) c.value = val; }
    if (el.type === 'range') el.nextElementSibling.textContent = `${val}px`;
    if (el.closest('.imgctl')) { const th = el.closest('.imgfield').querySelector('.imgthumb'); th.innerHTML = val ? `<img src="${esc(val)}" alt="">` : ''; }
    onChange();
  });
  scope.addEventListener('change', (e) => { if (e.target.matches('input[type=checkbox][data-path]')) { setPath(root, e.target.dataset.path, e.target.checked); onChange(); } });
  scope.addEventListener('toggle', (e) => { const d = e.target; if (d.matches?.('details.item')) d.open ? openItems.add(d.dataset.key) : openItems.delete(d.dataset.key); }, true);
  scope.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.add) {
      const arr = getPath(root, b.dataset.add) || []; arr.push(JSON.parse(b.dataset.blank)); setPath(root, b.dataset.add, arr);
      openItems.add(`${b.dataset.add}.${arr.length - 1}`); onChange(); rerender();
    } else if (b.dataset.move) {
      e.preventDefault();
      const arr = getPath(root, b.dataset.move); const i = +b.dataset.i; const j = i + +b.dataset.d;
      [arr[i], arr[j]] = [arr[j], arr[i]]; onChange(); rerender();
    } else if (b.dataset.del) {
      e.preventDefault();
      if (!confirm('Hapus item ini?')) return;
      getPath(root, b.dataset.del).splice(+b.dataset.i, 1); onChange(); rerender();
    } else if (b.dataset.pick) {
      const url = await mediaPicker();
      if (url) { setPath(root, b.dataset.pick, url); onChange(); rerender(); }
    } else if (b.dataset.clear) {
      setPath(root, b.dataset.clear, ''); onChange(); rerender();
    }
  });
}

// ---------------------------------------------------------------------------
// Modal & media picker
function modal(title, body, { wide = false } = {}) {
  const d = document.createElement('dialog');
  d.className = `modal ${wide ? 'wide' : ''}`;
  render(d, html`<header><h3>${title}</h3><button class="tbtn" data-close aria-label="Tutup">${ico('x')}</button></header><div class="modal-body">${body}</div>`);
  document.body.append(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  d.showModal();
  return d;
}

const fileToDataUrl = (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(file); });
async function compressImage(file, max = 2000) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) return fileToDataUrl(file);
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86);
}
async function uploadFiles(files) {
  const urls = [];
  for (const f of files) {
    try { const { url } = await api('/api/admin/media', { method: 'POST', body: { name: f.name, data: await compressImage(f) } }); urls.push(url); }
    catch (e) { toast(`${f.name}: ${e.message}`, 'err'); }
  }
  if (urls.length) toast(`${urls.length} file terunggah`);
  return urls;
}
const BUILTIN_IMAGES = ['uji-bnsp-2024', 'kelas-kecantikan', 'kelas-praktik', 'peserta-kecantikan', 'workshop-menjahit', 'praktik-menjahit', 'ujikom-bersama', 'ujikom-2', 'pelatihan-dinas', 'wisuda-peserta', 'peserta-batik', 'kelas-hantaran', 'peserta-kelas', 'galeri-karya'].map((n) => `/assets/img/${n}.jpg`);

function mediaPicker() {
  return new Promise(async (resolve) => {
    let chosen = null;
    const d = modal('Pilih gambar', html`<div class="dropzone" tabindex="0">${ico('upload')}<p><strong>Tarik & lepas foto di sini</strong> atau klik untuk memilih</p><small>JPG, PNG, WEBP · otomatis dikompres</small><input type="file" accept="image/*" multiple hidden></div><div class="media-grid" id="pickgrid"><p class="muted">Memuat…</p></div>`, { wide: true });
    d.addEventListener('close', () => resolve(chosen));
    const load = async () => {
      const { media } = await api('/api/admin/media');
      const imgs = [...media.filter((m) => !m.url.endsWith('.pdf')).map((m) => m.url), ...BUILTIN_IMAGES];
      render($('#pickgrid', d), html`${imgs.map((u) => html`<button class="media-card" data-url="${u}"><img src="${u}" alt="" loading="lazy"></button>`)}`);
    };
    load();
    const dz = $('.dropzone', d); const inp = $('input', dz);
    const up = async (files) => { dz.classList.add('busy'); const urls = await uploadFiles(files); dz.classList.remove('busy'); if (urls.length === 1) { chosen = urls[0]; d.close(); } else load(); };
    dz.onclick = () => inp.click();
    dz.onkeydown = (e) => { if (e.key === 'Enter') inp.click(); };
    inp.onchange = () => up([...inp.files]);
    dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); };
    dz.ondragleave = () => dz.classList.remove('over');
    dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove('over'); up([...e.dataTransfer.files]); };
    $('#pickgrid', d).addEventListener('click', (e) => { const b = e.target.closest('[data-url]'); if (b) { chosen = b.dataset.url; d.close(); } });
  });
}

// ---------------------------------------------------------------------------
// Shell (sidebar + konten)
const NAV = [
  { group: null, items: [{ r: 'ringkasan', label: 'Ringkasan', i: 'home' }] },
  { group: 'Situs', items: [{ r: 'konten', label: 'Konten halaman', i: 'layout' }, { r: 'tampilan', label: 'Tampilan & tema', i: 'palette' }, { r: 'identitas', label: 'Identitas & SEO', i: 'id' }] },
  { group: 'Pendaftaran', items: [{ r: 'pendaftar', label: 'Pendaftar', i: 'inbox', badge: 'leadsNew' }] },
  { group: 'Kelas online', items: [{ r: 'kelas', label: 'Kelas & materi', i: 'book' }, { r: 'peserta', label: 'Peserta kelas', i: 'grad', badge: 'pending' }] },
  { group: 'Sistem', items: [{ r: 'pengguna', label: 'Pengguna', i: 'users' }, { r: 'media', label: 'Media', i: 'image' }, { r: 'backup', label: 'Backup & pemulihan', i: 'archive', superOnly: true }, { r: 'akun', label: 'Akun saya', i: 'settings' }] },
];

function shell() {
  const route = location.hash.slice(2).split('/')[0] || 'ringkasan';
  const s = state.stats || {};
  render(app, html`
  <aside class="side" id="side">
    <a class="side-brand" href="#/ringkasan"><img src="${state.site?.brand.logo || '/assets/img/logo.png'}" alt=""><span><strong>${state.site?.brand.shortName || 'LPK Rita'}</strong><small>Dashboard</small></span></a>
    <nav>${NAV.map((g) => html`${g.group ? html`<p class="side-group">${g.group}</p>` : ''}${g.items.filter((it) => !it.superOnly || state.user.role === 'superadmin').map((it) => html`
      <a href="#/${it.r}" class="${route === it.r ? 'on' : ''}">${ico(it.i)}<span>${it.label}</span>${it.badge && s[it.badge] ? html`<em class="badge">${s[it.badge]}</em>` : ''}</a>`)}`)}</nav>
    <div class="side-foot">
      <a class="viewsite" href="/" target="_blank">${ico('ext')} Lihat situs</a>
      <div class="me"><span class="avatar">${state.user.name[0]}</span><span><strong>${state.user.name}</strong><small>${state.user.role === 'superadmin' ? 'Superadmin' : 'Admin'}</small></span><button class="tbtn" id="logout" title="Keluar">${ico('logout')}</button></div>
    </div>
  </aside>
  <div class="main">
    <header class="mtop"><button class="tbtn burger" id="burger" aria-label="Menu">${ico('menu')}</button><span class="mtop-title">${state.site?.brand.shortName || 'LPK Rita'} · Dashboard</span></header>
    <section id="view" class="view"></section>
  </div>
  <div class="savebar" id="savebar" ${state.dirty ? '' : 'hidden'}><span>Ada perubahan yang belum disimpan</span><button class="btn ghost light" id="discard">Batalkan</button><button class="btn primary" id="save">${ico('check')} Simpan & terbitkan</button></div>`);
  $('#logout').onclick = async () => { await api('/api/auth/logout', { method: 'POST', body: {} }); location.reload(); };
  $('#burger').onclick = () => $('#side').classList.toggle('open');
  $('#save').onclick = saveSite;
  $('#discard').onclick = () => { state.site = clone(state.saved); setDirty(false); route_(); };
  return route;
}

function setDirty(v) {
  state.dirty = v;
  const bar = $('#savebar'); if (bar) bar.hidden = !v;
}
async function saveSite() {
  const btn = $('#save'); btn.disabled = true;
  try {
    const { site } = await api('/api/admin/site', { method: 'PUT', body: { site: state.site } });
    state.site = site; state.saved = clone(site); setDirty(false); toast('Tersimpan. Situs sudah diperbarui.');
    refreshPreview(true);
  } catch (e) { toast(e.message, 'err'); } finally { btn.disabled = false; }
}
addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });

const pageHead = (title, sub, actions = '') => html`<div class="phead"><div><h1>${title}</h1>${sub ? html`<p>${sub}</p>` : ''}</div><div class="phead-act">${actions}</div></div>`;

// ---------------------------------------------------------------------------
// Pratinjau langsung
let previewTimer;
function refreshPreview(now = false) {
  const fr = $('#preview');
  if (!fr) return;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(async () => {
    try {
      const { html: h } = await api('/api/admin/preview', { method: 'POST', body: { site: state.site } });
      const y = fr.contentWindow?.scrollY || 0;
      fr.srcdoc = h;
      fr.onload = () => {
        const doc = fr.contentDocument; doc.documentElement.style.scrollBehavior = 'auto';
        const target = fr.dataset.jump === '1' && doc.getElementById(fr.dataset.anchor);
        if (target) { target.scrollIntoView(); fr.dataset.jump = '0'; } else fr.contentWindow.scrollTo(0, y);
      };
    } catch { /* abaikan */ }
  }, now ? 0 : 450);
}
const ANCHOR = { hero: 'beranda', about: 'tentang', programs: 'program', why: 'keunggulan', steps: 'alur', gallery: 'galeri', team: 'tim', testimonials: 'testimoni', faq: 'faq', cta: 'daftar', contact: 'kontak' };
function previewPane() {
  return html`<div class="pv"><div class="pv-bar"><span class="dots"><i></i><i></i><i></i></span><span>Pratinjau langsung</span>
    <div class="seg" id="pvsize"><button data-w="100%" class="on" title="Desktop">Desktop</button><button data-w="390px" title="Ponsel">Ponsel</button></div></div>
    <div class="pv-frame"><iframe id="preview" title="Pratinjau situs"></iframe></div></div>`;
}
function bindPreviewSize() {
  $('#pvsize')?.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('#pvsize button').forEach((x) => x.classList.toggle('on', x === b));
    $('#preview').style.width = b.dataset.w;
    $('.pv-frame').classList.toggle('mobile', b.dataset.w !== '100%');
  });
}

// ---------------------------------------------------------------------------
// Halaman: Ringkasan
async function viewDashboard(v) {
  render(v, html`${pageHead(`Halo, ${state.user.name.split(' ')[0]}`, 'Ringkasan aktivitas situs dan kelas online.')}<div class="skeleton"></div>`);
  const s = state.stats = await api('/api/admin/stats');
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10); return { d, n: s.leadsByDay.find((x) => x.d === d)?.n || 0 }; });
  const max = Math.max(1, ...days.map((x) => x.n));
  const progMax = Math.max(1, ...s.leadsByProgram.map((x) => x.n));
  render(v, html`
    ${pageHead(`Halo, ${state.user.name.split(' ')[0]}`, 'Ringkasan aktivitas situs dan kelas online.', html`<a class="btn ghost" href="/" target="_blank">${ico('ext')} Lihat situs</a><a class="btn primary" href="#/konten">${ico('layout')} Edit halaman</a>`)}
    <div class="kpis">
      <a class="kpi accent" href="#/pendaftar"><span>Pendaftar baru</span><strong>${s.leadsNew}</strong><small>dari ${s.leadsTotal} total</small></a>
      <a class="kpi" href="#/pengguna"><span>Siswa terdaftar</span><strong>${s.students}</strong><small>${s.activeWeek} aktif 7 hari terakhir</small></a>
      <a class="kpi" href="#/peserta"><span>Peserta kelas aktif</span><strong>${s.enrollActive}</strong><small>${s.pending} menunggu persetujuan</small></a>
      <a class="kpi" href="#/peserta"><span>Lulus & bersertifikat</span><strong>${s.completed}</strong><small>di ${s.courses} kelas</small></a>
    </div>
    ${s.pending ? html`<a class="notice" href="#/peserta">${ico('grad')}<span><strong>${s.pending} permintaan bergabung kelas</strong> menunggu persetujuan Anda.</span>${ico('arrow')}</a>` : ''}
    <div class="dash-grid">
      <div class="card"><div class="card-h"><h3>Pendaftar 30 hari terakhir</h3><span class="muted">${days.reduce((a, x) => a + x.n, 0)} orang</span></div>
        <div class="bars" role="img" aria-label="Grafik pendaftar per hari">${days.map((x) => html`<span style="--h:${(x.n / max) * 100}%" data-tip="${fmtDate(x.d, { day: 'numeric', month: 'short' })}: ${x.n}"></span>`)}</div>
        <div class="bars-x"><span>${fmtDate(days[0].d, { day: 'numeric', month: 'short' })}</span><span>Hari ini</span></div></div>
      <div class="card"><div class="card-h"><h3>Program paling diminati</h3></div>
        ${s.leadsByProgram.length ? html`<ul class="hbars">${s.leadsByProgram.map((p) => html`<li><span>${p.program}</span><i style="--w:${(p.n / progMax) * 100}%"></i><b>${p.n}</b></li>`)}</ul>` : html`<p class="empty">Belum ada data pendaftar.</p>`}</div>
      <div class="card span2"><div class="card-h"><h3>Pendaftar terbaru</h3><a href="#/pendaftar" class="link">Lihat semua ${ico('arrow')}</a></div>
        ${s.recentLeads.length ? html`<ul class="lead-mini">${s.recentLeads.map((l) => html`<li><span class="avatar">${l.name[0]}</span><span><strong>${l.name}</strong><small>${l.program || 'Belum memilih program'} · ${fmtDateTime(l.created_at)}</small></span><span class="pill ${l.status}">${l.status}</span><a class="btn sm ghost" target="_blank" href="${waLink(l.phone, `Halo ${l.name}, terima kasih sudah mendaftar di ${state.site.brand.name}.`)}">${ico('wa')} Chat</a></li>`)}</ul>` : html`<p class="empty">Belum ada pendaftar. Formulir ada di bagian bawah landing page.</p>`}</div>
    </div>`);
}
const waLink = (phone, text) => `https://wa.me/${String(phone).replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(text)}`;

// ---------------------------------------------------------------------------
// Halaman: Konten landing page
let currentSection = 'hero';
function viewContent(v, sub) {
  if (sub && SECTIONS[sub]) currentSection = sub;
  const site = state.site;
  const order = site.sectionOrder;
  const def = SECTIONS[currentSection];
  const sec = site.sections[currentSection];
  render(v, html`
    ${pageHead('Konten halaman', 'Pilih bagian, ubah isinya, dan lihat hasilnya langsung. Urutan dan visibilitas bisa diatur dari daftar di kiri.')}
    <div class="editor">
      <div class="sec-list" id="seclist">
        ${order.map((k, i) => html`<div class="sec-row ${k === currentSection ? 'on' : ''} ${site.sections[k]?.enabled === false ? 'off' : ''}">
          <a href="#/konten/${k}"><span class="sec-no">${String(i + 1).padStart(2, '0')}</span>${SECTIONS[k]?.label || k}</a>
          <span class="row-tools">
            <button class="tbtn" data-secmove="${i}" data-d="-1" title="Naikkan" ${i === 0 ? 'disabled' : ''}>${ico('up')}</button>
            <button class="tbtn" data-secmove="${i}" data-d="1" title="Turunkan" ${i === order.length - 1 ? 'disabled' : ''}>${ico('down')}</button>
            <button class="tbtn" data-sectoggle="${k}" title="${site.sections[k]?.enabled === false ? 'Tampilkan' : 'Sembunyikan'}">${ico(site.sections[k]?.enabled === false ? 'eyeOff' : 'eye')}</button>
          </span></div>`)}
      </div>
      <div class="sec-form card" id="secform">
        <div class="card-h"><div><h3>${def.label}</h3>${def.desc ? html`<p class="muted">${def.desc}</p>` : ''}</div>
          <label class="switch"><input type="checkbox" data-path="sections.${currentSection}.enabled" ${sec.enabled !== false ? 'checked' : ''}><span></span>Tampil</label></div>
        <div class="fgrid">${def.fields.map((f) => field(f, `sections.${currentSection}`, site))}</div>
        <div class="form-foot"><button class="btn ghost sm" id="resetsec">Kembalikan bagian ini ke default</button></div>
      </div>
      ${previewPane()}
    </div>`);
  const form = $('#secform');
  bindForm(form, site, { onChange: () => { setDirty(true); refreshPreview(); }, rerender: () => viewContent(v) });
  form.addEventListener('change', (e) => { if (e.target.dataset.path?.endsWith('.enabled')) viewContent(v); });
  $('#seclist').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.secmove !== undefined) { const i = +b.dataset.secmove; const j = i + +b.dataset.d; [order[i], order[j]] = [order[j], order[i]]; }
    if (b.dataset.sectoggle) { const s = site.sections[b.dataset.sectoggle]; s.enabled = s.enabled === false; }
    setDirty(true); viewContent(v); refreshPreview();
  });
  $('#resetsec').onclick = () => {
    if (!confirm(`Kembalikan "${def.label}" ke isi awal? Perubahan belum tersimpan sampai Anda klik Simpan.`)) return;
    site.sections[currentSection] = clone(state.defaults.sections[currentSection]); setDirty(true); viewContent(v); refreshPreview();
  };
  Object.assign($('#preview').dataset, { anchor: ANCHOR[currentSection] || '', jump: '1' });
  bindPreviewSize(); refreshPreview(true);
}

// Halaman: Tampilan & Identitas memakai form yang sama.
function viewSettings(v, kind) {
  const isTheme = kind === 'tampilan';
  const fields = isTheme ? THEME_FIELDS : BRAND_FIELDS;
  render(v, html`
    ${pageHead(isTheme ? 'Tampilan & tema' : 'Identitas & SEO', isTheme ? 'Warna, huruf, dan gaya visual seluruh situs & portal belajar.' : 'Nama, logo, kontak, media sosial, dan pengaturan Google.')}
    <div class="editor two">
      <div class="card" id="setform">
        ${isTheme ? html`<fieldset class="fgroup"><legend>Palet siap pakai</legend><div class="presets">${PRESETS.map((p, i) => html`<button class="preset" data-preset="${i}"><span style="background:${p.paper}"><i style="background:${p.accent}"></i><i style="background:${p.ink}"></i><i style="background:${p.gold}"></i></span>${p.name}</button>`)}</div></fieldset>` : ''}
        <div class="fgrid">${fields.map((f) => field(f, '', state.site))}</div>
      </div>
      ${previewPane()}
    </div>`);
  const form = $('#setform');
  bindForm(form, state.site, { onChange: () => { setDirty(true); refreshPreview(); }, rerender: () => viewSettings(v, kind) });
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    const { name, ...colors } = PRESETS[+b.dataset.preset];
    Object.assign(state.site.theme, colors); setDirty(true); viewSettings(v, kind); refreshPreview(true);
  });
  bindPreviewSize(); refreshPreview(true);
}

// ---------------------------------------------------------------------------
// Halaman: Pendaftar
const LEAD_STATUS = ['baru', 'dihubungi', 'terdaftar', 'batal'];
let leadFilter = { status: '', q: '' };
async function viewLeads(v) {
  const { leads } = await api('/api/admin/leads');
  const draw = () => {
    const q = leadFilter.q.toLowerCase();
    const rows = leads.filter((l) => (!leadFilter.status || l.status === leadFilter.status) && (!q || `${l.name} ${l.phone} ${l.program} ${l.message}`.toLowerCase().includes(q)));
    render(v, html`
      ${pageHead('Pendaftar', 'Calon peserta dari formulir di landing page. Hubungi lewat WhatsApp, lalu perbarui statusnya.', html`<button class="btn ghost" id="csv">${ico('download')} Ekspor CSV</button>`)}
      <div class="toolbar">
        <div class="seg">${['', ...LEAD_STATUS].map((s) => html`<button data-st="${s}" class="${leadFilter.status === s ? 'on' : ''}">${s || 'Semua'} <em>${s ? leads.filter((l) => l.status === s).length : leads.length}</em></button>`)}</div>
        <label class="search">${ico('search')}<input id="q" placeholder="Cari nama, nomor, program…" value="${leadFilter.q}"></label>
      </div>
      ${rows.length ? html`<div class="table-wrap"><table class="table">
        <thead><tr><th>Nama</th><th>Program</th><th>Pesan & catatan</th><th>Masuk</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.map((l) => html`<tr data-id="${l.id}">
          <td><strong>${l.name}</strong><small class="block">${l.phone}${l.email ? ` · ${l.email}` : ''}</small></td>
          <td>${l.program || html`<span class="muted">—</span>`}</td>
          <td class="wide">${l.message ? html`<p class="msg">${l.message}</p>` : ''}<input class="note" data-note placeholder="Tambah catatan…" value="${l.note || ''}"></td>
          <td class="nowrap">${fmtDateTime(l.created_at)}</td>
          <td><select class="pillsel ${l.status}" data-status>${LEAD_STATUS.map((s) => html`<option ${s === l.status ? 'selected' : ''}>${s}</option>`)}</select></td>
          <td class="nowrap"><a class="btn sm ghost" target="_blank" href="${waLink(l.phone, `Halo ${l.name}, terima kasih sudah mendaftar${l.program ? ` program ${l.program}` : ''} di ${state.site.brand.name}. `)}">${ico('wa')} WhatsApp</a>
            <button class="tbtn danger" data-delete title="Hapus">${ico('trash')}</button></td>
        </tr>`)}</tbody></table></div>` : html`<div class="empty big">${ico('inbox')}<p>Belum ada pendaftar${leadFilter.status || leadFilter.q ? ' yang cocok dengan filter' : ''}.</p></div>`}`);
    $('#q').oninput = (e) => { leadFilter.q = e.target.value; const pos = e.target.selectionStart; draw(); const q2 = $('#q'); q2.focus(); q2.setSelectionRange(pos, pos); };
    $$('[data-st]').forEach((b) => (b.onclick = () => { leadFilter.status = b.dataset.st; draw(); }));
    $('#csv').onclick = () => {
      const cols = ['created_at', 'name', 'phone', 'email', 'program', 'message', 'status', 'note'];
      const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: `pendaftar-lpkrita-${new Date().toISOString().slice(0, 10)}.csv` });
      a.click();
    };
    v.onchange = async (e) => {
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      const lead = leads.find((l) => l.id === +tr.dataset.id);
      if (e.target.matches('[data-status]')) { lead.status = e.target.value; e.target.className = `pillsel ${lead.status}`; }
      if (e.target.matches('[data-note]')) lead.note = e.target.value;
      try { await api(`/api/admin/leads/${lead.id}`, { method: 'PATCH', body: { status: lead.status, note: lead.note } }); toast('Tersimpan'); refreshBadges(); } catch (err) { toast(err.message, 'err'); }
    };
    v.onclick = async (e) => {
      const b = e.target.closest('[data-delete]'); if (!b) return;
      const id = +b.closest('tr').dataset.id;
      if (!confirm('Hapus data pendaftar ini?')) return;
      await api(`/api/admin/leads/${id}`, { method: 'DELETE' });
      leads.splice(leads.findIndex((l) => l.id === id), 1); draw(); refreshBadges();
    };
  };
  draw();
}

// ---------------------------------------------------------------------------
// Halaman: Kelas
async function viewCourses(v, id) {
  if (id) return viewCourseEditor(v, id);
  const { courses } = await api('/api/admin/courses');
  render(v, html`
    ${pageHead('Kelas & materi', 'Kelas online untuk siswa: materi bacaan, video, dan kuis interaktif.', html`<a class="btn ghost" href="/belajar" target="_blank">${ico('ext')} Buka portal belajar</a><button class="btn primary" id="newc">${ico('plus')} Kelas baru</button>`)}
    ${courses.length ? html`<div class="course-grid">${courses.map((c, i) => {
      const n = c.curriculum.reduce((a, s) => a + (s.lessons?.length || 0), 0);
      return html`<article class="course-card">
        <a href="#/kelas/${c.id}" class="cc-img">${c.cover ? html`<img src="${c.cover}" alt="">` : ''}<span class="pill ${c.published ? 'terdaftar' : 'batal'}">${c.published ? 'Terbit' : 'Draf'}</span></a>
        <div class="cc-body"><small>${c.category || 'Umum'} · ${c.access === 'open' ? 'Terbuka' : 'Perlu persetujuan'}</small><h3><a href="#/kelas/${c.id}">${c.title}</a></h3>
          <div class="cc-meta"><span>${ico('book')} ${n} materi</span><span>${ico('users')} ${c.students} siswa</span><span>${ico('award')} ${c.graduates} lulus</span></div></div>
        <div class="cc-foot"><button class="tbtn" data-cmove="${i}" data-d="-1" ${i === 0 ? 'disabled' : ''} title="Geser kiri">${ico('up')}</button><button class="tbtn" data-cmove="${i}" data-d="1" ${i === courses.length - 1 ? 'disabled' : ''} title="Geser kanan">${ico('down')}</button><a class="btn sm" href="#/kelas/${c.id}">Edit</a></div>
      </article>`;
    })}</div>` : html`<div class="empty big">${ico('book')}<p>Belum ada kelas. Buat kelas pertama Anda.</p></div>`}`);
  $('#newc').onclick = async () => {
    const title = prompt('Nama kelas baru:'); if (!title) return;
    const { id: nid } = await api('/api/admin/courses', { method: 'POST', body: { title, curriculum: [{ id: uid(), title: 'Bab 1', lessons: [] }], pass_score: 70 } });
    location.hash = `#/kelas/${nid}`;
  };
  v.onclick = async (e) => {
    const b = e.target.closest('[data-cmove]'); if (!b) return;
    const i = +b.dataset.cmove; const j = i + +b.dataset.d; [courses[i], courses[j]] = [courses[j], courses[i]];
    await api('/api/admin/courses/reorder', { method: 'POST', body: { ids: courses.map((c) => c.id) } }); viewCourses(v);
  };
}
const uid = () => Math.random().toString(36).slice(2, 8);
const LESSON_TYPES = { text: ['Bacaan', 'text'], video: ['Video', 'play'], quiz: ['Kuis', 'quiz'] };

async function viewCourseEditor(v, id) {
  const { course } = await api(`/api/admin/courses/${id}`);
  let dirty = false; const open = new Set();
  const mark = () => { dirty = true; $('#csave').classList.add('pulse'); };
  const draw = () => {
    const c = course;
    render(v, html`
      <a class="back" href="#/kelas">${ico('back')} Semua kelas</a>
      ${pageHead(c.title || 'Kelas tanpa judul', `${c.curriculum.reduce((a, s) => a + s.lessons.length, 0)} materi dalam ${c.curriculum.length} bab`, html`<a class="btn ghost" href="/belajar#/kelas/${c.slug}" target="_blank">${ico('eye')} Coba sebagai siswa</a><button class="btn primary" id="csave">${ico('check')} Simpan kelas</button>`)}
      <div class="course-editor">
        <div class="card" id="cinfo">
          <div class="card-h"><h3>Info kelas</h3></div>
          <div class="fgrid">
            ${field({ k: 'title', label: 'Judul kelas' }, '', c)}
            ${field({ k: 'slug', label: 'Alamat (slug)', half: true, hint: `/belajar#/kelas/${c.slug}` }, '', c)}
            ${field({ k: 'category', label: 'Kategori', half: true }, '', c)}
            ${field({ k: 'summary', label: 'Ringkasan', t: 'textarea', rows: 3 }, '', c)}
            ${field({ k: 'cover', label: 'Foto sampul', t: 'image' }, '', c)}
            ${field({ k: 'level', label: 'Tingkat', t: 'select', options: ['Pemula', 'Menengah', 'Lanjutan'], half: true }, '', c)}
            ${field({ k: 'pass_score', label: 'Nilai lulus kuis (%)', t: 'number', half: true }, '', c)}
            ${field({ k: 'access', label: 'Akses', t: 'select', options: [['open', 'Terbuka untuk semua siswa'], ['approval', 'Perlu persetujuan admin']], half: true }, '', c)}
            ${field({ k: 'published', label: 'Terbitkan di portal belajar', t: 'toggle', half: true }, '', c)}
          </div>
          <div class="form-foot"><button class="btn ghost sm danger" id="cdel">${ico('trash')} Hapus kelas</button></div>
        </div>
        <div class="curr" id="curr">
          ${c.curriculum.map((s, si) => html`<section class="chapter card">
            <div class="chapter-h"><span class="sec-no">Bab ${si + 1}</span><input class="chapter-title" data-path="curriculum.${si}.title" value="${s.title}" aria-label="Judul bab">
              <span class="row-tools">${tools('curriculum', si, c.curriculum.length)}</span></div>
            <ol class="lessons">${s.lessons.map((l, li) => {
              const key = `${s.id}:${l.id}`; const p = `curriculum.${si}.lessons.${li}`;
              return html`<li class="lesson ${open.has(key) ? 'open' : ''}">
                <div class="lesson-h" data-toggle="${key}"><span class="ltype ${l.type}">${ico(LESSON_TYPES[l.type][1])}</span><strong>${l.title || 'Materi tanpa judul'}</strong><small>${LESSON_TYPES[l.type][0]}${l.type === 'quiz' ? ` · ${(l.questions || []).length} soal` : ''} · ${l.minutes || 0} mnt</small>
                  <span class="row-tools">${tools(`curriculum.${si}.lessons`, li, s.lessons.length)}</span></div>
                ${open.has(key) ? html`<div class="lesson-body fgrid">
                  ${field({ k: 'title', label: 'Judul materi' }, p, c)}
                  ${field({ k: 'type', label: 'Jenis', t: 'select', options: [['text', 'Bacaan'], ['video', 'Video'], ['quiz', 'Kuis']], half: true }, p, c)}
                  ${field({ k: 'minutes', label: 'Perkiraan menit', t: 'number', half: true }, p, c)}
                  ${l.type === 'video' ? field({ k: 'video', label: 'Tautan video YouTube', t: 'url', hint: 'Contoh: https://www.youtube.com/watch?v=xxxx' }, p, c) : ''}
                  ${l.type !== 'quiz' ? field({ k: 'body', label: l.type === 'video' ? 'Catatan di bawah video' : 'Isi materi', t: 'textarea', rows: 10, hint: 'Format: ## Judul, **tebal**, *miring*, - daftar, 1. daftar bernomor, > kutipan' }, p, c) : ''}
                  ${l.type === 'quiz' ? html`<div class="field"><label>Soal</label><div class="questions">${(l.questions || []).map((q, qi) => html`<div class="question">
                      <div class="q-h"><span class="sec-no">Soal ${qi + 1}</span><span class="row-tools">${tools(`${p}.questions`, qi, l.questions.length)}</span></div>
                      <textarea rows="2" data-path="${p}.questions.${qi}.q" placeholder="Tulis pertanyaan…">${q.q}</textarea>
                      <div class="opts">${q.options.map((o, oi) => html`<label class="opt ${q.answer === oi ? 'correct' : ''}"><input type="radio" name="ans_${l.id}_${qi}" data-answer="${p}.questions.${qi}" value="${oi}" ${q.answer === oi ? 'checked' : ''} title="Tandai sebagai jawaban benar"><input data-path="${p}.questions.${qi}.options.${oi}" value="${o}" placeholder="Pilihan ${String.fromCharCode(65 + oi)}">${q.options.length > 2 ? html`<button type="button" class="tbtn" data-optdel="${p}.questions.${qi}" data-i="${oi}" title="Hapus pilihan">${ico('x')}</button>` : ''}</label>`)}
                        ${q.options.length < 6 ? html`<button type="button" class="btn sm ghost" data-optadd="${p}.questions.${qi}">${ico('plus')} Pilihan</button>` : ''}</div>
                      <input data-path="${p}.questions.${qi}.explain" value="${q.explain || ''}" placeholder="Penjelasan setelah menjawab (opsional)">
                    </div>`)}
                    <button type="button" class="btn sm ghost add" data-add="${p}.questions" data-blank='{"q":"","options":["",""],"answer":0,"explain":""}'>${ico('plus')} Tambah soal</button></div></div>` : ''}
                </div>` : ''}
              </li>`;
            })}</ol>
            <div class="add-lesson">${Object.entries(LESSON_TYPES).map(([t, [label, ic]]) => html`<button class="btn sm ghost" data-newlesson="${si}" data-type="${t}">${ico(ic)} + ${label}</button>`)}</div>
          </section>`)}
          <button class="btn ghost add-chapter" id="addch">${ico('plus')} Tambah bab</button>
        </div>
      </div>`);

    const onChange = () => { mark(); if (document.activeElement?.dataset.path?.endsWith('.type')) draw(); };
    bindForm(v.querySelector('.course-editor'), c, { onChange, rerender: draw });
    $('#csave').onclick = save;
    $('#cdel').onclick = async () => { if (!confirm(`Hapus kelas "${c.title}" beserta seluruh progres siswanya?`)) return; await api(`/api/admin/courses/${id}`, { method: 'DELETE' }); dirty = false; location.hash = '#/kelas'; };
    $('#addch').onclick = () => { c.curriculum.push({ id: uid(), title: `Bab ${c.curriculum.length + 1}`, lessons: [] }); mark(); draw(); };
  };
  v.onclick = (e) => {
    const t = e.target.closest('[data-toggle]');
    if (t && !e.target.closest('.row-tools')) { const k = t.dataset.toggle; open.has(k) ? open.delete(k) : open.add(k); draw(); return; }
    const nl = e.target.closest('[data-newlesson]');
    if (nl) {
      const s = course.curriculum[+nl.dataset.newlesson]; const type = nl.dataset.type;
      const l = { id: uid(), type, title: '', minutes: 5, body: '', ...(type === 'video' ? { video: '' } : {}), ...(type === 'quiz' ? { questions: [{ q: '', options: ['', '', '', ''], answer: 0, explain: '' }] } : {}) };
      s.lessons.push(l); open.add(`${s.id}:${l.id}`); mark(); draw(); return;
    }
    const oa = e.target.closest('[data-optadd]');
    if (oa) { getPath(course, oa.dataset.optadd).options.push(''); mark(); draw(); return; }
    const od = e.target.closest('[data-optdel]');
    if (od) { const q = getPath(course, od.dataset.optdel); q.options.splice(+od.dataset.i, 1); if (q.answer >= q.options.length) q.answer = 0; mark(); draw(); }
  };
  v.onchange = (e) => {
    if (e.target.dataset.answer) { getPath(course, e.target.dataset.answer).answer = +e.target.value; mark(); draw(); }
    if (e.target.dataset.path?.endsWith('.type')) { const l = getPath(course, e.target.dataset.path.replace(/\.type$/, '')); if (l.type === 'quiz' && !l.questions) l.questions = [{ q: '', options: ['', '', '', ''], answer: 0, explain: '' }]; draw(); }
  };
  async function save() {
    try { await api(`/api/admin/courses/${id}`, { method: 'PUT', body: course }); dirty = false; $('#csave').classList.remove('pulse'); toast('Kelas tersimpan'); }
    catch (e) { toast(e.message, 'err'); }
  }
  leaveGuard = () => !dirty || confirm('Perubahan kelas belum disimpan. Tinggalkan halaman?');
  draw();
}

// ---------------------------------------------------------------------------
// Halaman: Peserta kelas
let enrFilter = '';
async function viewEnrollments(v) {
  const [{ enrollments }, { courses }, { users }] = await Promise.all([api('/api/admin/enrollments'), api('/api/admin/courses'), api('/api/admin/users')]);
  const draw = () => {
    const rows = enrollments.filter((e) => !enrFilter || (enrFilter === 'completed' ? e.completed_at : e.status === enrFilter));
    render(v, html`
      ${pageHead('Peserta kelas', 'Setujui permintaan bergabung, pantau progres, dan lihat sertifikat siswa.', html`<button class="btn primary" id="adde">${ico('plus')} Daftarkan siswa</button>`)}
      <div class="toolbar"><div class="seg">${[['', 'Semua'], ['pending', 'Menunggu'], ['active', 'Aktif'], ['completed', 'Lulus'], ['blocked', 'Diblokir']].map(([k, l]) => html`<button data-f="${k}" class="${enrFilter === k ? 'on' : ''}">${l} <em>${k ? enrollments.filter((e) => (k === 'completed' ? e.completed_at : e.status === k)).length : enrollments.length}</em></button>`)}</div></div>
      ${rows.length ? html`<div class="table-wrap"><table class="table">
        <thead><tr><th>Siswa</th><th>Kelas</th><th>Progres</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.map((e) => html`<tr data-id="${e.id}">
          <td><strong>${e.name}</strong><small class="block">${e.email}</small></td>
          <td>${e.course_title}<small class="block">sejak ${fmtDate(e.created_at)}</small></td>
          <td><div class="prog"><i style="--p:${e.percent}%"></i></div><small>${e.done}/${e.total} materi · ${e.percent}%</small></td>
          <td>${e.status === 'pending' ? html`<button class="btn sm primary" data-approve>${ico('check')} Setujui</button>` : html`<select class="pillsel ${e.status}" data-status>${['active', 'completed', 'blocked', 'pending'].map((s) => html`<option value="${s}" ${s === e.status ? 'selected' : ''}>${{ active: 'aktif', completed: 'lulus', blocked: 'diblokir', pending: 'menunggu' }[s]}</option>`)}</select>`}</td>
          <td class="nowrap">${e.cert_code ? html`<a class="btn sm ghost" href="/sertifikat/${e.cert_code}" target="_blank">${ico('award')} Sertifikat</a>` : ''}<button class="tbtn danger" data-delete title="Keluarkan dari kelas">${ico('trash')}</button></td>
        </tr>`)}</tbody></table></div>` : html`<div class="empty big">${ico('grad')}<p>Belum ada peserta di kategori ini.</p></div>`}`);
    $$('[data-f]').forEach((b) => (b.onclick = () => { enrFilter = b.dataset.f; draw(); }));
    $('#adde').onclick = () => {
      const students = users.filter((u) => u.role === 'student');
      const d = modal('Daftarkan siswa ke kelas', html`<form class="fgrid" id="ef">
        <div class="field"><label>Siswa</label><select name="user_id" required>${students.map((u) => html`<option value="${u.id}">${u.name} — ${u.email}</option>`)}</select><small class="hint">Belum ada akunnya? Buat dulu di menu Pengguna.</small></div>
        <div class="field"><label>Kelas</label><select name="course_id">${courses.map((c) => html`<option value="${c.id}">${c.title}</option>`)}</select></div>
        <div class="form-foot"><button class="btn primary">Daftarkan</button></div></form>`);
      $('#ef', d).onsubmit = async (ev) => {
        ev.preventDefault(); const fd = Object.fromEntries(new FormData(ev.target));
        try { await api('/api/admin/enrollments', { method: 'POST', body: fd }); d.close(); toast('Siswa didaftarkan'); viewEnrollments(v); } catch (err) { toast(err.message, 'err'); }
      };
    };
  };
  v.onclick = async (ev) => {
    const tr = ev.target.closest('tr[data-id]'); if (!tr) return; const id = +tr.dataset.id; const e = enrollments.find((x) => x.id === id);
    if (ev.target.closest('[data-approve]')) { await api(`/api/admin/enrollments/${id}`, { method: 'PATCH', body: { status: 'active' } }); e.status = 'active'; toast(`${e.name} disetujui`); draw(); refreshBadges(); }
    if (ev.target.closest('[data-delete]') && confirm(`Keluarkan ${e.name} dari kelas ${e.course_title}? Progres akan hilang.`)) { await api(`/api/admin/enrollments/${id}`, { method: 'DELETE' }); enrollments.splice(enrollments.indexOf(e), 1); draw(); }
  };
  v.onchange = async (ev) => {
    if (!ev.target.matches('[data-status]')) return;
    const id = +ev.target.closest('tr').dataset.id; const e = enrollments.find((x) => x.id === id);
    e.status = ev.target.value; await api(`/api/admin/enrollments/${id}`, { method: 'PATCH', body: { status: e.status } }); toast('Status diperbarui'); draw(); refreshBadges();
  };
  draw();
}

// ---------------------------------------------------------------------------
// Halaman: Pengguna
async function viewUsers(v) {
  const { users } = await api('/api/admin/users');
  const isSuper = state.user.role === 'superadmin';
  const roleName = { superadmin: 'Superadmin', admin: 'Admin', student: 'Siswa' };
  let q = '';
  const draw = () => {
    const rows = users.filter((u) => !q || `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(q));
    render(v, html`
      ${pageHead('Pengguna', 'Akun siswa, admin, dan superadmin.', html`<button class="btn primary" id="addu">${ico('plus')} Tambah pengguna</button>`)}
      <div class="toolbar"><label class="search">${ico('search')}<input id="uq" placeholder="Cari nama atau email…" value="${q}"></label></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Nama</th><th>Peran</th><th>Kelas</th><th>XP · Streak</th><th>Terakhir aktif</th><th></th></tr></thead>
        <tbody>${rows.map((u) => html`<tr data-id="${u.id}" class="${u.active ? '' : 'inactive'}">
          <td><div class="who"><span class="avatar">${u.name[0]}</span><span><strong>${u.name}</strong><small class="block">${u.email}${u.phone ? ` · ${u.phone}` : ''}</small></span></div></td>
          <td><span class="pill role-${u.role}">${roleName[u.role]}</span>${u.active ? '' : html` <span class="pill batal">nonaktif</span>`}</td>
          <td>${u.courses}</td><td>${u.xp} · ${u.streak}🔥</td>
          <td class="nowrap">${u.last_active ? fmtDate(u.last_active) : html`<span class="muted">—</span>`}</td>
          <td class="nowrap">${u.id !== state.user.id && (isSuper || u.role === 'student') ? html`<button class="btn sm ghost" data-edit>Kelola</button>` : ''}</td>
        </tr>`)}</tbody></table></div>`);
    $('#uq').oninput = (e) => { q = e.target.value.toLowerCase(); const pos = e.target.selectionStart; draw(); $('#uq').focus(); $('#uq').setSelectionRange(pos, pos); };
    $('#addu').onclick = () => userForm();
  };
  const userForm = (u) => {
    const d = modal(u ? `Kelola ${u.name}` : 'Tambah pengguna', html`<form class="fgrid" id="uf">
      <div class="field half"><label>Nama</label><input name="name" required value="${u?.name || ''}"></div>
      <div class="field half"><label>No. HP</label><input name="phone" value="${u?.phone || ''}"></div>
      ${u ? '' : html`<div class="field"><label>Email</label><input name="email" type="email" required></div>`}
      <div class="field half"><label>Peran</label><select name="role" ${isSuper ? '' : 'disabled'}>${['student', 'admin', 'superadmin'].map((r) => html`<option value="${r}" ${u?.role === r ? 'selected' : ''}>${roleName[r]}</option>`)}</select></div>
      <div class="field half"><label>${u ? 'Reset kata sandi (opsional)' : 'Kata sandi'}</label><input name="password" type="text" minlength="8" ${u ? '' : 'required'} placeholder="min. 8 karakter" autocomplete="new-password"></div>
      ${u ? html`<div class="field"><label class="switch"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}><span></span>Akun aktif</label></div>` : ''}
      <div class="form-foot">${u ? html`<button type="button" class="btn ghost danger" id="udel">${ico('trash')} Hapus akun</button>` : ''}<button class="btn primary">Simpan</button></div></form>`);
    $('#uf', d).onsubmit = async (e) => {
      e.preventDefault(); const fd = Object.fromEntries(new FormData(e.target));
      if (u) fd.active = !!e.target.active.checked; if (!fd.password) delete fd.password; if (!isSuper) delete fd.role;
      try { await api(u ? `/api/admin/users/${u.id}` : '/api/admin/users', { method: u ? 'PATCH' : 'POST', body: fd }); d.close(); toast('Pengguna tersimpan'); viewUsers(v); } catch (err) { toast(err.message, 'err'); }
    };
    if (u) $('#udel', d).onclick = async () => { if (!confirm(`Hapus akun ${u.name} beserta progres belajarnya?`)) return; try { await api(`/api/admin/users/${u.id}`, { method: 'DELETE' }); d.close(); viewUsers(v); } catch (err) { toast(err.message, 'err'); } };
  };
  v.onclick = (e) => { if (e.target.closest('[data-edit]')) userForm(users.find((u) => u.id === +e.target.closest('tr').dataset.id)); };
  draw();
}

// ---------------------------------------------------------------------------
// Halaman: Media
async function viewMedia(v) {
  const { media } = await api('/api/admin/media');
  render(v, html`
    ${pageHead('Media', 'Foto & dokumen yang diunggah. Klik untuk menyalin tautannya.')}
    <div class="dropzone" tabindex="0">${ico('upload')}<p><strong>Tarik & lepas file di sini</strong> atau klik untuk memilih</p><small>Gambar dikompres otomatis · PDF maks 8 MB</small><input type="file" accept="image/*,application/pdf" multiple hidden></div>
    ${media.length ? html`<div class="media-grid">${media.map((m) => html`<figure class="media-card" data-id="${m.id}">
      ${m.url.endsWith('.pdf') ? html`<div class="pdf">PDF</div>` : html`<img src="${m.url}" alt="" loading="lazy">`}
      <figcaption><span title="${m.name}">${m.name || m.url}</span><small>${Math.round(m.size / 1024)} KB</small></figcaption>
      <div class="mc-tools"><button class="tbtn" data-copy="${m.url}" title="Salin tautan">${ico('copy')}</button><button class="tbtn danger" data-del title="Hapus">${ico('trash')}</button></div>
    </figure>`)}</div>` : html`<div class="empty big">${ico('image')}<p>Belum ada file. Foto bawaan situs tetap tersedia saat memilih gambar.</p></div>`}`);
  const dz = $('.dropzone', v); const inp = $('input', dz);
  const up = async (files) => { dz.classList.add('busy'); await uploadFiles(files); viewMedia(v); };
  dz.onclick = () => inp.click(); inp.onchange = () => up([...inp.files]);
  dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over');
  dz.ondrop = (e) => { e.preventDefault(); up([...e.dataTransfer.files]); };
  v.onclick = async (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) { await navigator.clipboard.writeText(location.origin + c.dataset.copy); toast('Tautan disalin'); }
    const d = e.target.closest('[data-del]');
    if (d && confirm('Hapus file ini? Pastikan tidak sedang dipakai di halaman.')) { await api(`/api/admin/media/${d.closest('[data-id]').dataset.id}`, { method: 'DELETE' }); viewMedia(v); }
  };
}

// ---------------------------------------------------------------------------
// Halaman: Backup & Akun
function viewBackup(v) {
  render(v, html`
    ${pageHead('Backup & pemulihan', 'Simpan cadangan konten situs dan kelas, atau pulihkan dari file cadangan.')}
    <div class="dash-grid">
      <div class="card"><h3>Unduh cadangan</h3><p class="muted">Berisi seluruh konten landing page dan kelas (tanpa data siswa & pendaftar).</p><button class="btn primary" id="bdl">${ico('download')} Unduh file .json</button></div>
      <div class="card"><h3>Pulihkan dari file</h3><p class="muted">Konten saat ini akan ditimpa oleh isi file cadangan.</p><label class="btn ghost">${ico('upload')} Pilih file cadangan<input type="file" accept="application/json" id="bup" hidden></label></div>
      <div class="card span2 danger-zone"><h3>Kembalikan konten awal</h3><p class="muted">Mengembalikan seluruh isi landing page ke konten bawaan. Kelas, siswa, dan pendaftar tidak terpengaruh.</p><button class="btn ghost danger" id="breset">Reset konten situs</button></div>
    </div>`);
  $('#bdl').onclick = async () => {
    const data = await api('/api/admin/backup');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })), download: `backup-lpkrita-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
  };
  $('#bup').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try { const data = JSON.parse(await f.text()); if (!confirm('Pulihkan konten dari file ini?')) return; await api('/api/admin/backup', { method: 'POST', body: data }); await loadSite(); toast('Konten dipulihkan'); }
    catch (err) { toast(err.message || 'File tidak valid', 'err'); }
  };
  $('#breset').onclick = async () => { if (!confirm('Yakin mengembalikan seluruh konten situs ke awal?')) return; await api('/api/admin/site/reset', { method: 'POST', body: {} }); await loadSite(); toast('Konten dikembalikan ke awal'); };
}

function viewAccount(v) {
  render(v, html`
    ${pageHead('Akun saya', state.user.email)}
    <div class="dash-grid"><form class="card fgrid" id="pw">
      <h3>Ganti kata sandi</h3>
      <div class="field"><label>Kata sandi saat ini</label><input type="password" name="current" required autocomplete="current-password"></div>
      <div class="field"><label>Kata sandi baru</label><input type="password" name="next" required minlength="8" autocomplete="new-password"></div>
      <div class="form-foot"><button class="btn primary">Simpan kata sandi</button></div>
    </form></div>`);
  $('#pw').onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/auth/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); toast('Kata sandi diperbarui'); } catch (err) { toast(err.message, 'err'); }
  };
}

// ---------------------------------------------------------------------------
// Login
function viewLogin() {
  document.body.classList.add('login-page');
  render(app, html`<main class="login">
    <div class="login-art"><img src="/assets/img/uji-bnsp-2024.jpg" alt=""><div><p class="kicker">Dashboard</p><h2>Kelola situs, pendaftar, dan kelas online — dari satu tempat.</h2></div></div>
    <form class="login-form" id="lf">
      <img src="/assets/img/logo.png" alt="" width="56">
      <h1>Masuk dashboard</h1><p class="muted">Khusus admin LPK Rita Bontang.</p>
      <div class="field"><label for="le">Email</label><input id="le" name="email" type="email" required autocomplete="username"></div>
      <div class="field"><label for="lp">Kata sandi</label><input id="lp" name="password" type="password" required autocomplete="current-password"></div>
      <p class="err" id="lerr" role="alert"></p>
      <button class="btn primary block">Masuk</button>
      <a class="muted small" href="/">← Kembali ke situs</a>
    </form></main>`);
  $('#lf').onsubmit = async (e) => {
    e.preventDefault(); $('#lerr').textContent = '';
    try {
      const { user } = await api('/api/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      if (user.role !== 'admin' && user.role !== 'superadmin') { await api('/api/auth/logout', { method: 'POST', body: {} }); throw new Error('Akun ini bukan admin. Siswa silakan masuk lewat /belajar.'); }
      document.body.classList.remove('login-page'); boot();
    } catch (err) { $('#lerr').textContent = err.message; }
  };
}

// ---------------------------------------------------------------------------
// Router
let leaveGuard = null;
let lastHash = location.hash;
async function route_() {
  const [r, sub] = location.hash.slice(2).split('/');
  const route = shell();
  const v = $('#view'); v.onclick = v.onchange = null;
  leaveGuard = null;
  try {
    switch (route) {
      case 'konten': return viewContent(v, sub);
      case 'tampilan': case 'identitas': return viewSettings(v, route);
      case 'pendaftar': return await viewLeads(v);
      case 'kelas': return await viewCourses(v, sub);
      case 'peserta': return await viewEnrollments(v);
      case 'pengguna': return await viewUsers(v);
      case 'media': return await viewMedia(v);
      case 'backup': return viewBackup(v);
      case 'akun': return viewAccount(v);
      default: return await viewDashboard(v);
    }
  } catch (e) {
    if (e.status === 401) return viewLogin();
    render(v, html`<div class="empty big">${ico('x')}<p>${e.message}</p></div>`);
  }
}
addEventListener('hashchange', () => {
  if (leaveGuard && !leaveGuard()) { history.replaceState(null, '', lastHash); return; }
  lastHash = location.hash; route_();
  $('#side')?.classList.remove('open'); window.scrollTo(0, 0);
});
async function refreshBadges() {
  try { state.stats = await api('/api/admin/stats'); const s = state.stats; $$('.side nav a').forEach((a) => { const it = NAV.flatMap((g) => g.items).find((x) => a.getAttribute('href') === `#/${x.r}`); if (it?.badge) { a.querySelector('.badge')?.remove(); if (s[it.badge]) a.insertAdjacentHTML('beforeend', `<em class="badge">${s[it.badge]}</em>`); } }); } catch { /* */ }
}
async function loadSite() {
  const { site, defaults } = await api('/api/admin/site');
  state.site = site; state.saved = clone(site); state.defaults = defaults; setDirty(false);
}
async function boot() {
  try {
    const { user } = await api('/api/auth/me');
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return viewLogin();
    state.user = user;
    await loadSite();
    state.stats = await api('/api/admin/stats');
    app.className = 'shell';
    if (!location.hash) history.replaceState(null, '', '#/ringkasan');
    lastHash = location.hash;
    route_();
  } catch (e) { viewLogin(); }
}
boot();
