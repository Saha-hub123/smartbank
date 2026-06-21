# LAPORAN IMPLEMENTASI MODUL TELLER
## SmartBank (Core Banking System) — Tugas Besar RPL 2

**Identitas Mahasiswa:**
*   **Nama:** Mohammad Isa Widianto
*   **NPM:** 714240013
*   **Kelas:** 2A
*   **Mata Kuliah:** Rekayasa Perangkat Lunak 2 (RPL 2)
*   **Dosen Pengampu:** M. Yusril Helmi Setyawan, S.Kom., M.Kom.

---

## 1. Deskripsi Modul Teller
Modul **Teller Workspace** pada aplikasi **SmartBank** dirancang khusus untuk memfasilitasi transaksi langsung (*Walk-in*) nasabah di kantor cabang fisik. Sebagai salah satu dari tiga aktor utama di ekosistem SmartBank, Teller memiliki tanggung jawab krusial untuk menjembatani dunia fisik (uang tunai) dengan sistem digital *closed-loop* SmartBank.

Modul ini dikembangkan dengan pendekatan **Single Page Application (SPA)** menggunakan Vanilla JS, CSS Glassmorphism modern, dan backend berbasis Node.js/Express dengan database MySQL via Prisma ORM.

---

## 2. Fitur Utama & Antarmuka Modul Teller

Modul Teller memiliki 4 sub-view utama yang diakses secara dinamis melalui sidebar navigasi:

1.  **Workspace (Dashboard Utama)**
    *   **Pencarian Cepat Nasabah:** Kotak input terpadu untuk mencari data nasabah berdasarkan *ID User* atau *Nomor Rekening* secara real-time.
    *   **Kartu Statistik Ringkasan Shift:**
        *   *Total Transaksi:* Jumlah transaksi yang ditangani selama shift berjalan.
        *   *Setoran Diterima (In):* Akumulasi nominal setoran tunai nasabah.
        *   *Penarikan (Out):* Akumulasi penarikan tunai dan transfer keluar.
    *   **Tabel Antrean Terakhir:** Menampilkan 10 transaksi teratas yang ditangani oleh Teller dengan visualisasi status sukses.
2.  **Layanan Nasabah (Setor & Tarik)**
    *   Muncul secara otomatis setelah nasabah berhasil ditemukan pada pencarian Workspace.
    *   Menampilkan profil nasabah (*Nama*, *ID*, *Nomor Rekening*) beserta *Saldo Tersedia*.
    *   **Form Setor Tunai (Deposit):** Menambahkan saldo digital nasabah dengan memindahkan dana dari *Reserve* ke *Circulating*.
    *   **Form Tarik Tunai (Withdraw):** Mengurangi saldo digital nasabah dengan mengembalikannya ke *Reserve* bank, dilengkapi dengan kalkulasi nominal pecahan uang fisik.
3.  **Transfer Dana**
    *   Form bantuan untuk memproses transfer antar nasabah secara offline.
    *   Membutuhkan *ID Pengirim*, *ID Penerima*, *Jumlah Transfer*, dan *PIN Otorisasi Pengirim*.
4.  **Riwayat Teller**
    *   Menampilkan seluruh daftar transaksi yang diproses khusus oleh unit Teller Pusat secara historis.
    *   Terdapat tombol interaktif untuk *Unduh Laporan*.

---

## 3. Penerapan Algoritma Ilmu Komputer

Modul Teller mengimplementasikan dua algoritma penting untuk mendukung efisiensi operasional perbankan:

### A. Algoritma Greedy (Pecahan Denominasi Uang Tunai)
*   **Lokasi Kode:** Fungsi `calculateDenominations(amount)` pada `smartbank/teller/script.js` dan integrasi UI pada fungsi `handleWithdraw(e)` di `smartbank/teller/script.js`.
*   **Tujuan:** Membantu Teller menentukan jumlah lembaran uang kertas fisik terkecil/paling sedikit yang harus diserahkan kepada nasabah saat melakukan tarik tunai.
*   **Cara Kerja:** Algoritma mengambil keputusan optimal lokal pada setiap langkah dengan membagi nominal penarikan dengan pecahan mata uang terbesar yang tersedia terlebih dahulu secara berurutan: Rp 100.000, Rp 50.000, Rp 20.000, Rp 10.000, Rp 5.000, Rp 2.000, dan Rp 1.000. Sisa nilai di bawah Rp 1.000 akan dilaporkan sebagai koin/uang logam.
*   **Visualisasi UI:** Rincian pecahan ini dimunculkan pada modal popup bergaya *glassmorphism* interaktif (`index.html`) sesaat setelah proses penarikan sukses di backend.

```javascript
function calculateDenominations(amount) {
    const denominations = [100000, 50000, 20000, 10000, 5000, 2000, 1000];
    const result = {};

    for (let coin of denominations) {
        if (amount >= coin) {
            const count = Math.floor(amount / coin);
            result[coin] = count;
            amount = amount % coin;
        }
    }
    if (amount > 0) result['sisa'] = amount;
    return result;
}
```

### B. Algoritma Merge Sort (Divide & Conquer)
*   **Lokasi Kode:** Fungsi `mergeSortTransactions(arr)` dan `merge(left, right)` pada `smartbank/teller/script.js`.
*   **Tujuan:** Mengurutkan riwayat transaksi Teller secara *stable* berdasarkan stempel waktu (`createdAt`) dari yang terbaru ke terlama (Descending) sebelum dirender ke tabel riwayat.
*   **Cara Kerja:** Membagi array transaksi secara rekursif menjadi bagian-bagian kecil (*divide*), kemudian menggabungkannya kembali secara terurut (*conquer*). Ini menjamin performa pengurutan tetap stabil pada kompleksitas waktu $O(n \log n)$ terlepas dari kondisi awal data.

```javascript
function mergeSortTransactions(arr) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);
    return merge(mergeSortTransactions(left), mergeSortTransactions(right));
}
```

---

## 4. Alur Kerja Finansial & Integrasi Database (Backend)

Seluruh request dari frontend dikomunikasikan ke REST API backend yang didefinisikan pada `backend/src/routes/tellerRoutes.ts`. Backend mengimplementasikan aturan finansial yang ketat:

### A. Validasi Keras Reserve 98% (Anti-Inflasi)
Sesuai aturan moneter SmartBank, cadangan bank (*Reserve*) tidak boleh jatuh di bawah 98% dari *Total Supply*.
*   Saat nasabah melakukan **Setor Tunai (Deposit)**, bank akan mencetak uang digital baru dengan memindahkan dana dari `reserve` ke `circulating` nasabah.
*   Sebelum transaksi diproses, sistem memvalidasi:
    $$\text{Reserve Baru} \ge \text{Total Supply} \times 0.98$$
*   Jika setoran tersebut menyebabkan reserve jatuh di bawah batas 98% tersebut, transaksi otomatis ditolak dengan pesan error demi mencegah terjadinya inflasi berlebih di ekosistem.

### B. ACID Compliance dengan Prisma Transaction
Untuk menjaga konsistensi buku besar (*Ledger*) dan mencegah *race conditions* atau data tidak seimbang, seluruh operasi mutasi saldo di backend dibungkus dalam blok `$transaction` Prisma.
Jika salah satu dari langkah berikut gagal, seluruh operasi dibatalkan (*rolled back*):
1.  Mengurangi/menambah saldo nasabah (`User` table).
2.  Mengurangi/menambah status moneter bank (`SystemState` table untuk `reserve` dan `circulating`).
3.  Memasukkan entri riwayat mutasi baru ke tabel ledger (`Transaction` table).

---

## 5. Dokumentasi API Contracts (Teller Endpoints)

