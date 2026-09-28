// Server-side render landing page dari konten di database (bagus untuk SEO & cepat tampil).

export const esc = (v = '') => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// *kata* -> <em>kata</em> untuk aksen tipografi pada judul.
const rich = (v) => esc(v).replace(/\*(.+?)\*/g, '<em>$1</em>');
const paras = (v) => esc(v).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
const safeUrl = (u = '') => (/^(https?:|mailto:|tel:|\/|#)/i.test(String(u)) ? esc(u) : '#');
const pad = (n) => String(n).padStart(2, '0');
const initials = (name) => name.replace(/,.*$/, '').split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(hj|h)\.?$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

const icon = {
  arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11 11 0 0 0 3.2 17.3L2 22l4.8-1.2A11 11 0 0 0 20.5 3.5Zm-8.5 17a9 9 0 0 1-4.6-1.3l-.3-.2-2.9.7.8-2.8-.2-.3A9 9 0 1 1 12 20.5Zm5-6.7c-.3-.1-1.6-.8-1.9-.9-.3-.1-.4-.1-.6.1l-.9 1c-.1.2-.3.2-.6.1a7.4 7.4 0 0 1-3.6-3.2c-.3-.5.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-2c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.3.8 3.2.7.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3Z" fill="currentColor" stroke="none"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5" fill="currentColor"/></svg>',
  fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8Z"/></svg>',
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3V9Z" fill="currentColor"/></svg>',
  crown: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18M4 16 3 7l5 4 4-7 4 7 5-4-1 9H4Z"/></svg>',
  chevL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
  chevR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
};

const head = (k, title, sub = '', cls = '') => `
  <header class="sec-head ${cls}" data-reveal>
    ${k ? `<p class="kicker">${esc(k)}</p>` : ''}
    <h2 class="sec-title">${rich(title)}</h2>
    ${sub ? `<p class="sec-sub">${esc(sub)}</p>` : ''}
  </header>`;

const R = {
  hero: (s, site) => `
  <section class="hero" id="beranda">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow" data-reveal><span class="dot"></span>${esc(s.eyebrow)}</p>
        <h1 class="hero-title" data-reveal>${rich(s.title)}</h1>
        <p class="hero-sub" data-reveal>${esc(s.subtitle)}</p>
        <div class="hero-cta" data-reveal>
          <a class="btn btn-primary" href="${safeUrl(s.primaryHref)}">${esc(s.primaryCta)} ${icon.arrow}</a>
          <a class="btn btn-ghost" href="${safeUrl(s.secondaryHref)}">${esc(s.secondaryCta)}</a>
        </div>
        ${s.stats?.length ? `<dl class="hero-stats" data-reveal>${s.stats.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${esc(x.value)}</dd></div>`).join('')}</dl>` : ''}
      </div>
      <div class="hero-media" data-reveal>
        <figure class="hm-main"><img src="${esc(s.image)}" alt="${esc(s.imageAlt)}" fetchpriority="high"></figure>
        ${s.image2 ? `<figure class="hm-second"><img src="${esc(s.image2)}" alt="${esc(s.image2Alt)}" loading="lazy"></figure>` : ''}
        ${s.badgeTitle ? `<div class="hm-badge"><span class="hm-badge-icon">${icon.crown}</span><div><strong>${esc(s.badgeTitle)}</strong><span>${esc(s.badgeText)}</span></div></div>` : ''}
      </div>
    </div>
  </section>`,

  marquee: (s) => {
    const row = s.items.map((t) => `<span>${esc(t)}</span><i aria-hidden="true">✦</i>`).join('');
    return `<section class="marquee" aria-label="Daftar kejuruan"><div class="marquee-track">${row}${row}</div></section>`;
  },

  about: (s) => `
  <section class="about section" id="tentang">
    <div class="wrap about-grid">
      <figure class="about-media" data-reveal>
        <img src="${esc(s.image)}" alt="${esc(s.imageAlt)}" loading="lazy">
        <figcaption>Est. 20 November 2010 · Bontang</figcaption>
      </figure>
      <div class="about-copy">
        ${head(s.kicker, s.title, '', 'left')}
        <div class="prose" data-reveal>${paras(s.body)}</div>
        ${s.quote ? `<blockquote class="pull" data-reveal><p>“${esc(s.quote)}”</p><cite>${esc(s.quoteAuthor)}</cite></blockquote>` : ''}
      </div>
    </div>
    <div class="wrap vm" data-reveal>
      <div class="vm-vision"><p class="kicker">Visi</p><p class="vm-text">${esc(s.vision)}</p></div>
      <div class="vm-mission"><p class="kicker">Misi</p><ol>${s.missions.map((m) => `<li>${esc(m)}</li>`).join('')}</ol></div>
    </div>
    ${s.facts?.length ? `<div class="wrap facts" data-reveal>${s.facts.map((f) => `<div><span>${esc(f.label)}</span><strong>${esc(f.value)}</strong></div>`).join('')}</div>` : ''}
  </section>`,

  programs: (s) => {
    const cats = [...new Set(s.items.map((p) => p.category).filter(Boolean))];
    return `
  <section class="programs section" id="program">
    <div class="wrap">
      <div class="programs-top">
        ${head(s.kicker, s.title, s.subtitle, 'left')}
        ${cats.length > 1 ? `<div class="chips" role="tablist" aria-label="Filter kategori" data-reveal>
          <button class="chip is-on" data-filter="*" role="tab" aria-selected="true">Semua</button>
          ${cats.map((c) => `<button class="chip" data-filter="${esc(c)}" role="tab" aria-selected="false">${esc(c)}</button>`).join('')}
        </div>` : ''}
      </div>
      <div class="prog-grid">
        ${s.items.map((p, i) => `
        <article class="prog ${p.featured ? 'is-featured' : ''}" data-cat="${esc(p.category)}" data-reveal>
          <div class="prog-img"><img src="${esc(p.image)}" alt="" loading="lazy"></div>
          <div class="prog-body">
            <div class="prog-meta"><span class="prog-no">${pad(i + 1)}</span><span>${esc(p.category)}</span></div>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.desc)}</p>
            <div class="prog-foot">
              <span class="tag">${esc(p.duration)}</span><span class="tag">${esc(p.level)}</span>
              <a class="prog-link" href="#daftar" data-program="${esc(p.title)}" aria-label="Daftar ${esc(p.title)}">Daftar ${icon.arrow}</a>
            </div>
          </div>
        </article>`).join('')}
      </div>
    </div>
  </section>`;
  },

  why: (s) => `
  <section class="why section dark" id="keunggulan">
    <div class="wrap">
      ${head(s.kicker, s.title)}
      <ol class="why-grid">
        ${s.items.map((w, i) => `<li data-reveal><span class="why-no">${pad(i + 1)}</span><h3>${esc(w.title)}</h3><p>${esc(w.desc)}</p></li>`).join('')}
      </ol>
    </div>
  </section>`,

  steps: (s) => `
  <section class="steps section" id="alur">
    <div class="wrap">
      ${head(s.kicker, s.title)}
      <ol class="steps-list">
        ${s.items.map((st, i) => `<li data-reveal><span class="step-no">${i + 1}</span><h3>${esc(st.title)}</h3><p>${esc(st.desc)}</p></li>`).join('')}
      </ol>
    </div>
  </section>`,

  gallery: (s) => `
  <section class="gallery section" id="galeri">
    <div class="wrap">
      ${head(s.kicker, s.title)}
      <div class="gal-grid">
        ${s.items.map((g, i) => `<button class="gal-item" data-index="${i}" data-reveal aria-label="Buka foto: ${esc(g.caption)}">
          <img src="${esc(g.image)}" alt="${esc(g.caption)}" loading="lazy"><span>${esc(g.caption)}</span></button>`).join('')}
      </div>
    </div>
    <dialog class="lightbox" aria-label="Galeri foto">
      <button class="lb-close" aria-label="Tutup">${icon.plus}</button>
      <button class="lb-prev" aria-label="Sebelumnya">${icon.chevL}</button>
      <figure><img alt=""><figcaption></figcaption></figure>
      <button class="lb-next" aria-label="Berikutnya">${icon.chevR}</button>
    </dialog>
    <script type="application/json" id="gallery-data">${JSON.stringify(s.items).replace(/</g, '\\u003c')}</script>
  </section>`,

  team: (s) => `
  <section class="team section" id="tim">
    <div class="wrap team-grid">
      ${head(s.kicker, s.title, '', 'left')}
      <ul class="team-list">
        ${s.items.map((t) => `<li data-reveal>${t.photo ? `<img class="mono" src="${esc(t.photo)}" alt="">` : `<span class="mono" aria-hidden="true">${esc(initials(t.name))}</span>`}<div><strong>${esc(t.name)}</strong><span>${esc(t.role)}</span></div></li>`).join('')}
      </ul>
    </div>
  </section>`,

  testimonials: (s) => `
  <section class="testi section" id="testimoni">
    <div class="wrap">
      <div class="testi-top">
        ${head(s.kicker, s.title, '', 'left')}
        <div class="testi-nav" data-reveal><button class="icon-btn" data-dir="-1" aria-label="Sebelumnya">${icon.chevL}</button><button class="icon-btn" data-dir="1" aria-label="Berikutnya">${icon.chevR}</button></div>
      </div>
      <div class="testi-track" tabindex="0">
        ${s.items.map((t) => `<figure class="testi-card" data-reveal><blockquote>“${esc(t.quote)}”</blockquote><figcaption><strong>${esc(t.name)}</strong><span>${esc(t.meta)}</span></figcaption></figure>`).join('')}
      </div>
    </div>
  </section>`,

  partners: (s) => `
  <section class="partners" aria-label="${esc(s.title)}">
    <div class="wrap partners-row">
      <p class="kicker">${esc(s.title)}</p>
      <ul>${s.items.map((p) => `<li><img src="${esc(p.logo)}" alt="${esc(p.name)}" title="${esc(p.name)}" loading="lazy"></li>`).join('')}</ul>
    </div>
  </section>`,

  faq: (s) => `
  <section class="faq section" id="faq">
    <div class="wrap faq-grid">
      ${head(s.kicker, s.title, '', 'left')}
      <div class="faq-list">
        ${s.items.map((f, i) => `<details data-reveal ${i === 0 ? 'open' : ''}><summary>${esc(f.q)}<span class="faq-ico">${icon.plus}</span></summary><div class="faq-a">${paras(f.a)}</div></details>`).join('')}
      </div>
    </div>
  </section>`,

  cta: (s, site) => {
    const programs = site.sections.programs?.items || [];
    return `
  <section class="cta section" id="daftar">
    <div class="wrap cta-card" data-reveal>
      <div class="cta-media"><img src="${esc(s.image)}" alt="" loading="lazy"></div>
      <div class="cta-body">
        <h2 class="sec-title">${rich(s.title)}</h2>
        <p class="sec-sub">${esc(s.subtitle)}</p>
        <form class="lead-form" novalidate>
          <label><span>Nama lengkap</span><input name="name" required autocomplete="name" placeholder="Nama Anda"></label>
          <label><span>No. WhatsApp</span><input name="phone" required inputmode="tel" autocomplete="tel" placeholder="08xx xxxx xxxx"></label>
          <label class="full"><span>Program yang diminati</span>
            <select name="program"><option value="">Belum yakin — bantu saya memilih</option>${programs.map((p) => `<option>${esc(p.title)}</option>`).join('')}</select></label>
          <label class="full"><span>Pesan (opsional)</span><textarea name="message" rows="2" placeholder="Contoh: jadwal kelas sore, biaya, dll."></textarea></label>
          <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
          <div class="full form-actions">
            <button class="btn btn-primary" type="submit">Kirim pendaftaran ${icon.arrow}</button>
            <a class="btn btn-ghost light" href="https://wa.me/${esc(site.brand.whatsapp)}?text=${encodeURIComponent('Halo LPK Rita, saya ingin bertanya tentang pelatihan.')}" target="_blank" rel="noopener">${icon.wa} Chat WhatsApp</a>
          </div>
          <p class="form-msg full" role="status" aria-live="polite" data-success="${esc(s.success)}"></p>
        </form>
      </div>
    </div>
  </section>`;
  },

  contact: (s, site) => {
    const b = site.brand;
    return `
  <section class="contact section" id="kontak">
    <div class="wrap contact-grid">
      <div>
        ${head(s.kicker, s.title, '', 'left')}
        <ul class="contact-list" data-reveal>
          <li>${icon.pin}<div><span>Alamat</span><p>${esc(b.address)}</p></div></li>
          <li>${icon.phone}<div><span>Telepon / WhatsApp</span><p><a href="tel:${esc(b.phone.replace(/\s/g, ''))}">${esc(b.phone)}</a>${b.phoneAlt ? ` · <a href="tel:${esc(b.phoneAlt.replace(/[\s-]/g, ''))}">${esc(b.phoneAlt)}</a>` : ''}</p></div></li>
          <li>${icon.mail}<div><span>Email</span><p><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></p></div></li>
          <li>${icon.clock}<div><span>Jam operasional</span><p>${esc(b.hours)}</p></div></li>
        </ul>
      </div>
      <div class="map" data-reveal>
        <iframe title="Peta lokasi ${esc(b.name)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
          src="https://maps.google.com/maps?q=${encodeURIComponent(b.mapsQuery || b.address)}&z=16&output=embed"></iframe>
      </div>
    </div>
  </section>`;
  },
};

const googleFonts = (t) => {
  const fam = (f, spec) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}${spec}`;
  const display = t.displayFont === 'Fraunces' ? ':ital,opsz,wght@0,9..144,300..700;1,9..144,300..700' : ':ital,wght@0,400..700;1,400..700';
  return `https://fonts.googleapis.com/css2?${fam(t.displayFont, display)}&${fam(t.bodyFont, ':wght@400..700')}&display=swap`;
};

export function themeVars(t) {
  const hex = (v, d) => (/^#[0-9a-f]{6}$/i.test(v) ? v : d);
  return `:root{--accent:${hex(t.accent, '#C8364A')};--ink:${hex(t.ink, '#1B1416')};--paper:${hex(t.paper, '#F7F2EC')};--gold:${hex(t.gold, '#A9834F')};--radius:${Number(t.radius) || 14}px;--f-display:'${esc(t.displayFont)}',Georgia,serif;--f-body:'${esc(t.bodyFont)}',system-ui,sans-serif}`;
}

export function renderLanding(site, { preview = false } = {}) {
  const b = site.brand;
  const order = site.sectionOrder.filter((k) => R[k] && site.sections[k]?.enabled !== false);
  const navMap = { about: ['tentang', 'Tentang'], programs: ['program', 'Program'], gallery: ['galeri', 'Galeri'], faq: ['faq', 'FAQ'], contact: ['kontak', 'Kontak'] };
  const nav = order.filter((k) => navMap[k]).map((k) => `<a href="#${navMap[k][0]}">${navMap[k][1]}</a>`).join('');
  const orgLd = {
    '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: b.name,
    telephone: b.phone, email: b.email, address: b.address, foundingDate: '2010-11-20',
    sameAs: [b.facebook, b.instagram, b.youtube].filter(Boolean),
  };

  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.seo.title)}</title>
<meta name="description" content="${esc(site.seo.description)}">
<meta property="og:title" content="${esc(site.seo.title)}">
<meta property="og:description" content="${esc(site.seo.description)}">
<meta property="og:image" content="${esc(site.seo.ogImage)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="${esc(site.theme.paper)}">
<link rel="icon" href="${esc(b.logo)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${googleFonts(site.theme)}">
<link rel="stylesheet" href="/assets/css/site.css">
<style>${themeVars(site.theme)}</style>
<script type="application/ld+json">${JSON.stringify(orgLd).replace(/</g, '\\u003c')}</script>
</head>
<body${preview ? ' class="is-preview"' : ''}>
<a class="skip" href="#main">Lewati ke konten</a>
<header class="topbar">
  <div class="wrap topbar-in">
    <a class="brand" href="#beranda"><img src="${esc(b.logo)}" alt="" width="40" height="36"><span><strong>${esc(b.name)}</strong><small>${esc(b.tagline)}</small></span></a>
    <nav class="nav" aria-label="Utama">${nav}</nav>
    <div class="top-actions">
      <a class="link-login" href="/belajar">Masuk Kelas</a>
      <a class="btn btn-primary sm" href="#daftar">Daftar</a>
      <button class="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span></button>
    </div>
  </div>
  <div class="mnav" hidden>${nav}<a href="/belajar">Masuk Kelas Online</a><a class="btn btn-primary" href="#daftar">Daftar Sekarang</a></div>
</header>
<main id="main">
${order.map((k) => R[k](site.sections[k], site)).join('\n')}
</main>
<footer class="footer">
  <div class="wrap footer-grid">
    <div class="f-brand">
      <img src="${esc(b.logo)}" alt="" width="56" height="51">
      <p><strong>${esc(b.name)}</strong><br>${esc(b.tagline)} — melatih SDM kompeten, berwawasan, dan berbudi luhur sejak 2010.</p>
      <div class="socials">
        ${b.instagram ? `<a href="${safeUrl(b.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${icon.ig}</a>` : ''}
        ${b.facebook ? `<a href="${safeUrl(b.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${icon.fb}</a>` : ''}
        ${b.youtube ? `<a href="${safeUrl(b.youtube)}" target="_blank" rel="noopener" aria-label="YouTube">${icon.yt}</a>` : ''}
      </div>
    </div>
    <div><p class="f-h">Jelajahi</p>${nav}</div>
    <div><p class="f-h">Portal</p><a href="/belajar">Kelas Online</a><a href="/belajar#/daftar">Buat Akun Siswa</a><a href="/sertifikat">Cek Sertifikat</a></div>
    <div><p class="f-h">Kontak</p><a href="tel:${esc(b.phone.replace(/\s/g, ''))}">${esc(b.phone)}</a><a href="mailto:${esc(b.email)}">${esc(b.email)}</a><p class="f-addr">${esc(b.address)}</p></div>
  </div>
  <div class="wrap f-bottom"><span>© ${new Date().getFullYear()} ${esc(b.name)}. Seluruh hak cipta.</span><span>Izin Disnaker 563/356/Dissosnaker.02</span></div>
</footer>
<a class="wa-float" href="https://wa.me/${esc(b.whatsapp)}" target="_blank" rel="noopener" aria-label="Chat WhatsApp">${icon.wa}</a>
<script src="/assets/js/site.js" defer></script>
</body>
</html>`;
}
