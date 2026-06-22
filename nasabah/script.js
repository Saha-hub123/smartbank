const API_URL = 'http://localhost:3000/api/nasabah';
let currentUser = null;
let currentToken = null;
let allTransactions = []; // Store transactions for search

// Check saved session before doing anything
window.addEventListener('DOMContentLoaded', () => {
    const savedToken = localStorage.getItem('smartbank_token');
    const savedUser = localStorage.getItem('smartbank_user');
    
    if (!savedToken || !savedUser) {
        window.location.href = 'login.html'; // Redirect to login
        return;
    }

    currentToken = savedToken;
    try {
        if (savedUser === "undefined") throw new Error();
        currentUser = JSON.parse(savedUser);
        if (!currentUser) throw new Error();
    } catch (e) {
        localStorage.removeItem('smartbank_token');
        localStorage.removeItem('smartbank_user');
        window.location.href = 'login.html';
        return;
    }
    
    initApp();
});

// Logout
document.querySelector('.logout-btn').addEventListener('click', () => {
    localStorage.removeItem('smartbank_token');
    localStorage.removeItem('smartbank_user');
    window.location.href = 'login.html';
});

// Navigation Logic
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('data-target');
        
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        viewSections.forEach(section => {
            section.classList.remove('active');
            if(section.id === targetId) {
                section.classList.add('active');
            }
        });

        if (targetId === 'dashboard') loadDashboard();
        if (targetId === 'history') loadHistory();
        if (targetId === 'loan') loadActiveLoans();
    });
});

document.querySelectorAll('.action-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = trigger.getAttribute('data-target');
        const targetNav = document.querySelector(`.nav-item[data-target="${targetId}"]`);
        if(targetNav) targetNav.click();
    });
});

// App Initialization
async function initApp() {
    // Show main app container (if it was hidden)
    const mainApp = document.getElementById('main-app');
    if (mainApp) mainApp.style.display = 'block';

    // Set basic profile info from cache first to avoid flashing
    document.querySelector('.profile-info .name').innerText = currentUser.name;
    if (currentUser.type) {
        document.querySelector('.profile-info .role').innerText = currentUser.type + ' Member';
    }
    document.querySelector('.user-profile img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=3B82F6&color=fff`;
    
    // Load dashboard (will overwrite with fresh data from server)
    await loadDashboard();
}

// Fetch Dashboard Data
async function loadDashboard() {
    try {
        const res = await fetch(`${API_URL}/dashboard`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (!res.ok) throw new Error('Sesi kedaluwarsa');
        
        const data = await res.json();
        
        // Update user profile globally from fresh data
        currentUser.id = data.id || currentUser.id;
        currentUser.type = data.type || currentUser.type;
        localStorage.setItem('smartbank_user', JSON.stringify(currentUser));

        // Update DOM elements
        document.querySelector('.profile-info .role').innerText = (data.type || 'Regular') + ' Member';
        document.getElementById('welcome-message').innerText = `Selamat datang kembali, ${data.name.split(' ')[0]}.`;
        document.getElementById('account-number').innerText = data.id || 'N/A';

        // Update balance
        document.querySelector('.balance-card .amount').innerText = `Rp ${data.balance.toLocaleString('id-ID')}`;
        
        // Update recent transactions
        const txContainer = document.querySelector('.transaction-list');
        txContainer.innerHTML = '';
        
        if (data.recentTransactions.length === 0) {
            txContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 20px;">Belum ada transaksi</p>';
        } else {
            data.recentTransactions.forEach(tx => {
                const isOut = tx.type === 'out' || tx.type === 'fee';
                const iconClass = isOut ? 'transfer-out' : 'transfer-in';
                const iconFa = isOut ? 'fa-arrow-right' : 'fa-arrow-left';
                const amountClass = isOut ? 'negative' : 'positive';
                const amountPrefix = isOut ? '-' : '+';
                const dateStr = new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });

                txContainer.innerHTML += `
                    <div class="transaction-item">
                        <div class="tx-info">
                            <div class="tx-icon ${iconClass}"><i class="fas ${iconFa}"></i></div>
                            <div>
                                <h4>${tx.title}</h4>
                                <span class="date">${dateStr}</span>
                            </div>
                        </div>
                        <div class="tx-amount ${amountClass}">${amountPrefix} Rp ${tx.amount.toLocaleString('id-ID')}</div>
                    </div>
                `;
            });
        }
    } catch (err) {
        console.error(err);
        if(err.message === 'Sesi kedaluwarsa') {
            alert('Sesi kedaluwarsa, silakan login kembali.');
            document.querySelector('.logout-btn').click();
        }
    }
}

// --- Algoritma KMP (Knuth-Morris-Pratt) ---
function buildLPSTable(pattern) {
    const lps = new Array(pattern.length).fill(0);
    let length = 0;
    let i = 1;
    while (i < pattern.length) {
        if (pattern[i] === pattern[length]) {
            length++;
            lps[i] = length;
            i++;
        } else {
            if (length !== 0) {
                length = lps[length - 1];
            } else {
                lps[i] = 0;
                i++;
            }
        }
    }
    return lps;
}

