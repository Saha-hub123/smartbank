const API_URL = 'http://localhost:3000/api/teller';
let currentUserId = null;

// Navigation Logic
function switchView(viewId, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');

    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.remove('active');
    });

    document.getElementById('view-' + viewId).classList.add('active');

    const titleMap = {
        'dashboard': 'Teller Workspace',
        'nasabah': 'Layanan Nasabah (Setor & Tarik)',
        'transfer': 'Transfer Dana Nasabah',
        'riwayat': 'Riwayat Teller'
    };
    document.getElementById('page-title').innerText = titleMap[viewId];

    if (viewId === 'riwayat') {
        loadTransactions();
    } else if (viewId === 'dashboard') {
        loadTellerDashboard();
    }
}

// --- Algoritma Greedy ---
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

// --- Pendekatan Naif (Loop Pengurangan Manual) ---
function naiveDenominations(amount) {
    const denominations = [100000, 50000, 20000, 10000, 5000, 2000, 1000];
    const result = {};
    for (let coin of denominations) {
        let count = 0;
        while (amount >= coin) {
            amount -= coin;
            count++;
        }
        if (count > 0) result[coin] = count;
    }
    if (amount > 0) result['sisa'] = amount;
    return result;
}

// --- Algoritma Merge Sort ---
function mergeSortTransactions(arr) {
    if (arr.length <= 1) return arr;
    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);
    const leftSorted = mergeSortTransactions(left);
    const rightSorted = mergeSortTransactions(right);
    return merge(leftSorted, rightSorted);
}

function merge(left, right) {
    let result = [];
    let i = 0, j = 0;
    while (i < left.length && j < right.length) {
        if (new Date(left[i].createdAt).getTime() >= new Date(right[j].createdAt).getTime()) {
            result.push(left[i]);
            i++;
        } else {
            result.push(right[j]);
            j++;
        }
    }
    return result.concat(left.slice(i)).concat(right.slice(j));
}

// --- Algoritma Naif (Bubble Sort murni O(N^2)) ---
function bubbleSortTransactions(arr) {
    let n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (new Date(arr[j].createdAt).getTime() < new Date(arr[j+1].createdAt).getTime()) {
                let temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
            }
        }
    }
    return arr;
}
// ------------------------------------------

// Search Customer
async function searchCustomer() {
    const input = document.getElementById('quickSearchInput').value;
    if(input.trim() === '') {
        alert('Masukkan ID User atau Nomor Rekening!');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/users/${input}`);
        if (!response.ok) {
            alert('Nasabah tidak ditemukan');
            return;
        }

        const user = await response.json();
        currentUserId = user.id;

        // Switch to Layanan Nasabah view
        switchView('nasabah', document.querySelectorAll('.nav-item')[1]);
        
        // Show customer info
        document.getElementById('customer-empty').style.display = 'none';
        document.getElementById('customer-info').style.display = 'block';
        
        // Update DOM
        document.getElementById('cName').innerText = user.name;
        document.getElementById('cId').innerText = user.id;
        document.querySelector('.customer-balance .amount').innerText = `Rp ${user.balance.toLocaleString('id-ID')}`;
    } catch (error) {
        console.error('Error fetching user:', error);
        alert('Terjadi kesalahan sistem');
    }
}

// Form Handlers
async function handleDeposit(e) {
    e.preventDefault();
    if (!currentUserId) return alert('Cari nasabah terlebih dahulu!');
    
    const amount = e.target.querySelector('input[type="number"]').value;
    try {
        const response = await fetch(`${API_URL}/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, amount })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        alert('Transaksi Setor Tunai Berhasil Diproses!');
        e.target.reset();
        
        // Refresh balance
        document.querySelector('.customer-balance .amount').innerText = `Rp ${data.data.user.balance.toLocaleString('id-ID')}`;
    } catch (error) {
        alert(`Gagal: ${error.message}`);
    }
}

