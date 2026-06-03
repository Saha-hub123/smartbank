document.addEventListener('DOMContentLoaded', () => {
    
    const getRoleIcon = (roleName) => {
        if(roleName.includes('Admin')) return '<i class="fa-solid fa-building-columns"></i>';
        if(roleName.includes('Teller')) return '<i class="fa-solid fa-user-tie"></i>';
        if(roleName.includes('Nasabah')) return '<i class="fa-solid fa-mobile-screen"></i>';
        if(roleName.includes('Sistem')) return '<i class="fa-solid fa-server"></i>';
        return '<i class="fa-solid fa-list-check"></i>';
    };

    Papa.parse("data.csv", {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            renderDashboard(results.data);
        },
        error: function(err) {
            document.getElementById('dashboard').innerHTML = `<div class="loading" style="color: var(--danger)">
                <i class="fa-solid fa-triangle-exclamation"></i><br>
                Gagal memuat data CSV.<br>
                <small style="font-size: 0.9rem; color: var(--text-muted)">Pastikan Anda membuka file ini menggunakan Web Server (misal: Live Server di VSCode) karena browser memblokir fetch() ke file lokal.</small>
            </div>`;
            console.error(err);
        }
    });

    function renderDashboard(data) {
        const dashboard = document.getElementById('dashboard');
        dashboard.innerHTML = '';

        const groupedData = data.reduce((acc, row) => {
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
                    <div class="task-item">
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
});
