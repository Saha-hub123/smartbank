// Initial default data from the latest system state.
// This avoids CORS issues when running via file:///
const defaultData = [
  { Role: "Admin Bank", Feature: "Antarmuka (UI/UX) Dashboard", Status: "Selesai", Description: "Dashboard Admin dengan desain responsif dan visualisasi data finansial" },
  { Role: "Admin Bank", Feature: "Integrasi Backend", Status: "Selesai", Description: "Skrip frontend terhubung API Node.js dan Prisma ORM" },
  { Role: "Admin Bank", Feature: "Manajemen Saldo (F-01)", Status: "Selesai", Description: "Menampilkan data nasabah tipe akun status dan nominal saldo" },
  { Role: "Admin Bank", Feature: "Validasi Pinjaman (F-04)", Status: "Selesai", Description: "Penyetujuan atau penolakan pengajuan kredit via API" },
  { Role: "Admin Bank", Feature: "Distribusi Dana (F-06)", Status: "Selesai", Description: "Pemindahan dana legal dari bank Reserve ke sirkulasi ekosistem" },
  { Role: "Admin Bank", Feature: "Tarik Biaya Layanan (F-07)", Status: "Selesai", Description: "Trigger manual penarikan fee admin dari sirkulasi" },
  { Role: "Admin Bank", Feature: "Buku Besar / Ledger (F-08)", Status: "Selesai", Description: "Tabel Ledger memonitor riwayat transaksi SSOT real-time" },
  { Role: "Teller Bank", Feature: "Antarmuka (UI/UX) Workspace", Status: "Selesai", Description: "Workspace operasional memiliki pencarian nasabah" },
  { Role: "Teller Bank", Feature: "Integrasi Backend", Status: "Selesai", Description: "Logika endpoint API ke antarmuka Teller telah terhubung sepenuhnya" },
  { Role: "Teller Bank", Feature: "Setor & Tarik Tunai (F-05)", Status: "Selesai", Description: "Formulir eksekusi terhubung secara langsung ke server melalui API" },
  { Role: "Teller Bank", Feature: "Transfer Antar User (F-02)", Status: "Selesai", Description: "Pemindahan dana terverifikasi menggunakan backend API" },
  { Role: "Nasabah Ritel", Feature: "Antarmuka (UI/UX) Mobile-first", Status: "Selesai", Description: "Dioptimalkan ukuran HP dengan efek glassmorphism" },
  { Role: "Nasabah Ritel", Feature: "Integrasi Backend", Status: "Selesai", Description: "Sistem JWT Authentication dan data fetch API telah diimplementasi" },
  { Role: "Nasabah Ritel", Feature: "Informasi Saldo (F-01)", Status: "Selesai", Description: "UI menampilkan data saldo akurat langsung dari server" },
  { Role: "Nasabah Ritel", Feature: "Transfer Antar User (F-02)", Status: "Selesai", Description: "Fungsionalitas transfer sukses terkoneksi ke API internal" },
  { Role: "Nasabah Ritel", Feature: "Pengajuan Pinjaman (F-04)", Status: "Selesai", Description: "Formulir pinjaman otomatis mengirim request ke Dashboard Admin" },
  { Role: "Sistem & Infrastruktur", Feature: "Arsitektur RDBMS", Status: "Selesai", Description: "Konfigurasi ORM Prisma sudah diterapkan" },
  { Role: "Sistem & Infrastruktur", Feature: "Business Logic", Status: "Selesai", Description: "API Node.js untuk Dashboard User Loan dan Transaksi" },
  { Role: "Sistem & Infrastruktur", Feature: "Pembayaran Transaksi API (F-03)", Status: "Berjalan", Description: "Logika webhook dan validasi untuk entitas luar dipersiapkan" },
  { Role: "Kepatuhan Aturan", Feature: "Pola Input-Proses-Output (IPO)", Status: "Selesai", Description: "Setiap fitur API memiliki alur IPO yang eksplisit" },
  { Role: "Kepatuhan Aturan", Feature: "Keamanan Autentikasi (JWT)", Status: "Selesai", Description: "Mekanisme otorisasi ketat telah diterapkan antar modul" },
  { Role: "Kepatuhan Aturan", Feature: "Pencatatan Log & Ledger", Status: "Selesai", Description: "Aktivitas transaksi dan error terekam kuat di database" },
  { Role: "Kepatuhan Aturan", Feature: "Komunikasi API Gateway Eksternal", Status: "Tertunda", Description: "Sistem belum diintegrasikan dengan gerbang jaringan luar" },
  { Role: "Kepatuhan Aturan", Feature: "Fee Bank (1%) & Pajak (2%)", Status: "Selesai", Description: "Pemotongan otomatis pada fitur transfer telah presisi" },
  { Role: "Kepatuhan Aturan", Feature: "Limit Pinjaman & Bunga 10%", Status: "Selesai", Description: "Maksimal peminjaman 100k dan skema beban telah disetel" },
  { Role: "Kepatuhan Aturan", Feature: "Kontrol Money Supply Maksimal", Status: "Selesai", Description: "Sistem SSOT mengelola Supply Reserve dan Circulating" },
  { Role: "Kepatuhan Aturan", Feature: "Limit Reserve Bank 98%", Status: "Selesai", Description: "Sistem telah menerapkan validasi keras (blocking) saat memproses transaksi yang berisiko menyentuh threshold 98%" },
  { Role: "Dokumentasi", Feature: "Dokumen Desain Sistem", Status: "Selesai", Description: "PRD dan DOKUMENTASI teknis (arsitektur & use case) telah terbit" },
  { Role: "Dokumentasi", Feature: "Skenario Demo Integrasi", Status: "Tertunda", Description: "Demo end-to-end menunggu API eksternal tersambung" }
];

