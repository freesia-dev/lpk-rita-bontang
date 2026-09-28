import { api, html, raw, render, $, $$, toast, ico, md, youtubeId, confetti, fmtDate } from '/assets/js/core.js';

const app = $('#app');
const S = { user: null, brand: null, courses: null };
const LEVEL_XP = 150;
const level = (xp) => ({ n: Math.floor(xp / LEVEL_XP) + 1, into: xp % LEVEL_XP, pct: Math.round(((xp % LEVEL_XP) / LEVEL_XP) * 100) });
const TYPE = { text: ['Bacaan', 'text'], video: ['Video', 'play'], quiz: ['Kuis', 'quiz'] };
const greet = () => { const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; };
const first = (n) => n.split(' ')[0];

function applyTheme(t) {
  const r = document.documentElement.style;
  r.setProperty('--accent', t.accent); r.setProperty('--ink', t.ink); r.setProperty('--paper', t.paper); r.setProperty('--gold', t.gold);
  document.querySelector('meta[name=theme-color]').content = t.paper;
}

const ring = (pct, size = 56, stroke = 5) => {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return raw(`<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-bg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`);
};

// ---------------------------------------------------------------------------
// Auth
function viewAuth(mode = 'masuk') {
  const b = S.brand;
  render(app, html`<main class="auth">
    <section class="auth-art">
      <img src="/assets/img/kelas-kecantikan.jpg" alt="">
      <div class="auth-art-copy">
        <a class="auth-brand" href="/"><img src="${b.logo}" alt="">${b.name}</a>
        <h1>Belajar di kelas, <em>ulangi</em> di rumah.</h1>
        <ul><li>${ico('play')} Video & materi bisa diputar ulang</li><li>${ico('quiz')} Kuis interaktif dengan pembahasan</li><li>${ico('award')} Sertifikat digital yang bisa diverifikasi</li></ul>
      </div>
    </section>
    <section class="auth-panel">
      <a class="auth-back" href="/">${ico('back')} Beranda</a>
      <div class="auth-box">
        <img class="auth-logo" src="${b.logo}" alt="" width="52">
        <h2>${mode === 'daftar' ? 'Buat akun siswa' : 'Masuk ke kelas'}</h2>
        <p class="muted">${mode === 'daftar' ? 'Gratis. Cukup 1 menit untuk mulai belajar.' : 'Lanjutkan belajar dari materi terakhir Anda.'}</p>
        <div class="tabs" role="tablist"><a href="#/masuk" class="${mode === 'masuk' ? 'on' : ''}" role="tab">Masuk</a><a href="#/daftar" class="${mode === 'daftar' ? 'on' : ''}" role="tab">Daftar</a></div>
        <form id="af" novalidate>
          ${mode === 'daftar' ? html`<label class="fl"><span>Nama lengkap</span><input name="name" required autocomplete="name"></label>
          <label class="fl"><span>No. WhatsApp</span><input name="phone" inputmode="tel" autocomplete="tel" placeholder="08…"></label>` : ''}
          <label class="fl"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
          <label class="fl"><span>Kata sandi</span><span class="pw"><input name="password" type="password" required minlength="8" autocomplete="${mode === 'daftar' ? 'new-password' : 'current-password'}"><button type="button" class="pw-t" aria-label="Tampilkan kata sandi">${ico('eye')}</button></span></label>
          <p class="err" role="alert"></p>
          <button class="btn primary block" type="submit">${mode === 'daftar' ? 'Buat akun & mulai' : 'Masuk'} ${ico('arrow')}</button>
        </form>
        <p class="auth-foot muted">${mode === 'daftar' ? html`Sudah punya akun? <a href="#/masuk">Masuk</a>` : html`Belum punya akun? <a href="#/daftar">Daftar gratis</a>`}</p>
      </div>
    </section>
  </main>`);
  $('.pw-t').onclick = (e) => { const i = $('input[name=password]'); i.type = i.type === 'password' ? 'text' : 'password'; };
  $('#af').onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('button[type=submit]', e.target); const err = $('.err', e.target); err.textContent = '';
    const body = Object.fromEntries(new FormData(e.target));
    if (mode === 'daftar' && String(body.password).length < 8) { err.textContent = 'Kata sandi minimal 8 karakter.'; return; }
    btn.disabled = true;
    try {
      const { user } = await api(`/api/auth/${mode === 'daftar' ? 'register' : 'login'}`, { method: 'POST', body });
      S.user = user; S.courses = null;
      const next = sessionStorage.getItem('lms-next'); sessionStorage.removeItem('lms-next');
      location.hash = next || '#/'; if (!next) route();
      if (mode === 'daftar') toast(`Selamat datang, ${first(user.name)}!`);
    } catch (ex) { err.textContent = ex.message; } finally { btn.disabled = false; }
  };
}

