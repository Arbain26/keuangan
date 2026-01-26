# FinTrack - Personal Finance Management

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![React](https://img.shields.io/badge/React-19.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)

**FinTrack** adalah aplikasi manajemen keuangan pribadi yang dirancang untuk transparansi dan kemudahan pengelolaan arus kas. Aplikasi ini terdiri dari dashboard publik untuk melihat ringkasan keuangan dan dashboard admin yang aman untuk mengelola data transaksi.

## 🌟 Fitur Utama

### 📊 Public Dashboard (Halaman Publik)
- **Ringkasan Real-time**: Menampilkan total pemasukan dan pengeluaran Mingguan, Bulanan, dan Tahunan.
- **Visualisasi Data**: Grafik batang interaktif untuk membandingkan arus kas bulanan.
- **Riwayat Transaksi**: Daftar 10 transaksi terakhir yang tercatat.
- **Transparansi**: Dapat diakses oleh siapa saja tanpa login untuk tujuan transparansi (misal: bendahara organisasi).

### 🛡️ Admin Dashboard (Halaman Admin)
- **Autentikasi Aman**: Login berbasis email menggunakan Supabase Auth.
- **CRUD Transaksi**: Tambah, Edit, dan Hapus data pemasukan/pengeluaran dengan mudah.
- **Pencarian Real-time**: Filter transaksi berdasarkan kategori atau catatan.
- **Manajemen Profil**: Update nama dan password admin.
- **Keamanan Data**: Dilindungi dengan Row Level Security (RLS) di database.

## 🛠️ Tech Stack

- **Frontend**: 
  - [React](https://react.dev/) (Vite)
  - [Tailwind CSS](https://tailwindcss.com/) (Styling)
  - [Chart.js](https://www.chartjs.org/) (Visualisasi)
  - [Lucide React](https://lucide.dev/) (Ikon)
- **Backend & Database**:
  - [Supabase](https://supabase.com/) (PostgreSQL Database, Auth, Realtime)

## 🚀 Instalasi & Jalankan Lokal

Ikuti langkah-langkah ini untuk menjalankan proyek di komputer Anda.

### Prasyarat
- Node.js (v16 atau lebih baru)
- NPM atau Yarn
- Akun Supabase (untuk database)

### Langkah-langkah

1. **Clone Repository**
   ```bash
   git clone https://github.com/Arbain26/keuangan.git
   cd keuangan
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables**
   Buat file `.env` di root direktori proyek, lalu salin isi dari `.env.example` atau tambahkan konfigurasi berikut:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   *Dapatkan URL dan Key dari dashboard project Supabase Anda.*

4. **Setup Database**
   Jalankan query SQL yang ada di file `supabase_schema.sql` pada SQL Editor di dashboard Supabase Anda untuk membuat tabel dan kebijakan keamanan (RLS).

5. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```
   Buka `http://localhost:5173` di browser Anda.

## 📂 Struktur Proyek

```
keuangan/
├── public/              # Aset statis
├── src/
│   ├── assets/          # Gambar/aset lokal
│   ├── components/      # Komponen UI reusable (Button, ProtectedRoute, dll)
│   ├── lib/             # Konfigurasi klien (supabaseClient.js, api.js)
│   ├── pages/           # Halaman utama (PublicDashboard, AdminDashboard, AdminLogin)
│   ├── utils/           # Fungsi helper (format currency, date)
│   ├── App.jsx          # Routing utama
│   └── main.jsx         # Entry point
├── supabase_schema.sql  # Skema database SQL
└── ...
```

## 🔒 Keamanan (Row Level Security)

Database dikonfigurasi menggunakan PostgreSQL Row Level Security (RLS) untuk memastikan keamanan data:
- **Public Read**: Siapapun dapat membaca data transaksi (`SELECT`).
- **Admin Write**: Hanya pengguna yang login (authenticated) yang dapat menambah, mengubah, atau menghapus data.

## 📝 Lisensi

Proyek ini dibuat untuk tujuan pembelajaran dan manajemen keuangan pribadi.

---

Dibuat dengan ❤️ oleh [Arbain26](https://github.com/Arbain26)
