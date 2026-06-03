# Tutorial Instalasi dan Konfigurasi MySQL - SmartBank

Dokumen ini menjelaskan langkah-langkah untuk menginstal MySQL di Windows dan mengonfigurasinya agar dapat digunakan dalam proyek SmartBank.

---

## Langkah 1: Instalasi MySQL

Ada dua cara mudah untuk menginstal MySQL di Windows:

### Pilihan A: Menggunakan XAMPP (Sangat Direkomendasikan & Mudah)
XAMPP adalah paket server lokal yang menyertakan MariaDB (kompatibel penuh dengan MySQL) dan phpMyAdmin untuk mengelola database secara visual.
1. Download XAMPP dari situs resminya: [Apache Friends](https://www.apachefriends.org/index.html).
2. Jalankan installer dan ikuti petunjuk instalasi (biarkan opsi default terpilih).
3. Setelah selesai, buka **XAMPP Control Panel**.
4. Cari baris **MySQL** dan klik tombol **Start**.
5. Pastikan modul MySQL berubah warna menjadi hijau dengan port `3306`.

### Pilihan B: Menggunakan MySQL Installer Resmi
Jika Anda ingin menginstal MySQL murni tanpa Apache/PHP:
1. Download MySQL Installer dari [MySQL Community Downloads](https://dev.mysql.com/downloads/installer/).
2. Pilih versi **Web Community Installer** (ukuran file lebih kecil).
3. Jalankan installer, pilih tipe setup **Developer Default** atau **Server Only**.
4. Pada bagian konfigurasi, tentukan password untuk user `root` (ingat baik-baik password ini!).
5. Selesaikan instalasi, MySQL otomatis akan berjalan sebagai Windows Service.

---

## Langkah 2: Membuat Database Baru

Setelah MySQL berjalan, Anda harus membuat database bernama `smartbank`.

### Menggunakan phpMyAdmin (Jika menggunakan XAMPP)
1. Buka browser dan akses [http://localhost/phpmyadmin](http://localhost/phpmyadmin).
2. Klik tab **Databases** di bagian atas.
3. Di kolom **Create database**, masukkan nama: `smartbank`.
4. Klik tombol **Create**.

### Menggunakan Command Prompt (CMD)
1. Buka Command Prompt.
2. Hubungkan ke MySQL dengan perintah:
   ```bash
   mysql -u root -p
   ```
   *(Tekan **Enter** jika menggunakan XAMPP tanpa password. Jika menggunakan MySQL Installer, masukkan password root Anda).*
3. Jalankan perintah SQL berikut:
   ```sql
   CREATE DATABASE smartbank;
   ```
4. Ketik `exit` untuk keluar dari MySQL CLI.

---

## Langkah 3: Konfigurasi File `.env` di Backend

Buat file baru bernama `.env` di dalam folder `backend/` (`d:\smartbank\smartbank\backend\.env`) dan masukkan URL koneksi database Anda:

### Untuk XAMPP (Default tanpa password):
```env
DATABASE_URL="mysql://root:@localhost:3306/smartbank"
PORT=3000
```

### Untuk MySQL Installer (Dengan password):
```env
DATABASE_URL="mysql://root:PASSWORD_ANDA@localhost:3306/smartbank"
PORT=3000
```
*(Ganti `PASSWORD_ANDA` dengan password yang Anda buat saat instalasi MySQL).*

---

## Langkah 4: Sinkronisasi Skema & Seeding

Setelah database terbuat dan file `.env` dikonfigurasi, jalankan perintah berikut di terminal (di folder `d:\smartbank\smartbank\backend`):

1. **Unduh dependency & buat client Prisma:**
   ```bash
   npm install
   ```
2. **Push skema database ke MySQL:**
   ```bash
   npx prisma db push
   ```
3. **Jalankan script Seeder untuk mengisi data awal:**
   ```bash
   npx ts-node prisma/seed.ts
   ```

Selesai! Database MySQL Anda sekarang siap digunakan untuk menjalankan backend SmartBank.