// ---------------------------------------------------------------------------
// Shell
function shell(active) {
  const u = S.user; const lv = level(u.xp);
  render(app, html`
    <header class="top">
      <div class="top-in">
        <a class="brand" href="#/"><img src="${S.brand.logo}" alt=""><span><strong>${S.brand.shortName}</strong><small>Kelas Online</small></span></a>
        <nav class="tnav"><a href="#/" class="${active === 'home' ? 'on' : ''}">${ico('home')}<span>Beranda</span></a><a href="#/katalog" class="${active === 'katalog' ? 'on' : ''}">${ico('book')}<span>Katalog</span></a><a href="#/profil" class="${active === 'profil' ? 'on' : ''}">${ico('user')}<span>Profil</span></a></nav>
        <div class="tstats">
          <span class="chip streak ${u.streak ? 'hot' : ''}" title="Hari berturut-turut belajar">${ico('fire')} ${u.streak}</span>
          <span class="chip xp" title="Level ${lv.n}: ${lv.into}/${LEVEL_XP} XP">${ico('star')} ${u.xp} XP</span>
          ${u.role !== 'student' ? html`<a class="chip" href="/admin">Dashboard</a>` : ''}
        </div>
      </div>
    </header>
    <main class="page" id="page"></main>`);
  return $('#page');
}

