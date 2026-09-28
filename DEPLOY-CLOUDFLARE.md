# Deploy LPK Rita ke Cloudflare

Arsitektur di Cloudflare:

| Bagian | Layanan Cloudflare | Isi |
|---|---|---|
| Situs, dashboard, portal belajar, API | **Workers** (+ Static Assets) | `worker/index.js` + folder `public/` |
| Database | **D1** (`lpkrita-db`) | konten situs, akun, kelas, progres, pendaftar |
| Foto & PDF upload | **R2** (`lpkrita-media`) | file dari menu Media di dashboard |

Semua masuk **paket gratis** Cloudflare untuk skala LPK. R2 wajib mengaktifkan billing (kartu),
tapi tetap gratis sampai 10 GB penyimpanan.

> Tabel database & konten awal dibuat **otomatis** saat situs pertama kali dibuka — tidak perlu
> menjalankan migrasi manual.

---

## Yang perlu disiapkan

1. Akun Cloudflare (gratis): https://dash.cloudflare.com/sign-up
2. **R2 diaktifkan**: Dashboard → R2 Object Storage → *Purchase R2 Plan* (paket gratis, perlu kartu).
3. **Node.js 20+** di komputer: https://nodejs.org (pilih LTS).

---

## Deploy (± 10 menit, sekali saja)

Buka terminal di folder proyek ini, lalu jalankan berurutan:

**1. Pasang alat deploy**
```bash
npm install
```

**2. Login ke Cloudflare** (browser akan terbuka, klik *Allow*)
```bash
npx wrangler login
```

**3. Buat database D1**
```bash
npx wrangler d1 create lpkrita-db
```
Terminal akan menampilkan `database_id` seperti `a1b2c3d4-....`. Salin, lalu buka
`wrangler.jsonc` dan ganti `GANTI-DENGAN-DATABASE-ID` dengan id tersebut.

**4. Buat penyimpanan R2**
```bash
npx wrangler r2 bucket create lpkrita-media
```

**5. Atur password superadmin** (ketik password min. 8 karakter saat diminta — tidak tampil di layar)
```bash
npx wrangler secret put ADMIN_PASSWORD
```
Email login default `admin@lpkrita.id` — ubah di `wrangler.jsonc` bagian `ADMIN_EMAIL` bila perlu
(**sebelum** deploy pertama).

> Kalau muncul pertanyaan "Worker belum ada, buat sekarang?" pilih **Yes**.

**6. Deploy!**
```bash
npx wrangler deploy
```
Selesai. Alamat situs muncul di terminal, contoh: `https://lpk-rita-bontang.<akun>.workers.dev`

- Situs: `/`
- Dashboard: `/admin` → login dengan email + password dari langkah 5
- Kelas online: `/belajar`

Segera setelah login pertama, buka **Akun saya** di dashboard untuk mengganti password bila perlu.

---

## Pakai domain sendiri (mis. `lpkritabontang.com`)

1. Tambahkan domain ke Cloudflare (Dashboard → *Add a domain*), ikuti petunjuk ganti nameserver di tempat beli domain.
2. Dashboard → **Workers & Pages** → `lpk-rita-bontang` → **Settings → Domains & Routes → Add → Custom domain** → isi `lpkritabontang.com` (dan/atau `www.lpkritabontang.com`).
3. SSL/HTTPS otomatis aktif.

---

## Update situs setelah ada perubahan kode

```bash
npx wrangler deploy
```
Konten yang diedit dari dashboard (teks, foto, kelas, pendaftar) **tidak hilang** saat deploy ulang —
semuanya tersimpan di D1 & R2.

## Coba di komputer sebelum deploy (opsional)

```bash
npx wrangler dev --var ADMIN_PASSWORD:passwordlokal123
```
Buka http://localhost:8787. Database & upload lokal disimulasikan di folder `.wrangler/`.

## Backup

- **Konten & kelas**: dashboard → *Backup & pemulihan* → Unduh file .json.
- **Seluruh database** (termasuk siswa & pendaftar):
  ```bash
  npx wrangler d1 export lpkrita-db --remote --output backup-lpkrita.sql
  ```
- D1 juga menyimpan riwayat 30 hari (*Time Travel*) — bisa dipulihkan ke titik waktu tertentu:
  `npx wrangler d1 time-travel restore lpkrita-db --timestamp=2026-10-01T10:00:00Z`

## Melihat log / error

```bash
npx wrangler tail
```
atau Dashboard → Workers & Pages → `lpk-rita-bontang` → **Logs**.

## Masalah umum

| Gejala | Solusi |
|---|---|
| `database_id` error saat deploy | Pastikan id di `wrangler.jsonc` sudah diganti (langkah 3). |
| Tidak bisa login admin | Password belum diset → ulangi langkah 5, lalu `npx wrangler deploy`. Akun superadmin dibuat saat situs pertama dibuka setelah password diset. |
| Upload foto gagal | R2 belum aktif / bucket belum dibuat (langkah 4). |
| Lupa password superadmin | Buat admin baru via terminal: jalankan `npx wrangler d1 execute lpkrita-db --remote --command "DELETE FROM users WHERE role='superadmin'"`, set password baru (langkah 5), lalu buka situs — akun superadmin dibuat ulang. |