let appData = [];
const STORAGE_KEY = 'smartbank_board_v1';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupFileInput();
});

// Load Data
function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        appData = JSON.parse(saved);
    } else {
        // Deep copy default data if no local storage
        appData = JSON.parse(JSON.stringify(defaultData));
        saveData();
    }
    renderBoard();
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
}

// Render Kanban Board
function renderBoard() {
    const pendingList = document.getElementById('list-pending');
    const completedList = document.getElementById('list-completed');
    
    pendingList.innerHTML = '';
    completedList.innerHTML = '';
    
    let pendingCount = 0;
    let completedCount = 0;

    appData.forEach((task, index) => {
        const isCompleted = task.Status === 'Selesai';
        if (isCompleted) completedCount++;
        else pendingCount++;

        const card = document.createElement('div');
        card.className = `task-card ${isCompleted ? 'completed' : ''}`;
        
        card.innerHTML = `
            <div class="task-checkbox-wrapper">
                <input type="checkbox" class="task-checkbox" 
                    ${isCompleted ? 'checked' : ''} 
                    onchange="toggleTaskStatus(${index}, this.checked)">
            </div>
            <div class="task-content">
                <div class="task-role">${task.Role}</div>
                <div class="task-title">${task.Feature}</div>
                <div class="task-desc">${task.Description}</div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" onclick="openEditModal(${index})" title="Edit Tugas">✏️</button>
            </div>
        `;

        if (isCompleted) {
            completedList.appendChild(card);
        } else {
            pendingList.appendChild(card);
        }
    });

    document.getElementById('count-pending').innerText = pendingCount;
    document.getElementById('count-completed').innerText = completedCount;
}

// Checkbox Toggle
function toggleTaskStatus(index, isChecked) {
    appData[index].Status = isChecked ? 'Selesai' : 'Tertunda';
    saveData();
    renderBoard();
}

// File Import Logic
function setupFileInput() {
    document.getElementById('importCsv').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const csvContent = event.target.result;
            Papa.parse(csvContent, {
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    if (results.data && results.data.length > 0) {
                        appData = results.data;
                        saveData();
                        renderBoard();
                        alert('Data berhasil di-import dari file CSV!');
                    }
                }
            });
        };
        reader.readAsText(file);
        
        // Reset input so the same file can be selected again
        e.target.value = '';
    });
}

// Export CSV Logic
function exportCSV() {
    if (appData.length === 0) return alert('Tidak ada data untuk diekspor.');
    
    const csv = Papa.unparse(appData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "smartbank_checklist.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Modal Logic
const modal = document.getElementById('taskModal');
const form = document.getElementById('taskForm');

function openAddModal() {
    document.getElementById('modalTitle').innerText = 'Tambah Tugas Baru';
    document.getElementById('taskIndex').value = '';
    form.reset();
    modal.classList.add('active');
}

function openEditModal(index) {
    document.getElementById('modalTitle').innerText = 'Edit Tugas';
    const task = appData[index];
    document.getElementById('taskIndex').value = index;
    document.getElementById('roleInput').value = task.Role;
    document.getElementById('featureInput').value = task.Feature;
    document.getElementById('descInput').value = task.Description;
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = document.getElementById('taskIndex').value;
    const role = document.getElementById('roleInput').value.trim();
    const feature = document.getElementById('featureInput').value.trim();
    const desc = document.getElementById('descInput').value.trim();

    if (index === '') {
        // Add new
        appData.push({
            Role: role,
            Feature: feature,
            Status: 'Tertunda',
            Description: desc
        });
    } else {
        // Update existing
        appData[index].Role = role;
        appData[index].Feature = feature;
        appData[index].Description = desc;
    }

    saveData();
    renderBoard();
    closeModal();
});

// Reset Data
function resetData() {
    if (confirm('Apakah Anda yakin ingin mengembalikan seluruh data ke kondisi awal CSV bawaan? Semua perubahan lokal akan hilang.')) {
        appData = JSON.parse(JSON.stringify(defaultData));
        saveData();
        renderBoard();
    }
}
