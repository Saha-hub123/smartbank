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

    if (viewId === 'riwayat' || viewId === 'dashboard') {
        loadTransactions();
    }
}

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

async function loadTransactions() {
    try {
        const response = await fetch(`${API_URL}/transactions`);
        const transactions = await response.json();
        
        let html = '';
        transactions.forEach(trx => {
            const date = new Date(trx.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
            let amountHtml = '';
            
            if (trx.type === 'in') {
                amountHtml = `<td style="color: var(--success);">Rp ${trx.amount.toLocaleString('id-ID')}</td><td>-</td>`;
            } else {
                amountHtml = `<td>-</td><td style="color: var(--danger);">Rp ${trx.amount.toLocaleString('id-ID')}</td>`;
            }

            html += `
                <tr>
                    <td>${date}</td>
                    <td>${trx.id.substring(0, 8)}</td>
                    <td>${trx.subtitle || 'System'}</td>
                    <td>${trx.title}</td>
                    ${amountHtml}
                    <td><span class="status success">Sukses</span></td>
                </tr>
            `;
        });
        
        const tableBody = document.querySelector('#view-riwayat tbody');
        if (tableBody) tableBody.innerHTML = html;
        
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadTransactions();
});
