import { esc, themeVars } from './render.js';

const fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Plus+Jakarta+Sans:wght@400..700&display=swap">';
const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const base = `
*{box-sizing:border-box}body{margin:0;font-family:var(--f-body);background:var(--paper);color:var(--ink);-webkit-font-smoothing:antialiased}
a{color:inherit}.bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;max-width:1100px;margin:0 auto;padding:20px 16px}
.bar a.home{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:700}.bar img{width:36px}
.btn{display:inline-flex;align-items:center;gap:8px;border:0;border-radius:999px;padding:12px 20px;font:600 14px var(--f-body);cursor:pointer;text-decoration:none;background:var(--ink);color:var(--paper)}
.btn.alt{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--ink) 25%,transparent)}
`;

export function renderCertificate(site, row) {
  const b = site.brand;
  const verifyUrl = `/sertifikat/${row.cert_code}`;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sertifikat ${esc(row.name)} — ${esc(row.title)}</title>${fonts}
<style>${themeVars(site.theme)}${base}
.stage{padding:8px 16px 48px;overflow-x:auto}
.cert{width:1000px;max-width:none;aspect-ratio:1.414;margin:0 auto;background:#fffdf9;position:relative;padding:64px 80px;box-shadow:0 30px 80px -30px rgba(40,20,20,.35);display:flex;flex-direction:column}
.cert::before{content:"";position:absolute;inset:18px;border:1px solid var(--gold);pointer-events:none}
.cert::after{content:"";position:absolute;inset:26px;border:3px double color-mix(in srgb,var(--gold) 60%,transparent);pointer-events:none}
.top{display:flex;align-items:center;justify-content:space-between}
.top img{width:74px}.top .org{text-align:right;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#6b5b58;line-height:1.7}
h1{font-family:var(--f-display);font-weight:400;font-size:64px;margin:36px 0 0;letter-spacing:-.02em;line-height:1}
h1 em{color:var(--accent)}
.lead{font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:#6b5b58;margin:28px 0 8px}
.name{font-family:var(--f-display);font-style:italic;font-size:54px;margin:0;line-height:1.1;border-bottom:1px solid var(--gold);padding-bottom:14px}
.desc{font-size:17px;line-height:1.6;max-width:680px;margin:18px 0 0;color:#3d3133}
.desc strong{color:var(--ink)}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.sign{text-align:center;min-width:240px}.sign .line{border-top:1px solid var(--ink);margin-top:56px;padding-top:8px;font-weight:700}.sign small{display:block;color:#6b5b58}
.code{font-size:12px;color:#6b5b58;line-height:1.7}.code b{color:var(--ink);font-family:ui-monospace,monospace;font-size:13px}
.seal{width:92px;height:92px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;text-align:center;font:700 11px/1.3 var(--f-body);letter-spacing:.08em;text-transform:uppercase;box-shadow:inset 0 0 0 4px rgba(255,255,255,.35)}
.verified{max-width:1000px;margin:0 auto 18px;padding:0 16px;display:flex;gap:10px;align-items:center;color:#1d6b43;font-weight:600;font-size:14px}
@media print{@page{size:A4 landscape;margin:0}.bar,.verified{display:none}body{background:#fff}.stage{padding:0}.cert{box-shadow:none;width:100%;height:100vh;aspect-ratio:auto}}
</style></head><body>
<div class="bar"><a class="home" href="/"><img src="${esc(b.logo)}" alt="">${esc(b.name)}</a><div style="display:flex;gap:8px"><a class="btn alt" href="/belajar">Portal belajar</a><button class="btn" onclick="print()">Cetak / Simpan PDF</button></div></div>
<p class="verified">✓ Sertifikat terverifikasi — diterbitkan oleh ${esc(b.name)}</p>
<div class="stage"><article class="cert">
  <div class="top"><img src="${esc(b.logo)}" alt=""><div class="org">${esc(b.tagline)}<br><strong>${esc(b.name)}</strong><br>Izin 563/356/Dissosnaker.02</div></div>
  <h1>Sertifikat <em>Penyelesaian</em></h1>
  <p class="lead">Diberikan kepada</p>
  <p class="name">${esc(row.name)}</p>
  <p class="desc">Atas keberhasilan menyelesaikan seluruh materi dan evaluasi kelas daring <strong>${esc(row.title)}</strong>${row.category ? ` (bidang ${esc(row.category)})` : ''} pada portal belajar ${esc(b.name)}.</p>
  <div class="foot">
    <div class="code">Diterbitkan: <b>${fmtDate(row.completed_at)}</b><br>No. sertifikat: <b>${esc(row.cert_code)}</b><br>Verifikasi: ${esc(verifyUrl)}</div>
    <div class="seal">LPK<br>Rita<br>✦</div>
    <div class="sign"><div class="line">Rita Hidayat, SE</div><small>Pimpinan ${esc(b.shortName)}</small></div>
  </div>
</article></div></body></html>`;
}

export function renderCertLookup(site, code, notFound = false) {
  const b = site.brand;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cek Sertifikat — ${esc(b.name)}</title>${fonts}
<style>${themeVars(site.theme)}${base}
main{max-width:560px;margin:8vh auto;padding:0 16px}h1{font-family:var(--f-display);font-weight:400;font-size:clamp(36px,7vw,56px);line-height:1.05;margin:0 0 12px;letter-spacing:-.02em}
p{color:#5a4b4d;line-height:1.6}form{display:flex;gap:8px;margin-top:24px;flex-wrap:wrap}
input{flex:1;min-width:200px;padding:14px 16px;border-radius:999px;border:1px solid color-mix(in srgb,var(--ink) 20%,transparent);font:500 15px var(--f-body);background:#fff;text-transform:uppercase}
input:focus{outline:2px solid var(--accent);outline-offset:1px}.err{color:var(--accent);font-weight:600}
</style></head><body>
<div class="bar"><a class="home" href="/"><img src="${esc(b.logo)}" alt="">${esc(b.name)}</a></div>
<main><h1>Cek keaslian sertifikat</h1><p>Masukkan nomor sertifikat yang tertera pada dokumen (contoh: LPKR-2026-A1B2C3).</p>
${notFound ? `<p class="err">Sertifikat dengan nomor “${esc(code)}” tidak ditemukan.</p>` : ''}
<form onsubmit="event.preventDefault();location.href='/sertifikat/'+encodeURIComponent(this.k.value.trim().toUpperCase())"><input name="k" required placeholder="LPKR-XXXX-XXXXXX" value="${esc(code || '')}" aria-label="Nomor sertifikat"><button class="btn">Cek</button></form></main>
</body></html>`;
}