| Method | Endpoint | Deskripsi | Parameter Input (JSON Body / Path) | Struktur Respons Sukses (JSON) |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/api/teller/users/:id` | Mencari data nasabah berdasarkan ID atau Rekening | `id` (Path Parameter) | `{ id, name, type, balance, status }` |
| **POST** | `/api/teller/deposit` | Proses setor tunai nasabah | `{ userId, amount }` | `{ message, data: { state, user, transaction } }` |
| **POST** | `/api/teller/withdraw` | Proses tarik tunai nasabah | `{ userId, amount }` | `{ message, data: { state, user, transaction } }` |
| **POST** | `/api/teller/transfer` | Bantu transfer dana antar-rekening | `{ senderId, receiverId, amount }` | `{ message, data: { transaction } }` |
| **GET** | `/api/teller/transactions` | Mendapatkan riwayat transaksi Teller | *None* | Array dari objek `Transaction` |
| **GET** | `/api/teller/dashboard` | Statistik shift berjalan & 10 antrean teratas | *None* | `{ stats: { totalTransactions, totalIn, totalOut }, recentQueue }` |

---

## 6. Skenario Pengujian (Test Cases)

### Test Case 1: Pencarian Nasabah Walk-In
*   **Skenario:** Input ID nasabah valid (misal: `USR-1029`) pada kotak pencarian lalu klik "Cari Nasabah".
*   **Langkah Proses:** API `GET /api/teller/users/USR-1029` dipanggil $\rightarrow$ Data ditemukan $\rightarrow$ Halaman berpindah ke tab "Layanan Nasabah" $\rightarrow$ UI memperbarui Nama Nasabah, ID, dan Saldo Terkini.
*   **Hasil Diharapkan:** Transisi halaman mulus tanpa reload, data profil nasabah tampil presisi di layar.

### Test Case 2: Penarikan Tunai & Pemecahan Uang (Greedy)
*   **Skenario:** Lakukan penarikan tunai sebesar Rp 378.000 dari saldo nasabah.
*   **Langkah Proses:** API `POST /api/teller/withdraw` sukses $\rightarrow$ Frontend memanggil `calculateDenominations(378000)` $\rightarrow$ Modal Denominasi muncul.
*   **Hasil Diharapkan:** Modal menampilkan rincian pecahan fisik:
    *   Rp 100.000: 3 Lembar
    *   Rp 50.000: 1 Lembar
    *   Rp 20.000: 1 Lembar
    *   Rp 5.000: 1 Lembar
    *   Rp 2.000: 1 Lembar
    *   Rp 1.000: 1 Lembar
    *   Sisa Koin: Rp 0

### Test Case 3: Setor Tunai Melanggar Batas Reserve 98%
*   **Skenario:** Mencoba melakukan setoran bernominal sangat besar yang akan menurunkan reserve bank di bawah batas minimal (Reserve < 98% Total Supply).
*   **Langkah Proses:** API `POST /api/teller/deposit` dikirim $\rightarrow$ Validasi backend mendeteksi pelanggaran aturan moneter $\rightarrow$ Transaction rollback dijalankan $\rightarrow$ Mengembalikan error status 400.
*   **Hasil Diharapkan:** Transaksi dibatalkan, saldo nasabah tidak bertambah, database tetap konsisten, dan muncul alert di UI: *"Validasi Keras Gagal: Setoran ini akan membuat Reserve jatuh di bawah 98% dari Total Supply. Transaksi ditolak."*

### Test Case 4: Pengurutan Riwayat (Merge Sort)
*   **Skenario:** Buka tab "Riwayat Teller" untuk melihat daftar transaksi.
*   **Langkah Proses:** API `GET /api/teller/transactions` mengambil data dari database $\rightarrow$ Frontend menjalankan `mergeSortTransactions(transactions)` $\rightarrow$ Tabel dirender.
*   **Hasil Diharapkan:** Transaksi terurut secara descending berdasarkan timestamp, transaksi terbaru selalu berada paling atas dengan kompleksitas stabil $O(n \log n)$.

---

*Laporan ini disusun secara komprehensif sebagai dokumentasi resmi hasil pengerjaan Tugas Besar mata kuliah Rekayasa Perangkat Lunak 2.*
