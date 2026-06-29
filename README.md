# 🌟 Life Tracker

**Life Tracker** adalah aplikasi asisten pengelola kualitas hidup personal modern yang dirancang untuk membantu pengguna melacak keuangan (*finance*), latihan fisik (*workout*), konsistensi kebiasaan (*habit*), serta target hidup (*goals*) dalam satu dasbor terpadu. Aplikasi ini mendukung sinkronisasi data multi-perangkat secara *real-time* yang aman dan dilengkapi sistem perhitungan indeks kebugaran hidup (*Life Score*) dinamis.

---

## 📖 Deskripsi Proyek

Life Tracker menggabungkan aspek produktivitas, kesehatan, keuangan, dan pencapaian pribadi dalam satu platform berorientasi estetika tinggi. Aplikasi ini beroperasi secara hibrida (*hybrid persistence*), menggunakan **Google Cloud Firestore** untuk sinkronisasi multi-pengguna yang andal, serta sistem penyimpanan lokal cadangan yang tangguh untuk memastikan data Anda selalu aman dan dapat diakses kapan saja.

---

## ✨ Fitur Utama

### 1. 📊 Dasbor Ringkasan & Indeks Kualitas Hidup (*Life Score*)
*   **Dynamic Life Score**: Algoritma cerdas yang menghitung skor kualitas hidup harian (skala 100) berdasarkan kombinasi kinerja keuangan, tingkat kedisiplinan latihan fisik bulanan, kepatuhan habit dalam 7 hari terakhir, dan progres target hidup.
*   **Minggu Ini (Weekly Highlights)**: Ringkasan performa mingguan interaktif yang menunjukkan persentase naik/turunnya aktivitas keuangan, kebiasaan, dan kebugaran beserta rekomendasi tindakan yang dapat diubah sesuai kebutuhan pengguna secara instan.

### 2. 💰 Pengelola Keuangan (*Expense & Saving Tracker*)
*   Pencatatan pemasukan, pengeluaran harian, dan tabungan secara terperinci.
*   Alokasi anggaran bulanan dinamis dengan visualisasi diagram lingkaran (*Pie Chart*) kategori pengeluaran dan grafik garis tren bulanan yang interaktif.

### 3. 🏋️ Rencana Latihan Fisik (*Workout & Fitness Logs*)
*   Pencatatan jenis latihan (Kardio, Angkat Beban, HIIT, Yoga, dll.) lengkap dengan durasi, intensitas, dan estimasi pembakaran energi.
*   Sistem akumulasi XP latihan yang terintegrasi dengan kenaikan level pengguna secara berkala.

### 4. ✅ Pembiasaan Harian (*Habit Tracker*)
*   Pelacak aktivitas harian interaktif dengan sistem penghitungan beruntun (*streak*) harian untuk memicu motivasi berkelanjutan.
*   Riwayat penyelesaian (*habit history*) komprehensif dalam kalender pengerjaan.

### 5. 🎯 Manajemen Target Hidup (*SMART Goals*)
*   Pembuatan target terukur dengan batas waktu pengerjaan dan estimasi tanggal selesai (*estimated completion date*) secara dinamis.
*   Indikator visual progres untuk melacak seberapa dekat pengguna dengan impian mereka.

### 6. 🕒 Garis Waktu Aktivitas (*History Logs*)
*   Arsip catatan aktivitas lengkap tentang perubahan status target, pengeluaran besar, rekor latihan baru, dan prestasi pencapaian secara kronologis.

---

## 🛠️ Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan arsitektur full-stack modern yang sangat efisien dan aman:

### **Frontend (Client-Side)**
*   **React 18+** dengan bundler super cepat **Vite** dan **TypeScript**.
*   **Tailwind CSS**: Desain UI premium berorientasi detail dengan kontras tinggi, menggunakan skema warna modern (*Warm Gold*, *Cosmic Slate*, *Emerald Green*, *Vibrant Blue*).
*   **Framer Motion / Motion**: Animasi transisi halaman dan mikro-interaksi yang halus.
*   **Recharts**: Visualisasi data analitik dan grafik performa yang interaktif.
*   **Lucide React**: Paket ikon vektor modern yang konsisten.