// ---------------------------------------------------------------------------
// Beranda
async function viewHome() {
  const page = shell('home');
  render(page, html`<div class="skel hero-skel"></div>`);
  const [{ courses }, { top }] = await Promise.all([api('/api/lms/courses'), api('/api/lms/leaderboard')]);
  S.courses = courses;
  const u = S.user; const lv = level(u.xp);
  const mine = courses.filter((c) => c.enrollment && c.enrollment.status !== 'pending');
  const pending = courses.filter((c) => c.enrollment?.status === 'pending');
  const explore = courses.filter((c) => !c.enrollment);
  const cont = mine.filter((c) => c.enrollment.percent < 100).sort((a, b) => b.enrollment.percent - a.enrollment.percent)[0];
  const done = mine.filter((c) => c.enrollment.completed_at);
  const badges = [
    { k: 'Langkah pertama', d: 'Selesaikan 1 materi', ok: u.xp > 0, i: 'check' },
    { k: 'Konsisten', d: 'Belajar 3 hari berturut-turut', ok: u.streak >= 3, i: 'fire' },
    { k: 'Rajin', d: 'Kumpulkan 300 XP', ok: u.xp >= 300, i: 'star' },
    { k: 'Lulusan', d: 'Tuntaskan 1 kelas', ok: done.length > 0, i: 'award' },
  ];

  render(page, html`
    <section class="welcome">
      <div class="welcome-copy">
        <p class="eyebrow">${greet()},</p>
        <h1>${first(u.name)}. <em>${cont ? 'Lanjut belajar?' : mine.length ? 'Semua kelas tuntas!' : 'Mulai dari mana?'}</em></h1>
        <div class="level">
          <div class="level-top"><strong>Level ${lv.n}</strong><span>${LEVEL_XP - lv.into} XP lagi ke level ${lv.n + 1}</span></div>
          <div class="bar"><i style="width:${lv.pct}%"></i></div>
        </div>
      </div>
      ${cont ? html`<a class="continue" href="#/kelas/${cont.slug}">
        <img src="${cont.cover}" alt="">
        <div class="continue-body"><span class="label">Lanjutkan</span><h2>${cont.title}</h2>
          <div class="continue-prog"><div class="bar light"><i style="width:${cont.enrollment.percent}%"></i></div><span>${cont.enrollment.done}/${cont.enrollment.total} materi</span></div>
          <span class="btn primary">${cont.enrollment.done ? 'Lanjutkan' : 'Mulai'} ${ico('arrow')}</span></div>
      </a>` : explore[0] ? html`<a class="continue" href="#/kelas/${explore[0].slug}"><img src="${explore[0].cover}" alt=""><div class="continue-body"><span class="label">Rekomendasi</span><h2>${explore[0].title}</h2><p>${explore[0].summary}</p><span class="btn primary">Lihat kelas ${ico('arrow')}</span></div></a>` : ''}
    </section>

    ${pending.length ? html`<div class="notice">${ico('clock')}<span>Menunggu persetujuan admin: <strong>${pending.map((c) => c.title).join(', ')}</strong>. Anda akan bisa belajar setelah disetujui.</span></div>` : ''}

    <div class="home-grid">
      <div>
        <div class="sh"><h2>Kelas saya</h2>${mine.length ? html`<span class="muted">${mine.length} kelas</span>` : ''}</div>
        ${mine.length ? html`<div class="mycourses">${mine.map((c) => html`<a class="mc" href="#/kelas/${c.slug}">
          <div class="mc-ring">${ring(c.enrollment.percent)}<span>${c.enrollment.percent}%</span></div>
          <div class="mc-body"><small>${c.category}</small><strong>${c.title}</strong><span>${c.enrollment.completed_at ? html`<em class="ok">${ico('award')} Lulus · sertifikat siap</em>` : `${c.enrollment.total - c.enrollment.done} materi tersisa`}</span></div>
          ${ico('arrow', 'mc-go')}</a>`)}</div>` : html`<div class="empty">${ico('book')}<p>Anda belum mengikuti kelas. Pilih dari katalog di bawah.</p></div>`}

        ${explore.length ? html`<div class="sh"><h2>Jelajahi kelas</h2><a href="#/katalog" class="link">Lihat katalog ${ico('arrow')}</a></div>
          <div class="cards">${explore.slice(0, 4).map(card)}</div>` : ''}
      </div>
      <aside class="side">
        <div class="panel">
          <h3>Lencana</h3>
          <ul class="badges">${badges.map((bd) => html`<li class="${bd.ok ? 'got' : ''}" title="${bd.d}"><span>${ico(bd.i)}</span><strong>${bd.k}</strong><small>${bd.d}</small></li>`)}</ul>
        </div>
        ${top.length ? html`<div class="panel">
          <h3>Papan peringkat</h3>
          <ol class="lb">${top.map((t, i) => html`<li class="${t.me ? 'me' : ''}"><span class="pos">${i + 1}</span><span class="nm">${t.name}${t.me ? ' (Anda)' : ''}</span><b>${t.xp} XP</b></li>`)}</ol>
        </div>` : ''}
        <div class="panel tip"><h3>Cara dapat XP</h3><p>Selesaikan bacaan & video <b>+10 XP</b>, lulus kuis hingga <b>+30 XP</b>, tuntaskan kelas <b>+100 XP</b>. Belajar tiap hari menjaga streak 🔥.</p></div>
      </aside>
    </div>`);
}

