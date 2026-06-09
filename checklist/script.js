document.addEventListener('DOMContentLoaded', () => {
    let appData = [];
    
    const getRoleIcon = (roleName) => {
        if(roleName.includes('Admin')) return '<i class="fa-solid fa-building-columns"></i>';
        if(roleName.includes('Teller')) return '<i class="fa-solid fa-user-tie"></i>';
        if(roleName.includes('Nasabah')) return '<i class="fa-solid fa-mobile-screen"></i>';
        if(roleName.includes('Sistem')) return '<i class="fa-solid fa-server"></i>';
        return '<i class="fa-solid fa-list-check"></i>';
    };

    function loadData() {
        // Force refresh local storage once to show updated progress automatically
        if (!sessionStorage.getItem('updated_to_v3')) {
            localStorage.removeItem('smartbank_checklist');
            sessionStorage.setItem('updated_to_v3', 'true');
        }

        const savedData = localStorage.getItem('smartbank_checklist');
        if(savedData) {
            appData = JSON.parse(savedData);
            renderDashboard(appData);
        } else {
            // Load original from CSV
            Papa.parse("data.csv", {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    appData = results.data;
                    saveData();
                    renderDashboard(appData);
                },
                error: function(err) {
                    document.getElementById('dashboard').innerHTML = `<div class="loading" style="color: var(--danger)">
                        <i class="fa-solid fa-triangle-exclamation"></i><br>
                        Gagal memuat data CSV.<br>
                        <small style="font-size: 0.9rem; color: var(--text-muted)">Pastikan Anda membuka file ini menggunakan Web Server (misal: Live Server di VSCode).</small>
                    </div>`;
                    console.error(err);
                }
            });
        }
    }

    function saveData() {
        localStorage.setItem('smartbank_checklist', JSON.stringify(appData));
    }

    // Export toggle status to global window object
    window.toggleStatus = function(index) {
        const cycle = {
            'Selesai': 'Tertunda',
            'Tertunda': 'Berjalan',
            'Berjalan': 'Selesai'
        };
        const currentStatus = appData[index].Status;
        appData[index].Status = cycle[currentStatus] || 'Tertunda';
        
        saveData();
        renderDashboard(appData);
    };

    function renderDashboard(data) {
        const dashboard = document.getElementById('dashboard');
        dashboard.innerHTML = '';

        if(data.length === 0) {
            dashboard.innerHTML = '<div class="loading">Belum ada tugas tercatat.</div>';
            return;
        }

        // Include original index before grouping so we can edit the right element
        const dataWithIndex = data.map((item, index) => ({...item, originalIndex: index}));

        const groupedData = dataWithIndex.reduce((acc, row) => {
            if(!acc[row.Role]) acc[row.Role] = [];
            acc[row.Role].push(row);
            return acc;
        }, {});

        for(const [role, tasks] of Object.entries(groupedData)) {
            const card = document.createElement('div');
            card.className = 'role-card';
            
            const completed = tasks.filter(t => t.Status.toLowerCase() === 'selesai').length;
            const progress = Math.round((completed / tasks.length) * 100) || 0;
            
            let tasksHtml = tasks.map(task => {
                const statusClass = `status-${task.Status.toLowerCase().replace(/\s+/g, '-')}`;
                let iconHtml = '';
                
                if(task.Status.toLowerCase() === 'selesai') {
                    iconHtml = '<i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 1.1rem;"></i>';
                } else if(task.Status.toLowerCase() === 'berjalan') {
                    iconHtml = '<i class="fa-solid fa-spinner fa-spin" style="color: var(--warning); font-size: 1.1rem;"></i>';
                } else {
                    iconHtml = '<i class="fa-solid fa-circle-pause" style="color: var(--danger); font-size: 1.1rem;"></i>';
                }

                return `
                    <div class="task-item" onclick="toggleStatus(${task.originalIndex})" title="Klik untuk ubah status">
                        <div class="task-header">
                            <div class="task-name">${iconHtml} ${task.Feature}</div>
                            <span class="status-badge ${statusClass}">${task.Status}</span>
                        </div>
                        <div class="task-desc">${task.Description}</div>
                    </div>
                `;
            }).join('');

            card.innerHTML = `
                <div class="role-header">
                    <div class="role-icon">
                        ${getRoleIcon(role)}
                    </div>
                    <div style="flex-grow: 1;">
                        <div class="role-title">${role}</div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                            <span>Progress</span>
                            <span>${completed}/${tasks.length} Selesai</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>
                <div class="task-list">
                    ${tasksHtml}
                </div>
            `;
            dashboard.appendChild(card);
        }
    }

    // Modal Events
    const modal = document.getElementById('modal-task');
    document.getElementById('btn-add-task').addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('close-modal').addEventListener('click', () => modal.classList.remove('active'));
    
    // Form Submission
    document.getElementById('form-task').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newTask = {
            Role: document.getElementById('input-role').value,
            Feature: document.getElementById('input-feature').value,
            Status: document.getElementById('input-status').value,
            Description: document.getElementById('input-desc').value
        };

        appData.push(newTask);
        saveData();
        renderDashboard(appData);

        e.target.reset();
        modal.classList.remove('active');
    });

    // Export to CSV
    document.getElementById('btn-export').addEventListener('click', () => {
        const csv = Papa.unparse(appData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "smartbank_checklist_updated.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Reset Data
    document.getElementById('btn-reset').addEventListener('click', () => {
        if(confirm("Anda yakin ingin menghapus semua perubahan? Aplikasi akan di-reset menggunakan data asli dari file CSV.")) {
            localStorage.removeItem('smartbank_checklist');
            loadData();
        }
    });

    // Init App
    loadData();
});