### **Backend (Server-Side)**
*   **Node.js & Express.js** (ditulis dalam TypeScript dengan kompilasi otomatis).
*   **Esbuild & TSX**: Mengompilasi dan menjalankan kode TypeScript sisi server dengan sangat cepat ke dalam satu bundel mandiri (`dist/server.cjs`).
*   **Cryptographic Bearer Token**: Sistem otorisasi sesi stateful yang aman untuk mencegah kebocoran data antar-pengguna.

### **Basis Data & Keamanan**
*   **Google Cloud Firestore**: Sinkronisasi data cloud multi-perangkat real-time berlatensi rendah.
*   **Atomic Swap Local Storage File (`db.json`)**: Penyimpanan lokal cadangan yang melakukan penulisan berkas secara atomik (menggunakan berkas `.tmp` sebelum melakukan *rename*) guna mencegah korupsi data saat sistem terhenti mendadak.

---

## 🚀 Cara Deploy

Aplikasi ini dikonfigurasi untuk siap dideploy langsung ke layanan berbasis kontainer seperti **Google Cloud Run**.

### 📦 Prasyarat Layanan
Pastikan Anda telah mengisi konfigurasi kredensial Firebase di dalam file `firebase-applet-config.json` di root direktori jika ingin mengaktifkan integrasi Cloud Database.

### 1. Jalankan di Lingkungan Pengembangan (Lokal)
Instal dependensi dan jalankan server pengembangan lokal:
```bash
# Menginstal semua paket dependensi
npm install

# Menjalankan server pengembangan (Backend & Frontend Vite)
npm run dev
```
Aplikasi akan dapat diakses secara lokal pada tautan: `http://localhost:3000`

### 2. Membangun Aplikasi untuk Produksi
Gunakan perintah build untuk mengompilasi frontend statis dan bundel backend CJS secara bersamaan:
```bash
npm run build
```
Perintah ini akan menghasilkan:
*   File aset web statis di folder `/dist`
*   Bundel backend server mandiri di file `/dist/server.cjs`

### 3. Menjalankan Aplikasi di Server Produksi
Jalankan file server hasil kompilasi menggunakan Node.js:
```bash
npm run start
```
Server akan berjalan di port `3000` dan siap melayani permintaan publik dengan aman.

---

## 💾 Cara Backup Data

Untuk mengantisipasi kehilangan data dan memastikan kontinuitas layanan, ikuti mekanisme backup berikut:

### 1. Cloud Firestore Backup (Utama)
Firebase mengelola ketahanan data secara otomatis. Anda dapat melakukan ekspor manual database menggunakan perintah Google Cloud SDK berikut:
```bash
gcloud firestore export gs://[NAMA_BUCKET_BACKUP_ANDA]
```

### 2. Standalone Local Database Backup (Cadangan / Offline Mode)
Jika Firebase dinonaktifkan atau berjalan dalam mode luring, semua data disimpan di file `db.json` pada server.
*   **Keamanan Penulisan**: Aplikasi menggunakan mekanisme *Atomic Write* (menulis ke file `.tmp` terlebih dahulu sebelum menimpa `db.json`), sehingga risiko kerusakan file akibat listrik padam atau gangguan jaringan adalah 0%.
*   **Backup Manual**: Cukup salin file `db.json` yang ada di direktori root secara berkala ke penyimpanan aman Anda.

---

## 📂 Struktur Database

Seluruh data pengguna disimpan secara modular.

### 🔒 Format Sesi Pengguna
Setiap pengguna yang berhasil masuk akan menerima token sesi bertipe **HMAC-SHA256 Bearer Token** yang divalidasi di setiap permintaan API.
*   Struktur Header API: `Authorization: Bearer <token>`

### 📑 Skema Data State Pengguna (`AppState`)
Data inti diwakili oleh interface TypeScript berikut di `/src/types.ts`:

```typescript
export interface AppState {
  username: string;
  budget: number;                  // Anggaran bulanan (Rupiah)
  expenses: Record<string, number>; // Kategori pengeluaran: { makanan, transportasi, dll. }
  expenseList: ExpenseItem[];      // Riwayat transaksi pengeluaran rinci
  workouts: Record<string, WorkoutSession>; // Latihan fisik: { "YYYY-MM-DD": WorkoutSession }
  habits: Habit[];                 // Daftar habit yang aktif dipantau
  habitHistory: Record<string, string[]>; // Riwayat harian habit: { "YYYY-MM-DD": [id_habit_selesai] }
  checkedToday: Record<string, boolean>;  // Checklist hari ini: { id_habit: true }
  streak: number;                  // Jumlah hari pengerjaan habit beruntun saat ini
  longestStreak: number;           // Rekor streak pengerjaan habit terlama
  xp: number;                      // Poin pengalaman kebugaran terkumpul
  level: number;                   // Level kebugaran pengguna saat ini
  goals: Goal[];                   // Daftar target hidup SMART
  activityLogs: HistoryLog[];      // Catatan peristiwa sistem & pencapaian kronologis
  expenseHistory: Record<string, MonthlyExpenseSnapshot>; // Rekam jejak bulanan
  weeklyHighlights: WeeklyHighlights; // Statistik visual & saran mingguan di dasbor
}
```

