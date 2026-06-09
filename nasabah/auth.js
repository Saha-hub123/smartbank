const API_URL = 'http://localhost:3000/api/nasabah';

// DOM Elements
const authView = document.getElementById('auth-view');
const registerView = document.getElementById('register-view');

// Check if already logged in or remembered
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('smartbank_token');
    const user = localStorage.getItem('smartbank_user');
    if (token && user) {
        window.location.href = 'index.html'; // Redirect to main app
    }

    // Auto-fill remembered ID
    const rememberedId = localStorage.getItem('smartbank_remembered_id');
    if (rememberedId) {
        document.getElementById('login-id').value = rememberedId;
        document.getElementById('remember-me').checked = true;
    }
});

// Switch Auth Views
document.getElementById('show-register').addEventListener('click', (e) => {
    e.preventDefault();
    authView.style.display = 'none';
    registerView.style.display = 'block';
});

document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    registerView.style.display = 'none';
    authView.style.display = 'block';
});

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('login-id').value.trim();
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('remember-me').checked;

    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, password })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);
        
        localStorage.setItem('smartbank_token', data.token);
        localStorage.setItem('smartbank_user', JSON.stringify(data.user || data.data));

        // Handle Remember Me
        if (rememberMe) {
            localStorage.setItem('smartbank_remembered_id', id);
        } else {
            localStorage.removeItem('smartbank_remembered_id');
        }
        
        // Redirect to dashboard
        window.location.href = 'index.html';
    } catch (err) {
        alert('Login Gagal: ' + err.message);
    }
});

// Register
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const password = document.getElementById('reg-password').value;

    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, password, initialBalance: 50000 })
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error);
        
        alert(`Registrasi Berhasil!\n\nUser ID Anda: ${data.data.id}\n\nSilakan catat ID ini untuk login.`);
        
        // Auto fill login inputs and show login view
        document.getElementById('login-id').value = data.data.id;
        document.getElementById('login-password').value = password;
        document.getElementById('show-login').click();
    } catch (err) {
        alert('Registrasi Gagal: ' + err.message);
    }
});