async function handleWithdraw(e) {
    e.preventDefault();
    if (!currentUserId) return alert('Cari nasabah terlebih dahulu!');
    
    const amount = e.target.querySelector('input[type="number"]').value;
    try {
        const response = await fetch(`${API_URL}/withdraw`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, amount })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        // --- Cek Toggle Algoritma ---
        const isSmartAlg = document.getElementById('smart-algorithm-toggle')?.checked !== false;
        const start = performance.now();
        
        const tarikNominal = Number(amount);
        let pecahan;
        if(isSmartAlg) {
            pecahan = calculateDenominations(tarikNominal);
        } else {
            pecahan = naiveDenominations(tarikNominal);
        }
        
        const end = performance.now();
        const timeTaken = end - start;
        const timeLabel = document.getElementById('greedy-execution-time');
        if(timeLabel) {
            timeLabel.innerText = `⏱️ Waktu Kalkulasi: ${timeTaken.toFixed(4)} ms`;
            if(timeTaken <= 0.5) timeLabel.style.color = 'var(--success)';
            else if(timeTaken <= 2) timeLabel.style.color = 'var(--warning)';
            else timeLabel.style.color = 'var(--danger)';
        }
        
        let pecahanHtml = '<ul style="list-style: none; padding: 0;">';
        for (let key in pecahan) {
            if (key === 'sisa') {
                pecahanHtml += `<li style="padding: 10px; background: rgba(239, 68, 68, 0.1); color: var(--danger); border-radius: 8px; margin-bottom: 8px; font-weight: 500;">
                                    Sisa Koin/Uang Logam: Rp ${pecahan[key].toLocaleString('id-ID')}
                                </li>`;
            } else {
                pecahanHtml += `<li style="padding: 10px; background: rgba(59, 130, 246, 0.1); color: var(--text-main); border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between;">
                                    <span>Pecahan <strong>Rp ${Number(key).toLocaleString('id-ID')}</strong></span>
                                    <span style="font-weight: 600;">${pecahan[key]} Lembar</span>
                                </li>`;
            }
        }
        pecahanHtml += '</ul>';
        
        document.getElementById('greedyResult').innerHTML = pecahanHtml;
        const modal = document.getElementById('greedyModal');
        const content = document.getElementById('greedyModalContent');
        
        modal.style.display = 'flex';
        // Trigger reflow for transition
        void modal.offsetWidth;
        modal.style.opacity = '1';
        if(content) content.style.transform = 'translateY(0)';
        // -----------------------------------

        alert('Transaksi Tarik Tunai Berhasil Diproses!');
        e.target.reset();
        
        // Refresh balance
        document.querySelector('.customer-balance .amount').innerText = `Rp ${data.data.user.balance.toLocaleString('id-ID')}`;
    } catch (error) {
        alert(`Gagal: ${error.message}`);
    }
}

async function handleTransfer(e) {
    e.preventDefault();
    const inputs = e.target.querySelectorAll('input');
    const senderId = inputs[0].value;
    const receiverId = inputs[1].value;
    const amount = inputs[2].value;

    try {
        const response = await fetch(`${API_URL}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ senderId, receiverId, amount })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        alert('Transfer Dana Nasabah Berhasil Diproses!');
        e.target.reset();
    } catch (error) {
        alert(`Gagal: ${error.message}`);
    }
}
let currentTellerTxs = [];
let tellerRenderCount = 100;

async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}/transactions`);
        let transactions = await response.json();
        
        const isSmartAlg = document.getElementById('smart-algorithm-toggle')?.checked !== false;
        const start = performance.now();
        
        if (isSmartAlg) {
            transactions = mergeSortTransactions(transactions);
        } else {
            transactions = bubbleSortTransactions(transactions);
        }
        
        const end = performance.now();
        const timeTaken = end - start;
        const timeLabel = document.getElementById('sort-execution-time');
        if (timeLabel) {
            timeLabel.innerText = `⏱️ ${timeTaken.toFixed(2)} ms`;
            if(timeTaken <= 15) timeLabel.style.color = 'var(--success)';
            else if(timeTaken <= 100) timeLabel.style.color = 'var(--warning)';
            else timeLabel.style.color = 'var(--danger)';
        }
        
        currentTellerTxs = transactions;
        tellerRenderCount = 100;
        
        let html = '';
        const txToRender = transactions.slice(0, tellerRenderCount);
        
        txToRender.forEach(trx => html += generateTellerHtml(trx));
        document.getElementById('teller-history-body').innerHTML = html;
    } catch (error) {
        console.error("Error loading transactions:", error);
    }
}

