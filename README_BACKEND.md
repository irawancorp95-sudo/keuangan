# PSAK35 Full-Stack (Frontend + Backend MySQL)

Aplikasi lengkap untuk sistem keuangan entitas nonlaba sesuai PSAK 35, dengan frontend HTML/CSS/JS dan backend Node.js + MySQL.

## Struktur Proyek

```
psak35/
├── public/           # Frontend files (HTML, CSS, JS)
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js         # Backend server
├── package.json      # Dependencies
├── .env.example      # Environment variables
├── mysql-schema.sql  # Database schema
└── README_BACKEND.md # This file
```

## Persyaratan

- Node.js 18+ / 20+
- MySQL server

## Instalasi

1. Clone atau download proyek ini.
2. Install dependencies:

```bash
npm install
```

3. Salin file `.env.example` menjadi `.env`.
4. Isi konfigurasi database di `.env`:
   - `DB_HOST=localhost`
   - `DB_USER=root`
   - `DB_PASSWORD=`
   - `DB_NAME=psak35`
   - `JWT_SECRET=change_this_secret`
   - `PORT=3000`

5. Buat database MySQL:
   - Jalankan `mysql-schema.sql` di MySQL client, atau
   - Server akan otomatis membuat tabel saat pertama kali dijalankan.

## Menjalankan Aplikasi

```bash
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

## Fitur

### Frontend
- Dashboard dengan grafik keuangan
- Input jurnal umum dengan auto-numbering
- Laporan keuangan (Posisi Keuangan, Penghasilan Komprehensif, dll.)
- Manajemen pengguna dan akun
- Identitas entitas dengan logo
- Export laporan ke Excel
- Print receipt jurnal

### Backend
- API REST dengan autentikasi JWT
- Database MySQL untuk penyimpanan data
- Endpoint untuk:
  - Login dan manajemen user
  - CRUD jurnal dan saldo awal
  - CRUD chart of accounts
  - Laporan keuangan
  - Identitas entitas

## Endpoint API

- `POST /api/login` - Login
- `GET /api/me` - Info user saat ini
- `GET /api/identity` - Ambil identitas entitas
- `PUT /api/identity` - Update identitas
- `GET /api/users` - List users
- `POST /api/users` - Tambah user
- `PUT /api/users/:id/password` - Reset password
- `DELETE /api/users/:id` - Hapus user
- `GET /api/coa` - List chart of accounts
- `POST /api/coa` - Tambah akun
- `DELETE /api/coa/:id` - Hapus akun
- `GET /api/journals` - List jurnal
- `POST /api/journals` - Simpan jurnal
- `GET /api/reports/bukubesar` - Laporan buku besar
- `GET /api/ping` - Health check

## Hosting

Untuk hosting, upload seluruh folder proyek ke server yang mendukung Node.js (misalnya Heroku, DigitalOcean, VPS).

Pastikan:
- Environment variables di-set di hosting
- MySQL database tersedia
- Port sesuai dengan konfigurasi hosting

## Catatan

- Server otomatis membuat tabel dan data awal saat dijalankan.
- Frontend dan backend di-serve dari port yang sama.
- Data disimpan di MySQL, bukan localStorage.
- Autentikasi menggunakan JWT dengan masa berlaku 8 jam.
