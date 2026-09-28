# LPK Rita Bontang — Website, Dashboard & Kelas Online

Jalan di **Cloudflare Workers (D1 + R2)** untuk produksi, atau Node.js 22.13+ (SQLite bawaan) untuk lokal/VPS — tanpa dependency runtime.

| Alamat | Isi |
|---|---|
| `/` | Landing page (dirender server, SEO-friendly, responsif) |
| `/admin` | Dashboard superadmin: edit semua konten, tema, pendaftar, kelas, pengguna, media, backup |
| `/belajar` | Portal belajar siswa (LMS): materi, video, kuis interaktif, XP, streak, lencana, sertifikat |
| `/sertifikat` | Cek keaslian sertifikat (publik) |

## Menjalankan

```bash
npm start          # produksi
npm run dev        # auto-restart saat file berubah
```

Buka http://localhost:3000. Saat pertama kali jalan, akun superadmin dibuat otomatis dan
kredensialnya ditulis ke `data/admin-credentials.txt`. Masuk ke `/admin`, ganti kata sandi di menu
**Akun saya**, lalu hapus file tersebut. Bisa juga menentukan sendiri lewat `ADMIN_EMAIL` dan
`ADMIN_PASSWORD` (lihat `.env.example`) sebelum run pertama.

## Struktur

```
server/
  app.js          Inti aplikasi (routing, API auth/LMS/admin) — Web standard, tanpa ketergantungan platform
  node.js         Entry Node.js: SQLite bawaan Node + folder upload + file statis
  schema.js       Skema database (dipakai Node & Cloudflare D1)
  crypto.js       Hash password PBKDF2 (Web Crypto)
  seed.js         Konten awal situs & contoh kelas  <- data dari situs Wix + company profile
  render.js       Render HTML landing page dari konten
  certificate.js  Halaman sertifikat & verifikasi
worker/index.js   Entry Cloudflare Workers (D1 + R2)
wrangler.jsonc    Konfigurasi Cloudflare
public/           File statis: CSS/JS landing, dashboard (/admin), portal belajar (/belajar), foto
data/             (lokal) database & upload — dibuat otomatis, jangan di-commit
```

## Apa yang bisa diatur dari dashboard

- **Konten halaman** — 13 bagian (hero, program, galeri, testimoni, FAQ, dst). Tiap bagian bisa
  diubah isinya, disembunyikan, dan diurutkan ulang. Ada **pratinjau langsung** (desktop/ponsel)
  sebelum disimpan. Tulis `*kata*` pada judul untuk huruf miring berwarna aksen.
- **Tampilan & tema** — warna (ada 5 palet siap pakai), jenis huruf, kelengkungan sudut.
- **Identitas & SEO** — nama, logo, kontak, WhatsApp, media sosial, judul & deskripsi Google.
- **Pendaftar** — data dari formulir landing page; status (baru/dihubungi/terdaftar/batal),
  catatan, tombol chat WhatsApp, ekspor CSV.
- **Kelas & materi** — buat kelas, bab, materi bacaan (format markdown sederhana), video YouTube,
  dan kuis pilihan ganda dengan pembahasan. Akses kelas: terbuka atau perlu persetujuan.
- **Peserta kelas** — setujui permintaan, pantau progres, lihat sertifikat.
- **Pengguna** — siswa/admin/superadmin, reset kata sandi, nonaktifkan akun.
- **Media** — unggah foto (dikompres otomatis) & PDF.
- **Backup** — unduh/pulihkan konten situs & kelas dalam JSON.

Peran: **superadmin** mengelola semuanya termasuk admin lain & backup; **admin** mengelola konten,
pendaftar, dan kelas; **siswa** hanya portal belajar.

## Deploy

- **Cloudflare (disarankan)** — Workers + D1 + R2, gratis untuk skala LPK. Panduan langkah demi langkah:
  **[DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md)**.
- **VPS / hosting Node.js** — `NODE_ENV=production PORT=3000 DATA_DIR=/var/lib/lpkrita npm start`,
  pasang di belakang Nginx/Caddy dengan HTTPS. Folder `DATA_DIR` harus persisten & ikut dibackup.

## Catatan data

- Foto dokumentasi diambil dari *Company Profile LPK RITA.pdf*; logo & logo mitra dari situs Wix lama.
- Halaman legalitas di company profile (KTP, NPWP pengurus) **sengaja tidak dipakai** di situs.
- Testimoni masih contoh (tanpa nama asli) — ganti dengan testimoni alumni sungguhan dari dashboard.
- Materi video pada kelas contoh masih kosong — tempel tautan YouTube milik LPK Rita dari dashboard.
