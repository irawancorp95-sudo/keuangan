# Deploy ke Vercel

## Prasyarat

1. Akun Vercel (gratis di https://vercel.com)
2. Repository di GitHub (sudah ada)
3. Database MySQL (PlanetScale, AWS RDS, atau provider lain)

## Langkah 1: Setup Database MySQL (PlanetScale)

**PlanetScale** adalah MySQL cloud gratis yang kompatibel:

1. Buka https://planetscale.com
2. Sign up dengan GitHub account
3. Buat database baru: `psak35`
4. Buat branch `main`
5. Get connection string dari "Connect" > "Node.js"
   - Copy URL-nya, format:
   ```
   mysql://user:password@host/database?ssl={"rejectUnauthorized":true}
   ```
6. Jalankan schema di PlanetScale:
   - Gunakan MySQL client atau PlanetScale console
   - Jalankan `mysql-schema.sql`

## Langkah 2: Deploy ke Vercel

### Opsi A: Via Dashboard (Paling Mudah)

1. **Buka https://vercel.com/dashboard**
2. **Klik "New Project"**
3. **Import GitHub Repository**
   - Pilih: `irawancorp95-sudo/keuangan`
4. **Configure Project**
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: `npm install`
   - Output Directory: (kosongkan)
5. **Environment Variables**
   - Tambahkan:
   ```
   DB_HOST=your-planetscale-host.mysql.databases.cloud
   DB_USER=your-username
   DB_PASSWORD=your-password
   DB_NAME=psak35
   JWT_SECRET=your-secret-key-yang-panjang-dan-random
   PORT=3000
   ```
6. **Deploy**
   - Klik "Deploy"
   - Tunggu ~2-3 menit
   - Dapatkan URL seperti: `https://keuangan.vercel.app`

### Opsi B: Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login ke Vercel
vercel login

# Deploy
cd /Users/mac/Documents/psak35
vercel

# Set environment variables
vercel env add DB_HOST
vercel env add DB_USER
vercel env add DB_PASSWORD
vercel env add DB_NAME
vercel env add JWT_SECRET

# Deploy production
vercel --prod
```

## Langkah 3: Testing

Setelah deploy berhasil:

1. Buka aplikasi: `https://keuangan.vercel.app`
2. Login dengan:
   - Username: `admin`
   - Password: `admin123`
3. Test fitur:
   - Input jurnal
   - View laporan
   - Manage users

## Troubleshooting

### Error "database connection failed"
- Pastikan environment variables sudah benar di Vercel
- Cek connection string PlanetScale
- Pastikan database sudah di-import dengan schema

### Error "PORT env not set"
- Tambahkan `PORT=3000` di environment variables

### Error "node modules not found"
- Pastikan `package.json` ada di root folder
- Vercel akan otomatis run `npm install`

## Logs & Monitoring

- Buka Vercel Dashboard
- Pilih project `keuangan`
- Tab "Logs" untuk melihat real-time logs
- Tab "Analytics" untuk monitoring

## Custom Domain (Opsional)

1. Di Vercel Dashboard > Settings > Domains
2. Tambahkan custom domain Anda
3. Update DNS records sesuai instruksi Vercel

## Next Steps

- Setup CI/CD untuk auto-deploy setiap push ke GitHub
- Backup database PlanetScale secara berkala
- Setup monitoring dan alerts
- Custom branding dan domain

## Alternatif Database

Jika tidak ingin PlanetScale, bisa gunakan:
- **AWS RDS**: MySQL managed database
- **Railway**: Full-stack platform dengan MySQL built-in
- **Render**: MySQL + Node.js hosting
- **DigitalOcean**: VPS dengan MySQL

## Dukungan

Jika ada error saat deploy:
1. Cek Vercel Logs di dashboard
2. Verifikasi environment variables
3. Cek connection string database
4. Pastikan schema sudah di-import
