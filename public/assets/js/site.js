(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Header saat scroll
  const bar = $('.topbar');
  const onScroll = () => bar.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Menu mobile
  const burger = $('.burger'); const mnav = $('.mnav');
  const setMenu = (open) => { burger.setAttribute('aria-expanded', open); mnav.hidden = !open; document.body.style.overflow = open ? 'hidden' : ''; };
  burger?.addEventListener('click', () => setMenu(mnav.hidden));
  $$('.mnav a').forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // Animasi muncul
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 4) * 70}ms`;
    // Konten di atas lipatan langsung tampil (tidak menunggu observer).
    if (el.closest('.hero')) requestAnimationFrame(() => el.classList.add('is-in'));
    else io.observe(el);
  });

  // Filter program
  $$('.chip').forEach((chip) => chip.addEventListener('click', () => {
    $$('.chip').forEach((c) => { c.classList.toggle('is-on', c === chip); c.setAttribute('aria-selected', c === chip); });
    const f = chip.dataset.filter;
    $$('.prog').forEach((p) => p.classList.toggle('is-hidden', f !== '*' && p.dataset.cat !== f));
  }));

  // Tombol "Daftar" pada program mengisi pilihan di formulir
  $$('[data-program]').forEach((a) => a.addEventListener('click', () => {
    const sel = $('.lead-form select[name=program]');
    if (sel) sel.value = a.dataset.program;
    setTimeout(() => $('.lead-form input[name=name]')?.focus({ preventScroll: true }), 600);
  }));

  // Galeri lightbox
  const lb = $('.lightbox');
  if (lb) {
    const items = JSON.parse($('#gallery-data').textContent);
    let idx = 0;
    const show = (i) => {
      idx = (i + items.length) % items.length;
      $('img', lb).src = items[idx].image; $('img', lb).alt = items[idx].caption;
      $('figcaption', lb).textContent = `${items[idx].caption} · ${idx + 1}/${items.length}`;
    };
    $$('.gal-item').forEach((b) => b.addEventListener('click', () => { show(+b.dataset.index); lb.showModal(); }));
    $('.lb-close', lb).onclick = () => lb.close();
    $('.lb-prev', lb).onclick = () => show(idx - 1);
    $('.lb-next', lb).onclick = () => show(idx + 1);
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
  }

  // Testimoni
  const track = $('.testi-track');
  $$('.testi-nav button').forEach((b) => b.addEventListener('click', () => {
    const card = $('.testi-card', track);
    track.scrollBy({ left: (card.offsetWidth + 20) * Number(b.dataset.dir), behavior: 'smooth' });
  }));

  // Formulir pendaftaran
  const form = $('.lead-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('.form-msg', form); const btn = $('button[type=submit]', form);
    const data = Object.fromEntries(new FormData(form));
    let bad = false;
    for (const f of ['name', 'phone']) {
      const el = form.elements[f]; const invalid = !el.value.trim() || (f === 'phone' && !/^[+\d][\d\s-]{7,}$/.test(el.value.trim()));
      el.classList.toggle('is-invalid', invalid); bad ||= invalid;
    }
    if (bad) { msg.className = 'form-msg full err'; msg.textContent = 'Mohon isi nama dan nomor WhatsApp yang valid.'; return; }
    btn.disabled = true; msg.className = 'form-msg full'; msg.textContent = 'Mengirim…';
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error);
      form.reset(); msg.className = 'form-msg full ok'; msg.textContent = msg.dataset.success;
    } catch (err) {
      msg.className = 'form-msg full err'; msg.textContent = err.message || 'Gagal mengirim. Coba lagi atau hubungi kami via WhatsApp.';
    } finally { btn.disabled = false; }
  });
})();