function searchKMP(text, pattern) {
    if (pattern.length === 0) return 0;
    text = text.toLowerCase();
    pattern = pattern.toLowerCase();
    const lps = buildLPSTable(pattern);
    let i = 0;
    let j = 0;
    while (i < text.length) {
        if (pattern[j] === text[i]) {
            i++;
            j++;
        }
        if (j === pattern.length) {
            return i - j;
        } else if (i < text.length && pattern[j] !== text[i]) {
            if (j !== 0) {
                j = lps[j - 1];
            } else {
                i++;
            }
        }
    }
    return -1;
}
// ------------------------------------------

// Fetch Full History
async function loadHistory() {
    try {
        const res = await fetch(`${API_URL}/transactions`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        allTransactions = await res.json();
        renderHistory(allTransactions);
    } catch (err) {
        console.error(err);
    }
}

// Search Logic & Virtual Scroll
let currentDisplayTxs = [];
let maxRendered = 100;

function renderHistory(transactions) {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;
    
    currentDisplayTxs = transactions;
    maxRendered = 100;
    const txToRender = transactions.slice(0, maxRendered);
    
    let html = '';
    
    if (txToRender.length === 0) {
        html += `<p style="text-align:center; padding:40px; color:var(--text-muted);">Belum ada riwayat transaksi yang sesuai.</p>`;
    } else {
        txToRender.forEach(tx => html += generateTxHTML(tx));
    }
    historyContainer.innerHTML = html;
}

function appendHistory(transactions) {
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;
    transactions.forEach(tx => {
        historyContainer.insertAdjacentHTML('beforeend', generateTxHTML(tx));
    });
}

function generateTxHTML(tx) {
    const isOut = tx.type === 'out' || tx.type === 'fee';
    const iconClass = isOut ? 'transfer-out' : 'transfer-in';
    const iconFa = isOut ? 'fa-arrow-right' : 'fa-arrow-left';
    const amountClass = isOut ? 'negative' : 'positive';
    const amountPrefix = isOut ? '-' : '+';
    const dateStr = new Date(tx.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });

    return `
        <div class="transaction-item" style="padding: 15px; border-bottom: 1px solid var(--glass-border);">
            <div class="tx-info">
                <div class="tx-icon ${iconClass}"><i class="fas ${iconFa}"></i></div>
                <div>
                    <h4>${tx.title}</h4>
                    <span class="date">${tx.subtitle || ''} | ${dateStr}</span>
                </div>
            </div>
            <div class="tx-amount ${amountClass}" style="font-weight:600;">${amountPrefix} Rp ${tx.amount.toLocaleString('id-ID')}</div>
        </div>
    `;
}

// Virtual Scrolling Event
const mainContent = document.querySelector('.main-content');
if (mainContent) {
    mainContent.addEventListener('scroll', () => {
        if (mainContent.scrollTop + mainContent.clientHeight >= mainContent.scrollHeight - 200) {
            if (maxRendered < currentDisplayTxs.length) {
                const nextBatch = currentDisplayTxs.slice(maxRendered, maxRendered + 100);
                if (nextBatch.length > 0) {
                    appendHistory(nextBatch);
                    maxRendered += 100;
                }
            }
        }
    });
}

const searchInput = document.getElementById('kmp-search-input');
const toggleAlg = document.getElementById('smart-algorithm-toggle');
const timeLabel = document.getElementById('kmp-execution-time');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        if (keyword === '') {
            if(timeLabel) timeLabel.innerText = '⏱️ 0.00 ms';
            renderHistory(allTransactions);
            return;
        }

        const isSmartAlg = toggleAlg ? toggleAlg.checked : true;
        const start = performance.now();
        
        let filtered = [];

        if (isSmartAlg) {
            // Algoritma Pintar (KMP)
            const lps = buildLPSTable(keyword);
            filtered = allTransactions.filter(tx => {
                const text = (tx.title + " " + (tx.subtitle || "") + " " + tx.amount).toLowerCase();
                let i = 0, j = 0;
                while (i < text.length) {
                    if (keyword[j] === text[i]) {
                        i++; j++;
                    }
                    if (j === keyword.length) return true;
                    else if (i < text.length && keyword[j] !== text[i]) {
                        if (j !== 0) j = lps[j - 1];
                        else i++;
                    }
                }
                return false;
            });
        } else {
            // Algoritma Naif (Brute Force murni)
            filtered = allTransactions.filter(tx => {
                const text = (tx.title + " " + (tx.subtitle || "") + " " + tx.amount).toLowerCase();
                const n = text.length;
                const m = keyword.length;
                if(m === 0) return true;
                for(let i=0; i <= n - m; i++) {
                    let j;
                    for(j=0; j < m; j++) {
                        if (text[i+j] !== keyword[j]) break;
                    }
                    if (j === m) return true;
                }
                return false;
            });
        }

        const end = performance.now();
        const timeTaken = end - start;
        if(timeLabel) {
            timeLabel.innerText = `⏱️ ${timeTaken.toFixed(2)} ms`;
            if(timeTaken <= 2) timeLabel.style.color = 'var(--success)';
            else if(timeTaken <= 15) timeLabel.style.color = 'var(--warning)';
            else timeLabel.style.color = 'var(--danger)';
        }

        renderHistory(filtered);
    });
}