const card = (c) => html`<a class="card" href="#/kelas/${c.slug}">
  <div class="card-img"><img src="${c.cover}" alt="" loading="lazy"><span class="lvl">${c.level}</span></div>
  <div class="card-body"><small>${c.category}</small><h3>${c.title}</h3><p>${c.summary}</p>
  <div class="card-meta"><span>${ico('book')} ${c.lessons} materi</span><span>${ico('clock')} ${c.minutes} mnt</span>${c.access === 'approval' ? html`<span>${ico('lock')} Perlu persetujuan</span>` : ''}</div></div>
  ${c.enrollment ? html`<div class="card-prog"><div class="bar"><i style="width:${c.enrollment.percent || 0}%"></i></div></div>` : ''}
</a>`;

async function viewCatalog() {
  const page = shell('katalog');
  const { courses } = await api('/api/lms/courses'); S.courses = courses;
  const cats = [...new Set(courses.map((c) => c.category).filter(Boolean))];
  let cat = '';
  const draw = () => render(page, html`
    <div class="phead"><h1>Katalog kelas</h1><p class="muted">Materi pendamping pelatihan tatap muka di ${S.brand.name}.</p></div>
    ${cats.length > 1 ? html`<div class="filters">${['', ...cats].map((c) => html`<button class="${cat === c ? 'on' : ''}" data-c="${c}">${c || 'Semua'}</button>`)}</div>` : ''}
    ${courses.length ? html`<div class="cards">${courses.filter((c) => !cat || c.category === cat).map(card)}</div>` : html`<div class="empty">${ico('book')}<p>Belum ada kelas yang diterbitkan.</p></div>`}`);
  draw();
  page.onclick = (e) => { const b = e.target.closest('[data-c]'); if (b) { cat = b.dataset.c; draw(); } };
}

// ---------------------------------------------------------------------------
// Halaman kelas & pemutar materi
async function viewCourse(slug, lessonId) {
  const { course, enrollment, canLearn } = await api(`/api/lms/courses/${slug}`);
  const lessons = course.curriculum.flatMap((s) => s.lessons.map((l) => ({ ...l, section: s.title })));
  if (!canLearn || !lessonId) return viewCourseIntro(course, enrollment, canLearn, lessons);
  const idx = lessons.findIndex((l) => l.id === lessonId);
  if (idx < 0) { location.hash = `#/kelas/${slug}`; return; }
  return viewPlayer(course, enrollment, lessons, idx);
}

