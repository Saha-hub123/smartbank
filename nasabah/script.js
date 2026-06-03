const API_URL = 'http://localhost:3000/api/nasabah';
let currentUser = null;
let updateInterval = null;

// Utility to format rupiah
const formatRp = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    const actionTriggers = document.querySelectorAll('.action-trigger');
    const loginOverlay = document.getElementById('login-overlay');

    // Navigation function
    function navigateTo(targetId) {
        // Remove active class from all sections
        viewSections.forEach(section => section.classList.remove('active'));
        
        // Remove active class from sidebar items
        navItems.forEach(nav => nav.classList.remove('active'));

        // Show target section
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Highlight matching sidebar item if exists
        const matchingNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
        if (matchingNav) {
            matchingNav.classList.add('active');
        }

        // Load data depending on section
        if (currentUser) {
            if (targetId === 'dashboard') {
                fetchDashboardData();
            } else if (targetId === 'loan') {
                fetchLoans();
            } else if (targetId === 'history') {
                fetchHistory();
            }
        }
    }

    // Sidebar clicks
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = item.dataset.target;
            if (targetId) navigateTo(targetId);
        });
    });

    // Quick action clicks (dashboard cards, etc)
    actionTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = trigger.dataset.target;
            if (targetId) navigateTo(targetId);
        });
    });

    // E-Wallet selection
    const ewalletItems = document.querySelectorAll('.ewallet-item');
    ewalletItems.forEach(item => {
        item.addEventListener('click', () => {
            ewalletItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Nominal chips selection
    const chips = document.querySelectorAll('.chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const input = document.querySelector('#topup input[type="number"]');
            if (input) {
                input.value = chip.textContent.replace(/\./g, '');
            }
        });
    });

    // Transfer tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // ------------------------------------------------------------------
    // LOGIN & REGISTER OVERLAY LOGIC
    // ------------------------------------------------------------------
    const btnTabLogin = document.getElementById('btn-tab-login');
    const btnTabRegister = document.getElementById('btn-tab-register');
    const loginForm = document.getElementById('login-form-element');
    const registerForm = document.getElementById('register-form-element');

    btnTabLogin.addEventListener('click', () => {
        btnTabLogin.classList.add('active');
        btnTabRegister.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });

    btnTabRegister.addEventListener('click', () => {
        btnTabRegister.classList.add('active');
        btnTabLogin.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });

    // Sync demo select option with ID input
    const selectUser = document.getElementById('login-select-user');
    const inputUserId = document.getElementById('login-user-id');
    selectUser.addEventListener('change', () => {
        inputUserId.value = selectUser.value;
    });

    // Handle Login Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = inputUserId.value.trim();
        if (!userId) {
            alert('Masukkan ID Nasabah Anda!');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            const data = await res.json();

            if (res.ok) {
                loginSuccess(data.user);
            } else {
                alert(data.error || 'Login gagal');
            }
        } catch (error) {
            alert('Koneksi ke server backend gagal');
        }
    });

    // Handle Register Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('reg-user-id').value.trim();
        const name = document.getElementById('reg-name').value.trim();

        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name }),
            });
            const data = await res.json();

            if (res.ok) {
                alert('Pendaftaran berhasil! Anda mendapatkan saldo awal Rp 50.000');
                loginSuccess(data.user);
            } else {
                alert(data.error || 'Registrasi gagal');
            }
        } catch (error) {
            alert('Koneksi ke server backend gagal');
        }
    });

    function loginSuccess(user) {
        currentUser = user;
        localStorage.setItem('sb_current_user', JSON.stringify(user));
        loginOverlay.classList.add('hidden');
        
        // Init dashboard
        navigateTo('dashboard');
        
        // Start auto update every 5 seconds
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(fetchDashboardData, 5000);
    }

    // Logout
    const logoutBtn = document.querySelector('.logout-btn');
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('sb_current_user');
        if (updateInterval) clearInterval(updateInterval);
        loginOverlay.classList.remove('hidden');
        inputUserId.value = '';
        selectUser.value = '';
    });

    // Auto-login check
    const storedUser = localStorage.getItem('sb_current_user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            // Verify status on load
            fetch(`${API_URL}/profile/${user.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.status === 'active') {
                        loginSuccess(data);
                    } else {
                        localStorage.removeItem('sb_current_user');
                    }
                })
                .catch(() => {
                    // Fallback to offline auto login if backend down
                    loginSuccess(user);
                });
        } catch (e) {
            localStorage.removeItem('sb_current_user');
        }
    }

    // ------------------------------------------------------------------
    // API DATA FETCHING & RENDERING
    // ------------------------------------------------------------------

    async function fetchDashboardData() {
        if (!currentUser) return;
        try {
            const resProfile = await fetch(`${API_URL}/profile/${currentUser.id}`);
            const user = await resProfile.json();
            
            if (resProfile.ok) {
                currentUser = user;
                // Update Name & Role
                document.querySelector('.profile-info .name').textContent = user.name;
                document.querySelector('.page-header h1').textContent = `Ringkasan Akun`;
                document.querySelector('.page-header p').textContent = `Selamat datang kembali, ${user.name.split(' ')[0]}.`;
                
                // Update Avatar
                document.querySelector('.user-profile img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=3B82F6&color=fff`;

                // Update Balance
                document.querySelector('.balance-card .amount').textContent = formatRp(user.balance);
            }

            // Get Recent Transactions
            const resTx = await fetch(`${API_URL}/transactions/${currentUser.id}`);
            const txs = await resTx.json();

            if (resTx.ok) {
                renderRecentTransactions(txs);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    }

    function renderRecentTransactions(txs) {
        const container = document.querySelector('.transaction-list');
        if (!container) return;

        container.innerHTML = '';
        const limitTxs = txs.slice(0, 5); // 5 terbaru

        if (limitTxs.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">Belum ada transaksi terakhir</div>';
            return;
        }

        limitTxs.forEach(tx => {
            const isNegative = tx.type === 'out' || tx.type === 'fee';
            const iconClass = tx.type === 'in' ? 'fa-arrow-left transfer-in' : (tx.type === 'fee' ? 'fa-percent fee' : 'fa-arrow-right transfer-out');
            const iconBg = tx.type === 'in' ? 'transfer-in' : (tx.type === 'fee' ? 'payment' : 'transfer-out');
            const amountPrefix = isNegative ? '-' : '+';
            const amountClass = isNegative ? 'negative' : 'positive';
            const dateStr = new Date(tx.createdAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });

            const item = document.createElement('div');
            item.className = 'transaction-item';
            item.innerHTML = `
                <div class="tx-info">
                    <div class="tx-icon ${iconBg}"><i class="fas ${iconClass}"></i></div>
                    <div>
                        <h4>${tx.title}</h4>
                        <span class="date">${dateStr} • ${tx.id}</span>
                    </div>
                </div>
                <div class="tx-amount ${amountClass}">${amountPrefix} ${formatRp(tx.amount)}</div>
            `;
            container.appendChild(item);
        });
    }

    async function fetchHistory() {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_URL}/transactions/${currentUser.id}`);
            const txs = await res.json();
            const tbody = document.getElementById('history-table-body');
            if (!tbody) return;

            tbody.innerHTML = '';
            if (txs.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Belum ada riwayat transaksi</td></tr>';
                return;
            }

            txs.forEach(tx => {
                const isNegative = tx.type === 'out' || tx.type === 'fee';
                const sign = isNegative ? '-' : '+';
                const color = isNegative ? 'var(--danger)' : 'var(--success)';
                const dateStr = new Date(tx.createdAt).toLocaleString('id-ID');

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${tx.id}</strong></td>
                    <td style="color: var(--text-muted); font-size: 0.9rem;">${dateStr}</td>
                    <td>
                        <div style="font-weight: 600;">${tx.title}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${tx.subtitle || ''}</div>
                    </td>
                    <td><span class="status-badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">${tx.source}</span></td>
                    <td style="color: ${color}; font-weight: 600;">${sign} ${formatRp(tx.amount)}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    }

    // ------------------------------------------------------------------
    // TRANSFER FORM LOGIC
    // ------------------------------------------------------------------
    const transferForm = document.querySelector('#transfer form');
    const transferBtn = document.querySelector('#transfer button');

    transferBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const tabsActive = document.querySelector('#transfer .tab.active');
        const isInternal = tabsActive ? tabsActive.textContent.includes('Sesama') : true;

        const targetAccount = document.querySelector('#transfer input[placeholder*="1234567890"]').value.trim();
        const amount = parseInt(document.querySelector('#transfer input[placeholder="0"]').value);
        const notes = document.querySelector('#transfer input[placeholder*="Berita"]').value.trim();

        if (!targetAccount) {
            alert('Masukkan Rekening/ID Tujuan!');
            return;
        }
        if (!amount || amount <= 0) {
            alert('Masukkan Nominal Transfer yang valid!');
            return;
        }

        const confirmMsg = isInternal 
            ? `Transfer ke ${targetAccount} sebesar ${formatRp(amount)}?\n(Akan dikenakan biaya admin 1%)`
            : `Transfer Bank Lain ke ${targetAccount} sebesar ${formatRp(amount)}?\n(Akan dikenakan biaya admin 1%)`;

        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`${API_URL}/transfer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    senderId: currentUser.id,
                    receiverId: isInternal ? targetAccount : 'MARKETPLACE', // bank lain diredirect ke entitas ekosistem
                    amount: amount
                })
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Transfer berhasil!\nID Transaksi: ${data.data.txId}`);
                transferForm.reset();
                navigateTo('dashboard');
            } else {
                alert(`Gagal: ${data.error}`);
            }
        } catch (error) {
            alert('Terjadi kesalahan koneksi ke server');
        }
    });

    // ------------------------------------------------------------------
    // QRIS PAYMENT LOGIC
    // ------------------------------------------------------------------
    const qrisBtn = document.querySelector('#qris button');
    if (qrisBtn) {
        qrisBtn.addEventListener('click', async () => {
            const merchant = prompt('Masukkan Nama Merchant QRIS:', 'Toko Kelontong Pak Andi');
            if (!merchant) return;
            const amountInput = prompt('Masukkan Nominal Pembayaran (Rp):', '50000');
            if (!amountInput) return;
            const amount = parseInt(amountInput);

            if (isNaN(amount) || amount <= 0) {
                alert('Nominal tidak valid!');
                return;
            }

            if (!confirm(`Bayar QRIS ke "${merchant}" sebesar ${formatRp(amount)}?`)) return;

            try {
                const res = await fetch(`${API_URL}/pay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        amount,
                        type: 'qris',
                        target: merchant
                    })
                });
                const data = await res.json();

                if (res.ok) {
                    alert(`Pembayaran QRIS Sukses!\nID Transaksi: ${data.data.txId}`);
                    navigateTo('dashboard');
                } else {
                    alert(`Gagal: ${data.error}`);
                }
            } catch (error) {
                alert('Koneksi server gagal');
            }
        });
    }

    // ------------------------------------------------------------------
    // TOP UP LOGIC
    // ------------------------------------------------------------------
    const topupBtn = document.querySelector('#topup button');
    if (topupBtn) {
        topupBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const activeEwallet = document.querySelector('.ewallet-item.active');
            const walletName = activeEwallet ? activeEwallet.textContent.trim() : 'GoPay';
            const phone = document.querySelector('#topup input[placeholder="08xxxxxxxxxx"]').value.trim();
            const amount = parseInt(document.querySelector('#topup input[type="number"]').value);

            if (!phone) {
                alert('Masukkan nomor handphone!');
                return;
            }
            if (isNaN(amount) || amount <= 0) {
                alert('Nominal top up tidak valid!');
                return;
            }

            if (!confirm(`Lakukan Top Up ${walletName} ke ${phone} sebesar ${formatRp(amount)}?`)) return;

            try {
                const res = await fetch(`${API_URL}/pay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        amount,
                        type: 'topup',
                        target: `${walletName} (${phone})`
                    })
                });
                const data = await res.json();

                if (res.ok) {
                    alert(`Top Up ${walletName} Sukses!\nID Transaksi: ${data.data.txId}`);
                    document.querySelector('#topup form').reset();
                    navigateTo('dashboard');
                } else {
                    alert(`Gagal: ${data.error}`);
                }
            } catch (error) {
                alert('Koneksi server gagal');
            }
        });
    }

    // ------------------------------------------------------------------
    // BILL PAYMENT LOGIC (TAGIHAN)
    // ------------------------------------------------------------------
    const billCategories = document.querySelectorAll('.bill-category');
    billCategories.forEach(cat => {
        cat.addEventListener('click', async () => {
            const billName = cat.querySelector('h3').textContent.trim();
            const custNo = prompt(`Masukkan Nomor Pelanggan untuk ${billName}:`, '123456789');
            if (!custNo) return;

            // Generate mock bill amount
            const mockAmount = Math.floor(25000 + Math.random() * 125000);
            if (!confirm(`Tagihan ${billName} untuk No. ${custNo} adalah ${formatRp(mockAmount)}.\nBayar sekarang?`)) return;

            try {
                const res = await fetch(`${API_URL}/pay`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        amount: mockAmount,
                        type: 'tagihan',
                        target: `${billName} (${custNo})`
                    })
                });
                const data = await res.json();

                if (res.ok) {
                    alert(`Pembayaran Tagihan ${billName} Sukses!\nID Transaksi: ${data.data.txId}`);
                    navigateTo('dashboard');
                } else {
                    alert(`Gagal: ${data.error}`);
                }
            } catch (error) {
                alert('Koneksi server gagal');
            }
        });
    });

    // ------------------------------------------------------------------
    // LOAN LOGIC (PINJAMAN)
    // ------------------------------------------------------------------
    const loanAmountInput = document.getElementById('loan-amount');
    const loanInterest = document.getElementById('loan-interest');
    const loanTotal = document.getElementById('loan-total');
    const loanForm = document.getElementById('loan-form');

    if (loanAmountInput) {
        loanAmountInput.addEventListener('input', () => {
            const val = parseInt(loanAmountInput.value) || 0;
            const interest = Math.floor(val * 0.10);
            const total = val + interest;
            
            loanInterest.textContent = formatRp(interest);
            loanTotal.textContent = formatRp(total);
        });
    }

    if (loanForm) {
        loanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseInt(loanAmountInput.value) || 0;

            if (amount <= 0 || amount > 100000) {
                alert('Nominal pinjaman maksimal Rp 100.000');
                return;
            }

            if (!confirm(`Ajukan pinjaman sebesar ${formatRp(amount)}?\nTotal pengembalian + bunga 10%: ${formatRp(amount * 1.10)}`)) return;

            try {
                const res = await fetch(`${API_URL}/loan`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: currentUser.id,
                        amount
                    })
                });
                const data = await res.json();

                if (res.ok) {
                    alert('Pengajuan pinjaman berhasil dikirim! Menunggu validasi admin.');
                    loanForm.reset();
                    loanInterest.textContent = formatRp(0);
                    loanTotal.textContent = formatRp(0);
                    fetchLoans();
                } else {
                    alert(`Gagal: ${data.error}`);
                }
            } catch (error) {
                alert('Koneksi server gagal');
            }
        });
    }

    async function fetchLoans() {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_URL}/loans/${currentUser.id}`);
            const loans = await res.json();
            const tbody = document.getElementById('loan-table-body');
            if (!tbody) return;

            tbody.innerHTML = '';
            if (loans.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Belum ada riwayat pengajuan</td></tr>';
                return;
            }

            loans.forEach(loan => {
                let badgeClass = 'pending';
                let statusLabel = 'Tertunda';
                if (loan.status === 'approved') {
                    badgeClass = 'approved';
                    statusLabel = 'Disetujui';
                } else if (loan.status === 'rejected') {
                    badgeClass = 'rejected';
                    statusLabel = 'Ditolak';
                }

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${loan.id}</strong></td>
                    <td style="font-weight:600;">${formatRp(loan.amount)}</td>
                    <td style="color:var(--danger); font-weight:600;">${formatRp(loan.totalWithInterest)}</td>
                    <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Error fetching loans:', error);
        }
    }
});