function appendTellerHistory(transactions) {
    const tbody = document.getElementById('teller-history-body');
    if (!tbody) return;
    let html = '';
    transactions.forEach(trx => html += generateTellerHtml(trx));
    tbody.insertAdjacentHTML('beforeend', html);
}

function generateTellerHtml(trx) {
    const date = new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    let amountHtml = '';
    
    if (trx.type === 'in') {
        amountHtml = `<td style="color: var(--success);">Rp ${trx.amount.toLocaleString('id-ID')}</td><td>-</td>`;
    } else {
        amountHtml = `<td>-</td><td style="color: var(--danger);">Rp ${trx.amount.toLocaleString('id-ID')}</td>`;
    }

    return `
        <tr>
            <td>${date}</td>
            <td>${trx.id}</td>
            <td>${trx.title} <br><small style="color: var(--text-muted)">${trx.subtitle || ''}</small></td>
            ${amountHtml}
            <td><span style="background: rgba(16, 185, 129, 0.2); color: var(--success); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">Selesai</span></td>
        </tr>
    `;
}

// Virtual Scrolling Event untuk Teller
window.addEventListener('scroll', () => {
    // Cek jika user sudah scroll mendekati bagian bawah halaman
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
        if (tellerRenderCount < currentTellerTxs.length) {
            const nextBatch = currentTellerTxs.slice(tellerRenderCount, tellerRenderCount + 100);
            if (nextBatch.length > 0) {
                appendTellerHistory(nextBatch);
                tellerRenderCount += 100;
            }
        }
    }
});

async function loadTellerDashboard() {
    try {
        const response = await fetch(`${API_URL}/dashboard`);
        const data = await response.json();

        // Update Stats
        document.getElementById('teller-total-tx').innerText = data.stats.totalTransactions;
        document.getElementById('teller-total-in').innerText = `Rp ${data.stats.totalIn.toLocaleString('id-ID')}`;
        document.getElementById('teller-total-out').innerText = `Rp ${data.stats.totalOut.toLocaleString('id-ID')}`;

        // Update Queue
        let queueHtml = '';
        if (data.recentQueue.length === 0) {
            queueHtml = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Belum ada antrean / transaksi</td></tr>';
        } else {
            data.recentQueue.forEach((trx) => {
                const isOut = trx.type === 'out';
                const typeIcon = isOut ? '<i class="fa-solid fa-arrow-up out"></i>' : '<i class="fa-solid fa-arrow-down in"></i>';
                const amountColor = isOut ? 'var(--danger)' : 'var(--success)';
                const date = new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';

                queueHtml += `
                    <tr>
                        <td>${trx.id.substring(0, 8)}</td>
                        <td>${date}</td>
                        <td>${trx.subtitle || 'System'}</td>
                        <td class="tx-type">${typeIcon} ${trx.title}</td>
                        <td style="color: ${amountColor}; font-weight: 500;">Rp ${trx.amount.toLocaleString('id-ID')}</td>
                        <td><span class="status success">Sukses</span></td>
                    </tr>
                `;
            });
        }
        const queueBody = document.getElementById('teller-queue-body');
        if (queueBody) queueBody.innerHTML = queueHtml;

    } catch (error) {
        console.error('Error fetching teller dashboard:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadTellerDashboard();
});