function viewCourseIntro(course, enr, canLearn, lessons) {
  const page = shell('katalog');
  const prog = enr?.progress || {};
  const next = lessons.find((l) => !prog[l.id]?.done) || lessons[0];
  const minutes = lessons.reduce((a, l) => a + (Number(l.minutes) || 0), 0);
  render(page, html`
    <a class="back" href="#/">${ico('back')} Kembali</a>
    <section class="intro">
      <div class="intro-img"><img src="${course.cover}" alt=""></div>
      <div class="intro-body">
        <small class="eyebrow">${course.category} · ${course.level}</small>
        <h1>${course.title}</h1>
        <p class="lead">${course.summary}</p>
        <div class="facts"><span>${ico('book')} ${lessons.length} materi</span><span>${ico('clock')} ± ${minutes} menit</span><span>${ico('quiz')} ${lessons.filter((l) => l.type === 'quiz').length} kuis</span><span>${ico('award')} Sertifikat</span></div>
        ${enr?.completed_at ? html`<div class="done-box">${ico('award')}<div><strong>Kelas tuntas pada ${fmtDate(enr.completed_at)}</strong><a href="/sertifikat/${enr.cert_code}" target="_blank">Lihat & unduh sertifikat ${ico('arrow')}</a></div></div>` : ''}
        <div class="intro-cta">
          ${canLearn && lessons.length ? html`<a class="btn primary lg" href="#/kelas/${course.slug}/${next.id}">${enr?.done ? 'Lanjutkan belajar' : 'Mulai belajar'} ${ico('arrow')}</a>${enr ? html`<span class="muted">${enr.percent}% selesai</span>` : ''}`
            : enr?.status === 'pending' ? html`<span class="pending">${ico('clock')} Menunggu persetujuan admin</span>`
            : enr?.status === 'blocked' ? html`<span class="pending">${ico('lock')} Akses kelas ini ditutup. Hubungi admin.</span>`
            : html`<button class="btn primary lg" id="enroll">${course.access === 'approval' ? 'Minta bergabung' : 'Ikuti kelas — gratis'} ${ico('arrow')}</button>${course.access === 'approval' ? html`<span class="muted">Khusus peserta pelatihan, perlu persetujuan admin.</span>` : ''}`}
        </div>
      </div>
    </section>
    <section class="outline">
      <h2>Isi kelas</h2>
      ${course.curriculum.map((s, si) => html`<div class="ol-sec"><h3><span>Bab ${si + 1}</span>${s.title}</h3><ol>${s.lessons.map((l) => {
        const d = prog[l.id]?.done;
        const inner = html`<span class="lt ${l.type}">${ico(d ? 'check' : TYPE[l.type][1])}</span><span class="ol-t">${l.title}</span><small>${TYPE[l.type][0]} · ${l.minutes || 0} mnt</small>`;
        return html`<li class="${d ? 'done' : ''}">${canLearn ? html`<a href="#/kelas/${course.slug}/${l.id}">${inner}</a>` : html`<div>${inner}${ico('lock', 'lk')}</div>`}</li>`;
      })}</ol></div>`)}
    </section>`);
  $('#enroll')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const r = await api(`/api/lms/courses/${course.id}/enroll`, { method: 'POST', body: {} });
      if (r.status === 'pending') toast('Permintaan terkirim. Tunggu persetujuan admin ya.');
      else { toast('Anda terdaftar! Selamat belajar.'); location.hash = `#/kelas/${course.slug}/${lessons[0].id}`; return; }
      route();
    } catch (ex) { toast(ex.message, 'err'); e.target.disabled = false; }
  });
}

function viewPlayer(course, enr, lessons, idx) {
  const l = lessons[idx]; const prog = enr?.progress || {};
  const prev = lessons[idx - 1]; const next = lessons[idx + 1];
  const pct = enr?.percent || 0;
  document.body.classList.add('player-mode');
  render(app, html`
    <div class="player">
      <header class="p-top">
        <a class="tbtn" href="#/kelas/${course.slug}" title="Tutup">${ico('x')}</a>
        <div class="p-title"><small>${course.title}</small><strong>${l.title}</strong></div>
        <div class="p-prog" title="${pct}% selesai"><div class="bar"><i style="width:${pct}%"></i></div><span>${pct}%</span></div>
        <button class="tbtn p-toggle" id="ptoggle" aria-label="Daftar materi">${ico('menu')}</button>
      </header>
      <aside class="p-side" id="pside">
        ${course.curriculum.map((s, si) => html`<div class="ps-sec"><p>Bab ${si + 1} · ${s.title}</p><ol>${s.lessons.map((x) => html`<li><a href="#/kelas/${course.slug}/${x.id}" class="${x.id === l.id ? 'on' : ''} ${prog[x.id]?.done ? 'done' : ''}"><span class="lt ${x.type}">${ico(prog[x.id]?.done ? 'check' : TYPE[x.type][1])}</span><span>${x.title}</span></a></li>`)}</ol></div>`)}
      </aside>
      <main class="p-main" id="pmain">
        <div class="p-content">
          <p class="p-kicker"><span class="lt ${l.type}">${ico(TYPE[l.type][1])}</span>${TYPE[l.type][0]} · ${l.minutes || 0} menit · ${l.section}</p>
          <h1>${l.title}</h1>
          <div id="lesson"></div>
        </div>
        <footer class="p-foot">
          ${prev ? html`<a class="btn ghost" href="#/kelas/${course.slug}/${prev.id}">${ico('back')} <span>Sebelumnya</span></a>` : html`<span></span>`}
          <div id="pfoot-main"></div>
        </footer>
      </main>
    </div>`);
  $('#ptoggle').onclick = () => $('#pside').classList.toggle('open');
  $('#pside').onclick = (e) => { if (e.target.closest('a')) $('#pside').classList.remove('open'); };
  $('.p-side a.on')?.scrollIntoView({ block: 'center' });

  const box = $('#lesson'); const foot = $('#pfoot-main');
  const goNext = () => { location.hash = next ? `#/kelas/${course.slug}/${next.id}` : `#/kelas/${course.slug}`; };
  const afterDone = (r) => {
    S.user.xp += r.xpGained || 0;
    if (r.xpGained) toast(`+${r.xpGained} XP`, 'xp');
    if (r.justCompleted) celebrate(course, r.certCode);
  };

  if (l.type === 'quiz') return quiz(box, foot, course, l, prog[l.id], { next, goNext, afterDone });

  if (l.type === 'video') {
    const id = youtubeId(l.video);
    render(box, html`${id ? html`<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1" title="${l.title}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>` : html`<div class="empty">${ico('play')}<p>Video belum tersedia.</p></div>`}<div class="prose">${raw(md(l.body))}</div>`);
  } else {
    render(box, html`<div class="prose">${raw(md(l.body))}</div>`);
  }
  const isDone = prog[l.id]?.done;
  render(foot, html`<button class="btn primary" id="done">${isDone ? html`${next ? 'Materi berikutnya' : 'Kembali ke kelas'} ${ico('arrow')}` : html`${ico('check')} Tandai selesai${next ? ' & lanjut' : ''}`}</button>`);
  const doneBtn = $('#done');
  doneBtn.onclick = async () => {
    if (isDone) return goNext();
    doneBtn.disabled = true;
    try { const r = await api(`/api/lms/courses/${course.id}/lessons/${l.id}/complete`, { method: 'POST', body: {} }); afterDone(r); if (!r.justCompleted) goNext(); else { doneBtn.disabled = false; } }
    catch (ex) { toast(ex.message, 'err'); doneBtn.disabled = false; }
  };
}