// Transfer Form
document.querySelector('#transfer form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('input');
    const receiverId = inputs[0].value.trim();
    const amount = inputs[1].value;

    if (!receiverId || !amount) return alert('Data tidak lengkap');

    const confirmMsg = `Anda akan mentransfer Rp ${Number(amount).toLocaleString('id-ID')} ke ${receiverId}.\nTotal dipotong dari saldo Anda adalah Rp ${(Number(amount) * 1.03).toLocaleString('id-ID')} (termasuk 1% Fee Bank dan 2% Pajak Sistem).\nLanjutkan?`;
    
    if(!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ receiverId, amount })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);
        
        alert('Transfer berhasil diproses!');
        e.target.reset();
        document.querySelector('.nav-item[data-target="dashboard"]').click();
    } catch (err) {
        alert('Transfer Gagal: ' + err.message);
    }
});

// Loan Calculation Preview
const loanAmountInput = document.getElementById('loan-amount');
if (loanAmountInput) {
    loanAmountInput.addEventListener('input', (e) => {
        const val = Number(e.target.value) || 0;
        const total = val + (val * 0.10); // +10% Bunga
        document.getElementById('loan-total').innerText = `Rp ${total.toLocaleString('id-ID')}`;
    });
}

// Loan Form
const loanForm = document.querySelector('#loan-form');
if (loanForm) {
    loanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = document.getElementById('loan-amount').value;

        try {
            const res = await fetch(`${API_URL}/loan`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ amount })
            });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error);
            
            alert(data.message);
            e.target.reset();
            document.getElementById('loan-total').innerText = 'Rp 0';
            loadActiveLoans(); // Segarkan daftar pinjaman
        } catch (err) {
            alert('Pengajuan Pinjaman Ditolak: ' + err.message);
        }
    });
}

// Active Loans & Repayment
async function loadActiveLoans() {
    const container = document.getElementById('active-loans-container');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/loan`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const loans = await res.json();

        if (loans.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Tidak ada pinjaman aktif saat ini.</p>';
            return;
        }

        let html = '';
        loans.forEach(loan => {
            const statusLabel = loan.status === 'pending' 
                ? '<span style="color: #F59E0B; background: rgba(245, 158, 11, 0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Menunggu Persetujuan</span>'
                : '<span style="color: #10B981; background: rgba(16, 185, 129, 0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Sudah Cair / Aktif</span>';

            html += `
                <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px solid var(--glass-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <strong>ID: ${loan.id}</strong>
                        ${statusLabel}
                    </div>
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="color: var(--text-muted);">Sisa Tagihan (inc. Bunga):</span>
                            <strong style="color: var(--danger);">Rp ${loan.totalWithInterest.toLocaleString('id-ID')}</strong>
                        </div>
                    </div>
                    ${loan.status === 'approved' ? `
                        <form onsubmit="payLoan(event, '${loan.id}', ${loan.totalWithInterest})" style="display: flex; gap: 10px; align-items: stretch;">
                            <div class="input-prefix" style="flex: 1; margin-bottom: 0;">
                                <span>Rp</span>
                                <input type="number" name="payAmount" placeholder="Jumlah cicilan" max="${loan.totalWithInterest}" required style="width: 100%; padding: 14px 16px; background: transparent; border: none; outline: none; color: white;">
                            </div>
                            <button type="submit" class="btn-gradient" style="width: auto; padding: 0 24px; border-radius: 12px; margin: 0; min-width: 100px;">Bayar</button>
                        </form>
                    ` : ''}
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error("Gagal memuat pinjaman aktif", err);
        container.innerHTML = '<p style="color: var(--danger); text-align: center;">Gagal memuat data.</p>';
    }
}

async function payLoan(e, loanId, maxAmount) {
    e.preventDefault();
    const amount = e.target.elements.payAmount.value;
    
    if (amount <= 0 || amount > maxAmount) {
        return alert('Nominal pembayaran tidak valid.');
    }

    if (!confirm(`Anda akan mencicil pinjaman ini sebesar Rp ${Number(amount).toLocaleString('id-ID')}. Lanjutkan?`)) return;

    try {
        const res = await fetch(`${API_URL}/loan/pay`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ loanId, amount })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);
        
        alert(data.message);
        loadActiveLoans(); // Refresh list
        loadDashboard(); // Refresh balance in background
    } catch (err) {
        alert('Pembayaran Gagal: ' + err.message);
    }
}