---

## ➕ Cara Menambahkan Fitur Baru

Untuk memperluas kapabilitas aplikasi secara aman tanpa mengganggu kestabilan sistem yang ada, ikuti langkah-langkah berikut:

### Langkah 1: Perbarui Definisi Tipe Data
Jika fitur membutuhkan penyimpanan data baru, deklarasikan interface atau tambahkan properti baru di file `/src/types.ts`.

### Langkah 2: Daftarkan Properti Default pada State Generator
Perbarui fungsi pembuatan state awal pengguna saat mendaftar baru:
*   Sisi Klien: Fungsi `makeDefaultState` di file `/src/utils.ts`.
*   Sisi Server: Fungsi `generateDefaultState` di file `/server.ts`.

### Langkah 3: Tambahkan Komponen UI Baru
Buat komponen UI baru Anda di dalam direktori `/src/components/` (misalnya: `NutritionTab.tsx`). Gunakan pustaka ikon dari `lucide-react` dan komponen visual yang konsisten.

### Langkah 4: Hubungkan Tab Baru di Komponen Utama
Buka file `/src/App.tsx`, daftarkan ID tab baru di tipe `TabId`, dan tambahkan tombol navigasi serta kondisi render komponen baru Anda pada area konten utama.

---

## 🔧 Cara Maintenance

Mekanisme pemeliharaan rutin yang disarankan untuk memastikan aplikasi tetap prima:

1.  **Rotasi Sesi Kunci Rahasia**: Ubah variabel lingkungan `SESSION_SECRET` secara berkala pada setelan deployment untuk membatalkan semua sesi aktif lama secara aman apabila terdeteksi anomali.
2.  **Pemantauan Ruang Penyimpanan**: Pastikan kapasitas disk server mencukupi karena file log riwayat (`db.json` jika menggunakan lokal) akan terus bertambah seiring bertambahnya pengguna.
3.  **Audit Indeks Firebase**: Secara berkala periksa Firebase Console Anda untuk memastikan tidak ada query baru yang terblokir akibat kekurangan indeks komposit yang diperlukan.

---

## 📈 Changelog Versi 1.0

### **Versi 1.0.0 (Rilis Publik Pertama)**
*   **Sistem Sesi Terotentikasi Sempurna**: Mengganti otentikasi berbasis teks biasa menjadi otentikasi aman menggunakan penandatanganan kriptografis HMAC-SHA256 Bearer Token untuk mencegah serangan pembajakan data pengguna lain.
*   **Perhitungan Life Score Dinamis**: Mengintegrasikan algoritma real-time yang memproses data finansial, kebiasaan, olahraga harian, dan sasaran untuk memproyeksikan satu indeks kesehatan hidup terpadu yang dipadukan dengan diagram lingkaran animasi.
*   **Penulisan Database Atomik**: Mengimplementasikan penulisan database lokal secara atomik menggunakan berkas temporer untuk menghilangkan risiko korupsi file basis data (`db.json`) saat listrik server mati atau memori penuh.
*   **Rencana Aksi Mingguan**: Menambahkan antarmuka interaktif baru di menu Overview yang memudahkan pengguna memperbarui laporan ringkasan performa mingguan dan rekomendasi aktivitas secara aman.
*   **Desain Responsif & Aksesibilitas**: Memastikan seluruh kartu dasbor, formulir input, dan grafik analitik memiliki kontras warna tingkat tinggi yang ramah pembaca layar serta navigasi ramah sentuhan di Android, iPhone, tablet, hingga layar ultra-lebar.

---

*Life Tracker didesain dengan dedikasi penuh untuk memberikan pengalaman terbaik dalam perjalanan Anda menuju pribadi yang lebih terorganisir, produktif, dan sehat.* ❤️