// Kuis: satu soal per layar, umpan balik dikirim server setelah semua dijawab.
function quiz(box, foot, course, l, prev, { next, goNext, afterDone }) {
  const qs = l.questions || [];
  let i = 0; const answers = Array(qs.length).fill(null); let result = null;
  const draw = () => {
    if (result) return drawResult();
    const q = qs[i];
    render(box, html`
      ${prev?.best != null ? html`<p class="muted small">Nilai terbaik Anda: <b>${prev.best}</b> · lulus minimal ${course.pass_score}</p>` : html`<p class="muted small">${qs.length} soal · lulus minimal ${course.pass_score}. Gunakan tombol 1–${Math.min(9, q.options.length)} di keyboard untuk memilih.</p>`}
      <div class="q-steps">${qs.map((_, k) => html`<i class="${k < i ? 'past' : k === i ? 'now' : ''}"></i>`)}</div>
      <div class="q-card" key="${i}">
        <p class="q-no">Soal ${i + 1} dari ${qs.length}</p>
        <h2 class="q-text">${q.q}</h2>
        <div class="q-opts" role="radiogroup">${q.options.map((o, k) => html`<button class="q-opt ${answers[i] === k ? 'sel' : ''}" role="radio" aria-checked="${answers[i] === k}" data-k="${k}"><span class="q-key">${String.fromCharCode(65 + k)}</span><span>${o}</span></button>`)}</div>
      </div>`);
    render(foot, html`${i > 0 ? html`<button class="btn ghost" id="qprev">Soal sebelumnya</button>` : ''}<button class="btn primary" id="qnext" ${answers[i] == null ? 'disabled' : ''}>${i < qs.length - 1 ? html`Soal berikutnya ${ico('arrow')}` : html`${ico('check')} Kumpulkan jawaban`}</button>`);
    $$('.q-opt', box).forEach((b) => (b.onclick = () => { answers[i] = +b.dataset.k; draw(); }));
    $('#qprev')?.addEventListener('click', () => { i--; draw(); });
    $('#qnext').onclick = submitOrNext;
  };
  const submitOrNext = async () => {
    if (answers[i] == null) return;
    if (i < qs.length - 1) { i++; return draw(); }
    $('#qnext').disabled = true;
    try { result = await api(`/api/lms/courses/${course.id}/lessons/${l.id}/quiz`, { method: 'POST', body: { answers } }); draw(); if (result.passed) afterDone(result); }
    catch (ex) { toast(ex.message, 'err'); $('#qnext').disabled = false; }
  };
  const drawResult = () => {
    const r = result; const correct = r.results.filter((x) => x.correct).length;
    render(box, html`
      <div class="q-result ${r.passed ? 'pass' : 'fail'}">
        <div class="qr-ring">${ring(r.score, 132, 10)}<span><b>${r.score}</b><small>nilai</small></span></div>
        <div><h2>${r.passed ? (r.score === 100 ? 'Sempurna!' : 'Lulus!') : 'Hampir! Coba sekali lagi.'}</h2>
        <p>${correct} dari ${qs.length} jawaban benar. ${r.passed ? 'Materi ini sudah ditandai selesai.' : `Butuh nilai ${r.passScore} untuk lulus. Baca pembahasan di bawah lalu ulangi.`}</p></div>
      </div>
      <h3 class="review-h">Pembahasan</h3>
      <ol class="review">${qs.map((q, k) => html`<li class="${r.results[k].correct ? 'ok' : 'no'}">
        <p class="rv-q"><span class="rv-i">${ico(r.results[k].correct ? 'check' : 'x')}</span>${q.q}</p>
        <p class="rv-a">Jawaban Anda: <b>${q.options[answers[k]]}</b>${r.results[k].correct ? '' : html` · Jawaban benar: <b>${q.options[r.results[k].answer]}</b>`}</p>
        ${r.results[k].explain ? html`<p class="rv-e">${r.results[k].explain}</p>` : ''}
      </li>`)}</ol>`);
    render(foot, html`<button class="btn ghost" id="qretry">Ulangi kuis</button>${r.passed ? html`<button class="btn primary" id="qgo">${next ? 'Materi berikutnya' : 'Kembali ke kelas'} ${ico('arrow')}</button>` : ''}`);
    $('#qretry').onclick = () => { result = null; i = 0; answers.fill(null); prev = { ...prev, best: Math.max(prev?.best || 0, r.score) }; draw(); };
    $('#qgo')?.addEventListener('click', goNext);
    if (r.passed && r.score === 100) confetti();
  };
  keyHandler = (e) => {
    if (result || e.target.matches('input,textarea') || e.metaKey || e.ctrlKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= qs[i].options.length) { answers[i] = n - 1; draw(); }
    if (e.key === 'Enter' && answers[i] != null) submitOrNext();
  };
  draw();
}
let keyHandler = null;
addEventListener('keydown', (e) => keyHandler?.(e));

function celebrate(course, code) {
  confetti();
  const d = document.createElement('dialog'); d.className = 'celebrate';
  render(d, html`<div class="cel-seal">${ico('award')}</div><h2>Selamat, ${first(S.user.name)}!</h2><p>Anda menuntaskan kelas <b>${course.title}</b> dan mendapat <b>+100 XP</b>. Sertifikat digital Anda sudah terbit.</p>
    <div class="cel-act"><a class="btn primary" href="/sertifikat/${code}" target="_blank">${ico('award')} Lihat sertifikat</a><a class="btn ghost" href="#/" id="celhome">Ke beranda</a></div>`);
  document.body.append(d); d.showModal();
  d.addEventListener('close', () => d.remove());
  $('#celhome', d).onclick = () => d.close();
}

// ---------------------------------------------------------------------------
// Profil
async function viewProfile() {
  const page = shell('profil');
  const { courses } = await api('/api/lms/courses');
  const certs = courses.filter((c) => c.enrollment?.cert_code);
  const u = S.user; const lv = level(u.xp);
  render(page, html`
    <div class="phead"><h1>Profil</h1></div>
    <div class="profile">
      <section class="panel pcard"><span class="avatar big">${u.name[0]}</span><h2>${u.name}</h2><p class="muted">${u.email}</p>
        <div class="pstats"><div><b>${lv.n}</b><small>Level</small></div><div><b>${u.xp}</b><small>XP</small></div><div><b>${u.streak}</b><small>Streak</small></div><div><b>${certs.length}</b><small>Sertifikat</small></div></div>
        <button class="btn ghost block" id="logout">${ico('logout')} Keluar</button></section>
      <div class="pcol">
        <section class="panel"><h3>Sertifikat saya</h3>
          ${certs.length ? html`<ul class="certs">${certs.map((c) => html`<li><span class="cert-ic">${ico('award')}</span><span><strong>${c.title}</strong><small>No. ${c.enrollment.cert_code} · ${fmtDate(c.enrollment.completed_at)}</small></span><a class="btn sm" href="/sertifikat/${c.enrollment.cert_code}" target="_blank">Buka</a></li>`)}</ul>` : html`<p class="muted">Tuntaskan satu kelas untuk mendapatkan sertifikat digital pertama Anda.</p>`}</section>
        <form class="panel form" id="pf"><h3>Data diri</h3>
          <label class="fl"><span>Nama lengkap</span><input name="name" value="${u.name}" required></label>
          <label class="fl"><span>No. WhatsApp</span><input name="phone" value="${u.phone || ''}"></label>
          <button class="btn primary">Simpan</button></form>
        <form class="panel form" id="pw"><h3>Ganti kata sandi</h3>
          <label class="fl"><span>Kata sandi saat ini</span><input name="current" type="password" required autocomplete="current-password"></label>
          <label class="fl"><span>Kata sandi baru</span><input name="next" type="password" minlength="8" required autocomplete="new-password"></label>
          <button class="btn primary">Perbarui</button></form>
      </div>
    </div>`);
  $('#logout').onclick = async () => { await api('/api/auth/logout', { method: 'POST', body: {} }); S.user = null; location.hash = '#/masuk'; };
  $('#pf').onsubmit = async (e) => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); try { await api('/api/auth/profile', { method: 'PATCH', body: b }); Object.assign(S.user, b); toast('Profil tersimpan'); viewProfile(); } catch (ex) { toast(ex.message, 'err'); } };
  $('#pw').onsubmit = async (e) => { e.preventDefault(); try { await api('/api/auth/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); e.target.reset(); toast('Kata sandi diperbarui'); } catch (ex) { toast(ex.message, 'err'); } };
}

// ---------------------------------------------------------------------------
// Router
async function route() {
  keyHandler = null; document.body.classList.remove('player-mode');
  const [r, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  if (r === 'masuk' || r === 'daftar') { if (S.user) { location.hash = '#/'; return; } return viewAuth(r); }
  if (!S.user) { if (r) sessionStorage.setItem('lms-next', location.hash); return viewAuth('masuk'); }
  try {
    if (r === 'kelas' && a) await viewCourse(a, b);
    else if (r === 'katalog') await viewCatalog();
    else if (r === 'profil') await viewProfile();
    else await viewHome();
  } catch (e) {
    if (e.status === 401) { S.user = null; return viewAuth('masuk'); }
    const page = $('#page') || shell('home');
    render(page, html`<div class="empty">${ico('x')}<p>${e.message}</p><a class="btn" href="#/">Ke beranda</a></div>`);
  }
  window.scrollTo(0, 0);
}
addEventListener('hashchange', route);

(async () => {
  const [{ brand, theme }, { user }] = await Promise.all([api('/api/public/brand'), api('/api/auth/me')]);
  S.brand = brand; S.user = user; applyTheme(theme);
  route();
})();
