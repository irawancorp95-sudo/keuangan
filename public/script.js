// ==========================================================================
// Data Structures & State Management
// ==========================================================================

// Chart of Accounts (Standar PSAK 35)
const defaultCOA = [
    // Aset
    { id: '111', name: 'Kas dan Setara Kas', type: 'asset', category: 'Lancar', normalBalance: 'debit', report: 'posisi-keuangan' },
    { id: '112', name: 'Piutang Usaha', type: 'asset', category: 'Lancar', normalBalance: 'debit', report: 'posisi-keuangan' },
    { id: '113', name: 'Perlengkapan', type: 'asset', category: 'Lancar', normalBalance: 'debit', report: 'posisi-keuangan' },
    { id: '121', name: 'Tanah', type: 'asset', category: 'Tidak Lancar', normalBalance: 'debit', report: 'posisi-keuangan' },
    { id: '122', name: 'Bangunan', type: 'asset', category: 'Tidak Lancar', normalBalance: 'debit', report: 'posisi-keuangan' },
    { id: '123', name: 'Akumulasi Penyusutan Bangunan', type: 'asset-contra', category: 'Tidak Lancar', normalBalance: 'credit', report: 'posisi-keuangan' },
    
    // Liabilitas
    { id: '211', name: 'Utang Usaha', type: 'liability', category: 'Jangka Pendek', normalBalance: 'credit', report: 'posisi-keuangan' },
    { id: '212', name: 'Pendapatan Diterima Dimuka', type: 'liability', category: 'Jangka Pendek', normalBalance: 'credit', report: 'posisi-keuangan' },
    { id: '221', name: 'Utang Bank', type: 'liability', category: 'Jangka Panjang', normalBalance: 'credit', report: 'posisi-keuangan' },
    
    // Aset Neto
    { id: '311', name: 'Aset Neto Tanpa Pembatasan', type: 'net-asset', restriction: 'unrestricted', normalBalance: 'credit', report: 'posisi-keuangan' },
    { id: '321', name: 'Aset Neto Dengan Pembatasan', type: 'net-asset', restriction: 'restricted', normalBalance: 'credit', report: 'posisi-keuangan' },
    
    // Penghasilan
    { id: '411', name: 'Sumbangan Tanpa Pembatasan', type: 'revenue', restriction: 'unrestricted', normalBalance: 'credit', report: 'penghasilan-komprehensif' },
    { id: '412', name: 'Pendapatan Jasa', type: 'revenue', restriction: 'unrestricted', normalBalance: 'credit', report: 'penghasilan-komprehensif' },
    { id: '421', name: 'Sumbangan Dengan Pembatasan', type: 'revenue', restriction: 'restricted', normalBalance: 'credit', report: 'penghasilan-komprehensif' },
    
    // Beban
    { id: '511', name: 'Beban Program (Terkait Pembatasan)', type: 'expense', restriction: 'restricted', normalBalance: 'debit', report: 'penghasilan-komprehensif' },
    { id: '521', name: 'Beban Gaji', type: 'expense', restriction: 'unrestricted', normalBalance: 'debit', report: 'penghasilan-komprehensif' },
    { id: '522', name: 'Beban Sewa', type: 'expense', restriction: 'unrestricted', normalBalance: 'debit', report: 'penghasilan-komprehensif' },
    { id: '523', name: 'Beban Penyusutan', type: 'expense', restriction: 'unrestricted', normalBalance: 'debit', report: 'penghasilan-komprehensif' },
    { id: '524', name: 'Beban Operasional Lainnya', type: 'expense', restriction: 'unrestricted', normalBalance: 'debit', report: 'penghasilan-komprehensif' }
];

// App State
let state = {
    journals: [],
    coa: [...defaultCOA],
    identity: {
        name: "Entitas Nonlaba Demo",
        address: "",
        logo: ""
    },
    users: [
        { username: 'admin', password: 'admin123', role: 'Administrator' }
    ],
    currentUser: null
};

const API_BASE_URL = '';
const api = {
    token: localStorage.getItem('psak35_token') || null,
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('psak35_token', token);
        } else {
            localStorage.removeItem('psak35_token');
        }
    },
    async request(path, options = {}) {
        const headers = options.headers || {};
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api${path}`, {
            ...options,
            headers
        });

        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        if (!response.ok) {
            throw new Error(data?.error || response.statusText || 'API request failed');
        }
        return data;
    }
};

async function fetchCurrentUser() {
    return await api.request('/me');
}

async function loadBackendData() {
    const [identity, users, coa, journals] = await Promise.all([
        api.request('/identity'),
        api.request('/users'),
        api.request('/coa'),
        api.request('/journals')
    ]);

    state.identity = identity || state.identity;
    state.users = users.map(u => ({ id: u.id, username: u.username, role: u.role }));
    state.coa = coa;
    state.journals = journals.map(journal => ({
        ...journal,
        journalNumber: journal.journal_number || journal.journalNumber || journal.id,
        customerName: journal.customer || journal.customerName || '',
        entries: journal.entries.map(entry => ({
            ...entry,
            accountId: entry.account_id || entry.accountId,
            debit: Number(entry.debit || 0),
            credit: Number(entry.credit || 0)
        }))
    }));

    updateUIIdentity();
    renderCOATable();
    renderUserAccounts();
    refreshDashboard();
    renderReports();
    setupOpeningBalance();
}

// LocalStorage Helper
const storage = {
    save: () => {
        localStorage.setItem('psak35_data', JSON.stringify(state));
    },
    load: () => {
        const data = localStorage.getItem('psak35_data');
        if (data) {
            state = JSON.parse(data);
            if (!state.identity) {
                state.identity = { name: "Entitas Nonlaba Demo", address: "", logo: "" };
            }
            if (!state.users || !Array.isArray(state.users) || state.users.length === 0) {
                state.users = [{ username: 'admin', password: 'admin123', role: 'Administrator' }];
            }
        } else {
            // Seed initial data if empty for demo purposes
            state.coa = [...defaultCOA];
            state.identity = { name: "Entitas Nonlaba Demo", address: "", logo: "" };
            state.users = [{ username: 'admin', password: 'admin123', role: 'Administrator' }];
            state.currentUser = null;
            storage.save();
        }
    }
};

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.querySelector('.app-container').style.display = 'none';
}

function hideLoginScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.querySelector('.app-container').style.display = 'flex';
}

function updateAppVisibility() {
    if (state.currentUser) {
        hideLoginScreen();
        renderUserInfo();
        renderUserAccounts();
    } else {
        showLoginScreen();
    }
}

function setupLoginScreen() {
    const loginForm = document.getElementById('login-form');
    const showUserSettings = document.getElementById('btn-show-user-settings');
    const logoutBtn = document.getElementById('btn-logout');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value.trim();
            loginUser(username, password);
        });
    }

    if (showUserSettings) {
        showUserSettings.addEventListener('click', () => {
            showToast('Login terlebih dahulu untuk menambah akun baru.', 'info');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }
}

function renderUserInfo() {
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    if (userNameEl) userNameEl.textContent = state.currentUser ? state.currentUser.username : 'Tamu';
    if (userRoleEl) userRoleEl.textContent = state.currentUser ? state.currentUser.role : 'Pengguna';
}

async function loginUser(username, password) {
    try {
        const response = await api.request('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        state.currentUser = response.user;
        api.setToken(response.token);
        await loadBackendData();
        updateAppVisibility();
        showToast(`Selamat datang, ${response.user.username}!`, 'success');
        return true;
    } catch (error) {
        showToast(error.message || 'Username atau password salah', 'error');
        return false;
    }
}

function logoutUser() {
    state.currentUser = null;
    api.setToken(null);
    updateAppVisibility();
    document.getElementById('login-form').reset();
    document.getElementById('login-username').focus();
}

function renderUserAccounts() {
    const tbody = document.querySelector('#user-accounts-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    state.users.forEach(user => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}</td>
            <td>${user.role}</td>
            <td class="text-right">
                <button class="btn-secondary btn-sm btn-reset-user" data-id="${user.id}" style="margin-right: 0.5rem;" title="Reset Password">
                    <i class="fa-solid fa-key"></i>
                </button>
                <button class="btn-danger-sm btn-delete-user" data-id="${user.id}" ${state.currentUser && state.currentUser.id === user.id ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''} title="Hapus Akun">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const user = state.users.find(u => u.id === Number(id));
            if (!user) return;
            if (confirm(`Hapus akun ${user.username}?`)) {
                try {
                    await api.request(`/users/${id}`, { method: 'DELETE' });
                    state.users = state.users.filter(u => u.id !== Number(id));
                    renderUserAccounts();
                    showToast('Akun berhasil dihapus', 'success');
                } catch (error) {
                    showToast(error.message || 'Gagal menghapus akun', 'error');
                }
            }
        });
    });

    document.querySelectorAll('.btn-reset-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const user = state.users.find(u => u.id === Number(id));
            if (user) resetUserPassword(user);
        });
    });
}

async function resetUserPassword(user) {
    const targetUser = user || state.users.find(u => u.username === user.username);
    if (!targetUser) {
        showToast('Akun tidak ditemukan', 'error');
        return;
    }

    const newPassword = prompt(`Masukkan kata sandi baru untuk ${targetUser.username}:`);
    if (newPassword === null) {
        return;
    }
    if (!newPassword || newPassword.length < 6) {
        showToast('Kata sandi harus minimal 6 karakter', 'error');
        return;
    }

    const confirmPassword = prompt('Konfirmasi kata sandi baru:');
    if (confirmPassword === null) {
        return;
    }
    if (newPassword !== confirmPassword) {
        showToast('Kata sandi konfirmasi tidak cocok', 'error');
        return;
    }

    try {
        await api.request(`/users/${targetUser.id}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password: newPassword })
        });
        showToast(`Password untuk ${targetUser.username} berhasil direset`, 'success');
    } catch (error) {
        showToast(error.message || 'Gagal mereset password', 'error');
    }
}


function setupUserAccounts() {
    const userForm = document.getElementById('user-account-form');
    if (!userForm) return;
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('new-user-username').value.trim();
        const password = document.getElementById('new-user-password').value.trim();
        const role = document.getElementById('new-user-role').value;

        if (!username || !password) {
            showToast('Username dan password harus diisi', 'error');
            return;
        }
        if (state.users.some(u => u.username === username)) {
            showToast('Username sudah digunakan', 'error');
            return;
        }

        try {
            const createdUser = await api.request('/users', {
                method: 'POST',
                body: JSON.stringify({ username, password, role })
            });
            state.users.unshift({ id: createdUser.id, username: createdUser.username, role: createdUser.role });
            renderUserAccounts();
            userForm.reset();
            showToast('Akun baru berhasil ditambahkan', 'success');
        } catch (error) {
            showToast(error.message || 'Gagal menambahkan akun', 'error');
        }
    });
}

// Format Currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
};

function getNextJournalNumber(dateValue) {
    const journalDate = dateValue ? new Date(dateValue) : new Date();
    const dateKey = journalDate.toISOString().slice(0, 10);
    const countForDate = state.journals.filter(j => !j.isOpeningBalance && j.date === dateKey).length + 1;
    return `JRN/${dateKey.replace(/-/g, '')}/${String(countForDate).padStart(3, '0')}`;
}

function updateJournalNumber() {
    const journalDate = document.getElementById('journal-date').value;
    const journalNumberInput = document.getElementById('journal-number');
    if (journalNumberInput) {
        journalNumberInput.value = getNextJournalNumber(journalDate);
    }
}

// Generate ID
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

// ==========================================================================
// Initialization & DOM Setup
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    storage.load();
    setupLoginScreen();
    setupNavigation();
    setupJournalInput();
    setupOpeningBalance();
    setupIdentity();
    setupCOAForm();
    setupUserAccounts();
    renderCOATable();
    refreshDashboard();
    updateAppVisibility();
    
    document.getElementById('btn-apply-filter').addEventListener('click', renderReports);
    document.getElementById('btn-reset-filter').addEventListener('click', () => {
        document.getElementById('filter-start').value = '';
        document.getElementById('filter-end').value = '';
        renderReports();
    });
    document.getElementById('btn-export-excel').addEventListener('click', exportCurrentReportToExcel);
    
    // Set current dates for reports
    const today = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('lp-date-current').textContent = today;
    document.getElementById('lpk-date-current').textContent = today;
    document.getElementById('lpan-date-current').textContent = today;
    document.getElementById('lbb-date-current').textContent = today;
    
    // Date input default to today
    document.getElementById('journal-date').valueAsDate = new Date();
    updateJournalNumber();

    if (api.token) {
        try {
            const user = await fetchCurrentUser();
            state.currentUser = user;
            await loadBackendData();
            updateAppVisibility();
            showToast('Terhubung ke backend', 'success');
        } catch (error) {
            state.currentUser = null;
            api.setToken(null);
            updateAppVisibility();
            showToast('Token kadaluarsa atau backend tidak tersedia. Silakan login ulang.', 'error');
        }
    }
});

function exportCurrentReportToExcel() {
    const activeTab = document.querySelector('.btn-tab.active');
    if (!activeTab) {
        showToast('Tidak ada laporan aktif untuk diekspor', 'error');
        return;
    }

    const reportKey = activeTab.getAttribute('data-report');
    const contentId = reportKey === 'buku-besar' ? 'laporan-buku-besar-content' : `laporan-${reportKey}-content`;
    const reportContent = document.getElementById(contentId);
    if (!reportContent) {
        showToast('Laporan tidak ditemukan', 'error');
        return;
    }

    const reportTitleMap = {
        'posisi-keuangan': 'Laporan Posisi Keuangan',
        'penghasilan-komprehensif': 'Laporan Penghasilan Komprehensif',
        'perubahan-aset-neto': 'Laporan Perubahan Aset Neto',
        'buku-besar': 'Laporan Buku Besar'
    };

    const reportTitle = reportTitleMap[reportKey] || 'Laporan';
    const period = document.getElementById(reportKey === 'posisi-keuangan' ? 'lp-date-current' : reportKey === 'penghasilan-komprehensif' ? 'lpk-date-current' : reportKey === 'perubahan-aset-neto' ? 'lpan-date-current' : 'lbb-date-current').textContent;
    const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="UTF-8" />
                <!--[if gte mso 9]>
                <xml>
                    <x:ExcelWorkbook>
                        <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                                <x:Name>${reportTitle}</x:Name>
                                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
                            </x:ExcelWorksheet>
                        </x:ExcelWorksheets>
                    </x:ExcelWorkbook>
                </xml>
                <![endif]-->
                <style>
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #000; padding: 6px; }
                    th { background: #f0f0f0; }
                </style>
            </head>
            <body>
                <h2>${state.identity.name}</h2>
                <h3>${reportTitle}</h3>
                <p>Periode: ${period}</p>
                ${reportContent.innerHTML}
            </body>
        </html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${reportTitle.replace(/\s+/g, '_')}_${period.replace(/[\s\/,:]/g, '_')}.xls`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    showToast('Laporan berhasil diekspor ke Excel', 'success');
}


// ==========================================================================
// Navigation Handling
// ==========================================================================
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');
    const pageTitle = document.getElementById('current-page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Handle dropdown toggle
            if (item.classList.contains('nav-dropdown-toggle')) {
                const submenu = item.nextElementSibling;
                const icon = item.querySelector('.dropdown-icon');
                if (submenu.style.display === 'none') {
                    submenu.style.display = 'block';
                    icon.style.transform = 'rotate(180deg)';
                } else {
                    submenu.style.display = 'none';
                    icon.style.transform = 'rotate(0deg)';
                }
                return;
            }

            const targetId = item.getAttribute('data-target');
            if (!targetId) return;
            
            // Update Active Nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Highlight parent if it's a submenu item
            if (item.parentElement.classList.contains('nav-submenu')) {
                item.parentElement.previousElementSibling.classList.add('active');
            }
            
            // Update Title
            pageTitle.textContent = item.querySelector('span').textContent;
            
            // Update Active Section
            sections.forEach(sec => sec.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
            
            // Trigger specific renders based on view
            if (targetId === 'dashboard') {
                refreshDashboard();
            } else if (targetId === 'reports') {
                renderReports();
            } else if (targetId === 'opening-balance') {
                setupOpeningBalance();
            }
        });
    });

    // Report Tabs
    const reportTabs = document.querySelectorAll('.btn-tab');
    const reportCards = document.querySelectorAll('.report-card');
    
    reportTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetReport = tab.getAttribute('data-report');
            
            reportTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            reportCards.forEach(card => card.classList.remove('active'));
            document.getElementById(`report-${targetReport}`).classList.add('active');
        });
    });
}

// ==========================================================================
// Journal Input Logic
// ==========================================================================
function setupJournalInput() {
    const tbody = document.getElementById('journal-entries-body');
    const btnAddRow = document.getElementById('btn-add-row');
    const btnReset = document.getElementById('btn-reset-journal');
    const form = document.getElementById('journal-form');
    
    // Add initial rows (min 2)
    tbody.innerHTML = '';
    addJournalRow();
    addJournalRow();
    
    btnAddRow.addEventListener('click', addJournalRow);
    
    document.getElementById('journal-date').addEventListener('change', updateJournalNumber);
    updateJournalNumber();

    btnReset.addEventListener('click', () => {
        form.reset();
        tbody.innerHTML = '';
        addJournalRow();
        addJournalRow();
        document.getElementById('journal-date').valueAsDate = new Date();
        updateJournalNumber();
        calculateTotals();
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveJournal();
    });
}

function getCOAOptions() {
    return state.coa.map(acc => `<option value="${acc.id}">${acc.id} - ${acc.name}</option>`).join('');
}

function addJournalRow() {
    const tbody = document.getElementById('journal-entries-body');
    const rowId = generateId();
    const tr = document.createElement('tr');
    tr.id = `row-${rowId}`;
    
    tr.innerHTML = `
        <td>
            <select class="form-control account-select" required>
                <option value="" disabled selected>Pilih Akun...</option>
                ${getCOAOptions()}
            </select>
        </td>
        <td>
            <input type="number" class="form-control debit-input text-right" min="0" placeholder="0">
        </td>
        <td>
            <input type="number" class="form-control credit-input text-right" min="0" placeholder="0">
        </td>
        <td>
            <button type="button" class="btn-danger-sm btn-remove-row" data-id="${rowId}">
                <i class="fa-solid fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(tr);
    
    // Event Listeners for new row
    const debitInput = tr.querySelector('.debit-input');
    const creditInput = tr.querySelector('.credit-input');
    
    // Mutual exclusivity
    debitInput.addEventListener('input', () => {
        if (debitInput.value > 0) {
            creditInput.value = '';
        }
        calculateTotals();
    });
    
    creditInput.addEventListener('input', () => {
        if (creditInput.value > 0) {
            debitInput.value = '';
        }
        calculateTotals();
    });
    
    tr.querySelector('.btn-remove-row').addEventListener('click', function() {
        if (tbody.children.length > 2) {
            tr.remove();
            calculateTotals();
        } else {
            showToast('Minimal harus ada 2 baris akun', 'error');
        }
    });
}

function calculateTotals() {
    let totalDebit = 0;
    let totalCredit = 0;
    
    document.querySelectorAll('.debit-input').forEach(input => {
        totalDebit += Number(input.value) || 0;
    });
    
    document.querySelectorAll('.credit-input').forEach(input => {
        totalCredit += Number(input.value) || 0;
    });
    
    document.getElementById('total-debit').textContent = formatCurrency(totalDebit);
    document.getElementById('total-kredit').textContent = formatCurrency(totalCredit);
    
    const balanceStatus = document.getElementById('balance-status');
    const btnSave = document.getElementById('btn-save-journal');
    
    if (totalDebit === totalCredit && totalDebit > 0) {
        balanceStatus.textContent = 'Balance';
        balanceStatus.className = 'badge badge-success';
        btnSave.disabled = false;
    } else {
        balanceStatus.textContent = 'Tidak Balance';
        balanceStatus.className = 'badge badge-error';
        btnSave.disabled = true;
    }
}

async function saveJournal() {
    const date = document.getElementById('journal-date').value;
    const journalNumber = document.getElementById('journal-number').value;
    const customerName = document.getElementById('journal-customer').value.trim();
    const description = document.getElementById('journal-description').value;
    
    const entries = [];
    let isValid = true;
    
    document.querySelectorAll('#journal-entries-body tr').forEach(tr => {
        const accountId = tr.querySelector('.account-select').value;
        const debit = Number(tr.querySelector('.debit-input').value) || 0;
        const credit = Number(tr.querySelector('.credit-input').value) || 0;
        
        if (!accountId) isValid = false;
        if (debit === 0 && credit === 0) isValid = false;
        
        if (accountId && (debit > 0 || credit > 0)) {
            entries.push({
                account_id: accountId,
                debit,
                credit
            });
        }
    });
    
    if (!journalNumber || !customerName) {
        isValid = false;
    }
    
    if (!isValid) {
        showToast('Pastikan semua data jurnal terisi lengkap, termasuk nama pelanggan', 'error');
        return;
    }

    try {
        await api.request('/journals', {
            method: 'POST',
            body: JSON.stringify({
                journal_number: journalNumber,
                date,
                customer: customerName,
                description,
                is_opening_balance: false,
                entries
            })
        });

        await loadBackendData();
        showToast('Jurnal berhasil disimpan!', 'success');

        // Reset Form
        document.getElementById('btn-reset-journal').click();
        refreshDashboard();
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan jurnal', 'error');
    }
}

// ==========================================================================
// Setup Saldo Awal Logic
// ==========================================================================

function setupOpeningBalance() {
    const tbody = document.getElementById('ob-entries-body');
    const form = document.getElementById('opening-balance-form');
    
    if(!tbody || !form) return;
    
    // Find existing opening balance journal
    const existingOB = state.journals.find(j => j.isOpeningBalance);
    
    if (existingOB) {
        document.getElementById('ob-date').value = existingOB.date;
    } else {
        const firstDay = new Date(new Date().getFullYear(), 0, 1);
        document.getElementById('ob-date').valueAsDate = firstDay;
    }
    
    tbody.innerHTML = '';
    
    state.coa.forEach(acc => {
        const tr = document.createElement('tr');
        
        let debitValue = '';
        let creditValue = '';
        
        if (existingOB) {
            const entry = existingOB.entries.find(e => e.accountId === acc.id);
            if (entry) {
                if (entry.debit > 0) debitValue = entry.debit;
                if (entry.credit > 0) creditValue = entry.credit;
            }
        }
        
        tr.innerHTML = `
            <td>${acc.id}</td>
            <td>${acc.name} <span class="badge badge-success" style="font-size: 0.6rem; margin-left: 5px;">${acc.normalBalance === 'debit' ? 'Db' : 'Kr'}</span></td>
            <td><input type="number" class="form-control ob-debit-input text-right" data-id="${acc.id}" min="0" value="${debitValue}" placeholder="0"></td>
            <td><input type="number" class="form-control ob-credit-input text-right" data-id="${acc.id}" min="0" value="${creditValue}" placeholder="0"></td>
        `;
        
        tbody.appendChild(tr);
        
        const debitInput = tr.querySelector('.ob-debit-input');
        const creditInput = tr.querySelector('.ob-credit-input');
        
        debitInput.addEventListener('input', () => {
            if (debitInput.value > 0) creditInput.value = '';
            calculateOBTotals();
        });
        
        creditInput.addEventListener('input', () => {
            if (creditInput.value > 0) debitInput.value = '';
            calculateOBTotals();
        });
    });
    
    calculateOBTotals();
    
    // Unbind existing listeners to prevent duplicates if called multiple times (though shouldn't happen)
    form.removeEventListener('submit', saveOpeningBalance);
    form.addEventListener('submit', saveOpeningBalance);
}

function calculateOBTotals() {
    let totalDebit = 0;
    let totalCredit = 0;
    
    document.querySelectorAll('.ob-debit-input').forEach(input => {
        totalDebit += Number(input.value) || 0;
    });
    
    document.querySelectorAll('.ob-credit-input').forEach(input => {
        totalCredit += Number(input.value) || 0;
    });
    
    document.getElementById('ob-total-debit').textContent = formatCurrency(totalDebit);
    document.getElementById('ob-total-kredit').textContent = formatCurrency(totalCredit);
    
    const balanceStatus = document.getElementById('ob-balance-status');
    const btnSave = document.getElementById('btn-save-ob');
    
    if (totalDebit === totalCredit) {
        balanceStatus.textContent = 'Balance';
        balanceStatus.className = 'badge badge-success';
        btnSave.disabled = false;
    } else {
        balanceStatus.textContent = 'Tidak Balance';
        balanceStatus.className = 'badge badge-error';
        btnSave.disabled = true;
    }
}

async function saveOpeningBalance(e) {
    e.preventDefault();
    
    const date = document.getElementById('ob-date').value;
    const entries = [];
    
    document.querySelectorAll('#ob-entries-body tr').forEach(tr => {
        const accountId = tr.querySelector('.ob-debit-input').getAttribute('data-id');
        const debit = Number(tr.querySelector('.ob-debit-input').value) || 0;
        const credit = Number(tr.querySelector('.ob-credit-input').value) || 0;
        
        if (debit > 0 || credit > 0) {
            entries.push({
                account_id: accountId,
                debit,
                credit
            });
        }
    });

    try {
        if (entries.length > 0) {
            await api.request('/journals', {
                method: 'POST',
                body: JSON.stringify({
                    journal_number: `OB/${date.replace(/-/g, '')}`,
                    date,
                    customer: 'Saldo Awal',
                    description: 'Saldo Awal',
                    is_opening_balance: true,
                    entries
                })
            });
        }

        await loadBackendData();
        showToast('Saldo Awal berhasil disimpan!', 'success');
        refreshDashboard();
        renderReports();
    } catch (error) {
        showToast(error.message || 'Gagal menyimpan saldo awal', 'error');
    }
}

// ==========================================================================
// Financial Calculations (Ledger)
// ==========================================================================

function getLedgerBalances(startDate = null, endDate = null) {
    const balances = {};
    
    // Initialize balances to 0 for all COA
    state.coa.forEach(acc => {
        balances[acc.id] = 0;
    });
    
    // Calculate balances
    state.journals.forEach(journal => {
        let include = true;
        if (startDate && journal.date < startDate) include = false;
        if (endDate && journal.date > endDate) include = false;
        
        if (include) {
            journal.entries.forEach(entry => {
                const acc = state.coa.find(a => a.id === entry.accountId);
                if (!acc) return;
                
                if (acc.normalBalance === 'debit') {
                    balances[acc.id] += entry.debit;
                    balances[acc.id] -= entry.credit;
                } else {
                    balances[acc.id] += entry.credit;
                    balances[acc.id] -= entry.debit;
                }
            });
        }
    });
    
    return balances;
}

// ==========================================================================
// Dashboard Logic
// ==========================================================================
let financeChartInstance = null;
let incomeExpenseChartInstance = null;

function refreshDashboard() {
    const balances = getLedgerBalances();
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let netAssets = 0;
    let revenue = 0;
    let expenses = 0;
    
    state.coa.forEach(acc => {
        if (acc.type === 'asset') totalAssets += balances[acc.id];
        if (acc.type === 'asset-contra') totalAssets -= balances[acc.id]; // Contra assets decrease total assets (e.g. depreciation)
        if (acc.type === 'liability') totalLiabilities += balances[acc.id];
        if (acc.type === 'net-asset') netAssets += balances[acc.id];
        if (acc.type === 'revenue') revenue += balances[acc.id];
        if (acc.type === 'expense') expenses += balances[acc.id];
    });
    
    const surplusDeficit = revenue - expenses;
    
    // The true Net Assets at period end is Beginning Net Assets + Surplus/Deficit
    const currentNetAssets = netAssets + surplusDeficit;
    
    // Update DOM
    document.getElementById('stat-total-assets').textContent = formatCurrency(totalAssets);
    document.getElementById('stat-total-liabilities').textContent = formatCurrency(totalLiabilities);
    document.getElementById('stat-total-net-assets').textContent = formatCurrency(currentNetAssets);
    
    const sdEl = document.getElementById('stat-surplus-deficit');
    sdEl.textContent = formatCurrency(surplusDeficit);
    if (surplusDeficit < 0) sdEl.style.color = 'var(--danger)';
    else sdEl.style.color = 'var(--primary)';
    
    // Update Chart
    const ctx = document.getElementById('financeChart').getContext('2d');
    if (financeChartInstance) {
        financeChartInstance.destroy();
    }
    
    financeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Total Aset', 'Total Liabilitas', 'Aset Neto', 'Surplus/Defisit YTD'],
            datasets: [{
                label: 'Ringkasan Keuangan (Rp)',
                data: [totalAssets, totalLiabilities, currentNetAssets, surplusDeficit],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 206, 86, 0.6)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 206, 86, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return new Intl.NumberFormat('id-ID', {
                                style: 'currency',
                                currency: 'IDR',
                                minimumFractionDigits: 0
                            }).format(value);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // Calculate Monthly Income/Expense for Current Year
    const currentYear = new Date().getFullYear();
    const monthlyIncome = new Array(12).fill(0);
    const monthlyExpense = new Array(12).fill(0);
    
    state.journals.forEach(journal => {
        const d = new Date(journal.date);
        if (d.getFullYear() === currentYear && !journal.isOpeningBalance) {
            const month = d.getMonth(); // 0-11
            journal.entries.forEach(entry => {
                const acc = state.coa.find(a => a.id === entry.accountId);
                if (acc) {
                    if (acc.type === 'revenue') {
                        // For revenue, normal balance is credit.
                        const amount = entry.credit - entry.debit;
                        monthlyIncome[month] += amount;
                    } else if (acc.type === 'expense') {
                        // For expense, normal balance is debit.
                        const amount = entry.debit - entry.credit;
                        monthlyExpense[month] += amount;
                    }
                }
            });
        }
    });

    const ctxIE = document.getElementById('incomeExpenseChart').getContext('2d');
    if (incomeExpenseChartInstance) {
        incomeExpenseChartInstance.destroy();
    }
    
    incomeExpenseChartInstance = new Chart(ctxIE, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
            datasets: [
                {
                    label: 'Pendapatan',
                    data: monthlyIncome,
                    borderColor: 'rgba(16, 185, 129, 1)', // var(--primary)
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Pengeluaran',
                    data: monthlyExpense,
                    borderColor: 'rgba(239, 68, 68, 1)', // var(--danger)
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            if (value >= 1000000) {
                                return 'Rp ' + (value / 1000000).toFixed(1) + 'M';
                            } else if (value >= 1000) {
                                return 'Rp ' + (value / 1000).toFixed(0) + 'K';
                            }
                            return 'Rp ' + value;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });

    // Render Recent Journals Table
    const tbody = document.querySelector('#recent-journals-table tbody');
    tbody.innerHTML = '';
    
    const recent = state.journals.slice(0, 5); // top 5
    
    if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Belum ada data jurnal</td></tr>`;
        return;
    }
    
    recent.forEach(journal => {
        journal.entries.forEach((entry, idx) => {
            const acc = state.coa.find(a => a.id === entry.accountId);
            const tr = document.createElement('tr');
            
            // Only show date and desc on first entry of the journal
            if (idx === 0) {
                tr.innerHTML = `
                    <td rowspan="${journal.entries.length}">${journal.date}</td>
                    <td rowspan="${journal.entries.length}">${journal.description}</td>
                    <td>${acc ? acc.name : entry.accountId}</td>
                    <td class="text-right">${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                    <td class="text-right">${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                `;
            } else {
                tr.innerHTML = `
                    <td>${acc ? acc.name : entry.accountId}</td>
                    <td class="text-right">${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                    <td class="text-right">${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                `;
            }
            tbody.appendChild(tr);
        });
    });
}

// ==========================================================================
// Reports Logic (PSAK 35 compliance)
// ==========================================================================

function renderReports() {
    const startDate = document.getElementById('filter-start').value || null;
    const endDate = document.getElementById('filter-end').value || null;
    
    const balancesAsOfEnd = getLedgerBalances(null, endDate);
    const balancesPeriod = getLedgerBalances(startDate, endDate);
    
    let surplusPeriodU = 0;
    let surplusPeriodR = 0;
    let surplusCumulativeU = 0;
    let surplusCumulativeR = 0;
    
    state.coa.forEach(acc => {
        if (acc.type === 'revenue' || acc.type === 'expense') {
            const amountP = acc.type === 'revenue' ? balancesPeriod[acc.id] : -balancesPeriod[acc.id];
            if (acc.restriction === 'unrestricted') surplusPeriodU += amountP;
            if (acc.restriction === 'restricted') surplusPeriodR += amountP;
            
            const amountC = acc.type === 'revenue' ? balancesAsOfEnd[acc.id] : -balancesAsOfEnd[acc.id];
            if (acc.restriction === 'unrestricted') surplusCumulativeU += amountC;
            if (acc.restriction === 'restricted') surplusCumulativeR += amountC;
        }
    });
    
    let netUAwal = 0;
    let netRAwal = 0;
    
    if (startDate) {
        const prevDateObj = new Date(startDate);
        prevDateObj.setDate(prevDateObj.getDate() - 1);
        const prevDateStr = prevDateObj.toISOString().split('T')[0];
        const balancesBefore = getLedgerBalances(null, prevDateStr);
        
        state.coa.forEach(acc => {
            if (acc.type === 'net-asset') {
                if (acc.restriction === 'unrestricted') netUAwal += balancesBefore[acc.id];
                if (acc.restriction === 'restricted') netRAwal += balancesBefore[acc.id];
            }
            if (acc.type === 'revenue' || acc.type === 'expense') {
                const amount = acc.type === 'revenue' ? balancesBefore[acc.id] : -balancesBefore[acc.id];
                if (acc.restriction === 'unrestricted') netUAwal += amount;
                if (acc.restriction === 'restricted') netRAwal += amount;
            }
        });
    } else {
        state.coa.forEach(acc => {
            if (acc.type === 'net-asset') {
                if (acc.restriction === 'unrestricted') netUAwal += balancesAsOfEnd[acc.id];
                if (acc.restriction === 'restricted') netRAwal += balancesAsOfEnd[acc.id];
            }
        });
    }

    renderLaporanPosisiKeuangan(balancesAsOfEnd, surplusCumulativeU, surplusCumulativeR);
    renderLaporanPenghasilanKomprehensif(balancesPeriod);
    renderLaporanPerubahanAsetNeto(netUAwal, netRAwal, surplusPeriodU, surplusPeriodR);
    renderLaporanBukuBesar(startDate, endDate);
    
    const lpDate = endDate ? formatDisplayDate(endDate) : 'Hari Ini';
    const lpkDate = (startDate ? formatDisplayDate(startDate) + ' s.d. ' : '') + (endDate ? formatDisplayDate(endDate) : 'Hari Ini');
    
    document.getElementById('lp-date-current').textContent = lpDate;
    document.getElementById('lpk-date-current').textContent = lpkDate;
    document.getElementById('lpan-date-current').textContent = lpkDate;
    document.getElementById('lbb-date-current').textContent = lpkDate;
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
}

function renderLaporanPosisiKeuangan(balances, surplusUnrestricted, surplusRestricted) {
    let html = '<table class="report-table">';
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    
    // ASET
    html += '<tr><td colspan="2" class="section-title">ASET</td></tr>';
    state.coa.filter(a => a.type === 'asset' || a.type === 'asset-contra').forEach(acc => {
        const bal = balances[acc.id];
        if (bal !== 0 || true) { // Always show for demo
            html += `<tr class="item-row"><td>${acc.name}</td><td class="text-right">${acc.type==='asset-contra' ? `(${formatCurrency(bal)})` : formatCurrency(bal)}</td></tr>`;
            totalAssets += acc.type === 'asset-contra' ? -bal : bal;
        }
    });
    html += `<tr class="total-row"><td>JUMLAH ASET</td><td class="text-right">${formatCurrency(totalAssets)}</td></tr>`;
    
    // LIABILITAS
    html += '<tr><td colspan="2" class="section-title">LIABILITAS</td></tr>';
    state.coa.filter(a => a.type === 'liability').forEach(acc => {
        const bal = balances[acc.id];
        html += `<tr class="item-row"><td>${acc.name}</td><td class="text-right">${formatCurrency(bal)}</td></tr>`;
        totalLiabilities += bal;
    });
    html += `<tr class="total-row"><td>JUMLAH LIABILITAS</td><td class="text-right">${formatCurrency(totalLiabilities)}</td></tr>`;
    
    // ASET NETO (Including current period surplus)
    html += '<tr><td colspan="2" class="section-title">ASET NETO</td></tr>';
    
    let netUnrestricted = 0;
    let netRestricted = 0;
    
    state.coa.filter(a => a.type === 'net-asset').forEach(acc => {
        if (acc.restriction === 'unrestricted') netUnrestricted += balances[acc.id];
        if (acc.restriction === 'restricted') netRestricted += balances[acc.id];
    });
    
    // Add current period surplus
    netUnrestricted += surplusUnrestricted;
    netRestricted += surplusRestricted;
    
    const totalNetAssets = netUnrestricted + netRestricted;
    
    html += `<tr class="item-row"><td>Tanpa Pembatasan dari Pemberi Dana</td><td class="text-right">${formatCurrency(netUnrestricted)}</td></tr>`;
    html += `<tr class="item-row"><td>Dengan Pembatasan dari Pemberi Dana</td><td class="text-right">${formatCurrency(netRestricted)}</td></tr>`;
    
    html += `<tr class="total-row"><td>JUMLAH ASET NETO</td><td class="text-right">${formatCurrency(totalNetAssets)}</td></tr>`;
    
    // TOTAL LIAB + ASET NETO
    html += `<tr class="grand-total-row"><td>JUMLAH LIABILITAS DAN ASET NETO</td><td class="text-right">${formatCurrency(totalLiabilities + totalNetAssets)}</td></tr>`;
    
    html += '</table>';
    
    document.getElementById('laporan-posisi-keuangan-content').innerHTML = html;
}

function renderLaporanPenghasilanKomprehensif(balances) {
    let html = '<table class="report-table">';
    html += '<tr><th></th><th class="text-right">Tanpa Pembatasan</th><th class="text-right">Dengan Pembatasan</th><th class="text-right">Total</th></tr>';
    
    // PENGHASILAN
    html += '<tr><td colspan="4" class="section-title">PENGHASILAN</td></tr>';
    let revU = 0, revR = 0;
    
    state.coa.filter(a => a.type === 'revenue').forEach(acc => {
        const bal = balances[acc.id];
        const u = acc.restriction === 'unrestricted' ? bal : 0;
        const r = acc.restriction === 'restricted' ? bal : 0;
        revU += u; revR += r;
        
        html += `<tr class="item-row">
            <td>${acc.name}</td>
            <td class="text-right">${formatCurrency(u)}</td>
            <td class="text-right">${formatCurrency(r)}</td>
            <td class="text-right">${formatCurrency(u+r)}</td>
        </tr>`;
    });
    html += `<tr class="total-row">
        <td>Jumlah Penghasilan</td>
        <td class="text-right">${formatCurrency(revU)}</td>
        <td class="text-right">${formatCurrency(revR)}</td>
        <td class="text-right">${formatCurrency(revU+revR)}</td>
    </tr>`;
    
    // BEBAN
    html += '<tr><td colspan="4" class="section-title">BEBAN</td></tr>';
    let expU = 0, expR = 0;
    
    state.coa.filter(a => a.type === 'expense').forEach(acc => {
        const bal = balances[acc.id];
        const u = acc.restriction === 'unrestricted' ? bal : 0;
        const r = acc.restriction === 'restricted' ? bal : 0;
        expU += u; expR += r;
        
        html += `<tr class="item-row">
            <td>${acc.name}</td>
            <td class="text-right">${formatCurrency(u)}</td>
            <td class="text-right">${formatCurrency(r)}</td>
            <td class="text-right">${formatCurrency(u+r)}</td>
        </tr>`;
    });
    html += `<tr class="total-row">
        <td>Jumlah Beban</td>
        <td class="text-right">${formatCurrency(expU)}</td>
        <td class="text-right">${formatCurrency(expR)}</td>
        <td class="text-right">${formatCurrency(expU+expR)}</td>
    </tr>`;
    
    // SURPLUS / DEFISIT
    const surpU = revU - expU;
    const surpR = revR - expR;
    html += `<tr class="grand-total-row">
        <td>SURPLUS (DEFISIT) TAHUN BERJALAN</td>
        <td class="text-right">${formatCurrency(surpU)}</td>
        <td class="text-right">${formatCurrency(surpR)}</td>
        <td class="text-right">${formatCurrency(surpU+surpR)}</td>
    </tr>`;
    
    html += '</table>';
    document.getElementById('laporan-penghasilan-komprehensif-content').innerHTML = html;
}

function renderLaporanPerubahanAsetNeto(netUAwal, netRAwal, surplusUnrestricted, surplusRestricted) {
    let html = '<table class="report-table">';
    html += '<tr><th></th><th class="text-right">Tanpa Pembatasan</th><th class="text-right">Dengan Pembatasan</th><th class="text-right">Total</th></tr>';
    
    html += `<tr class="item-row">
        <td>Aset Neto Awal Periode</td>
        <td class="text-right">${formatCurrency(netUAwal)}</td>
        <td class="text-right">${formatCurrency(netRAwal)}</td>
        <td class="text-right">${formatCurrency(netUAwal+netRAwal)}</td>
    </tr>`;
    
    html += `<tr class="item-row">
        <td>Surplus (Defisit) Tahun Berjalan</td>
        <td class="text-right">${formatCurrency(surplusUnrestricted)}</td>
        <td class="text-right">${formatCurrency(surplusRestricted)}</td>
        <td class="text-right">${formatCurrency(surplusUnrestricted+surplusRestricted)}</td>
    </tr>`;
    
    const endU = netUAwal + surplusUnrestricted;
    const endR = netRAwal + surplusRestricted;
    
    html += `<tr class="grand-total-row">
        <td>ASET NETO AKHIR PERIODE</td>
        <td class="text-right">${formatCurrency(endU)}</td>
        <td class="text-right">${formatCurrency(endR)}</td>
        <td class="text-right">${formatCurrency(endU+endR)}</td>
    </tr>`;
    
    html += '</table>';
    document.getElementById('laporan-perubahan-aset-neto-content').innerHTML = html;
}

function renderLaporanBukuBesar(startDate, endDate) {
    const dateLabel = (startDate ? formatDisplayDate(startDate) : 'Awal') + ' sampai ' + (endDate ? formatDisplayDate(endDate) : 'Hari Ini');
    let html = '';

    state.coa.forEach(acc => {
        const journalRows = [];
        let runningBalance = 0;

        state.journals
            .filter(journal => {
                if (startDate && journal.date < startDate) return false;
                if (endDate && journal.date > endDate) return false;
                return journal.entries.some(entry => entry.accountId === acc.id);
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date) || a.journalNumber.localeCompare(b.journalNumber))
            .forEach(journal => {
                const entry = journal.entries.find(e => e.accountId === acc.id);
                if (!entry) return;

                const debit = entry.debit || 0;
                const credit = entry.credit || 0;
                if (acc.normalBalance === 'debit') {
                    runningBalance += debit - credit;
                } else {
                    runningBalance += credit - debit;
                }

                journalRows.push(`
                    <tr>
                        <td style="padding: 8px 12px; border: 1px solid #000; font-size: 14px;">${journal.journalNumber || journal.id}</td>
                        <td style="padding: 8px 12px; border: 1px solid #000; font-size: 14px;">${journal.date}</td>
                        <td style="padding: 8px 12px; border: 1px solid #000; font-size: 14px;">${journal.customerName || '-'}</td>
                        <td style="padding: 8px 12px; border: 1px solid #000; font-size: 14px;">${journal.description || '-'}</td>
                        <td style="padding: 8px 12px; border: 1px solid #000; text-align: right; font-size: 14px;">${debit > 0 ? formatCurrency(debit) : '-'}</td>
                        <td style="padding: 8px 12px; border: 1px solid #000; text-align: right; font-size: 14px;">${credit > 0 ? formatCurrency(credit) : '-'}</td>
                        <td style="padding: 8px 12px; border: 1px solid #000; text-align: right; font-size: 14px;">${formatCurrency(runningBalance)}</td>
                    </tr>
                `);
            });

        if (journalRows.length === 0) {
            return;
        }

        html += `
            <div style="margin-bottom: 30px;">
                <h4 style="margin-bottom: 12px;">${acc.id} - ${acc.name}</h4>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 0;">
                    <thead>
                        <tr>
                            <th style="padding: 10px 12px; border: 1px solid #000; background: #f2f2f2; text-align: left;">No. Jurnal</th>
                            <th style="padding: 10px 12px; border: 1px solid #000; background: #f2f2f2; text-align: left;">Tanggal</th>
                            <th style="padding: 10px 12px; border: 1px solid #000; background: #f2f2f2; text-align: left;">Pelanggan</th>
                            <th style="padding: 10px 12px; border: 1px solid #000; background: #f2f2f2; text-align: left;">Keterangan</th>
                            <th style="padding: 10px 12px; border: 1px solid #000; background: #f2f2f2; text-align: right;">Debit</th>
                            <th style="padding: 10px 12px; border: 1px solid #000; background: #f2f2f2; text-align: right;">Kredit</th>
                            <th style="padding: 10px 12px; border: 1px solid #000; background: #f2f2f2; text-align: right;">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${journalRows.join('')}
                    </tbody>
                </table>
            </div>
        `;
    });

    if (!html) {
        html = '<p class="text-muted">Tidak ada transaksi untuk periode ini.</p>';
    }

    document.getElementById('laporan-buku-besar-content').innerHTML = html;
}


// ==========================================================================
// Settings / COA Render & Logic
// ==========================================================================
function renderCOATable() {
    const tbody = document.querySelector('#coa-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    state.coa.forEach(acc => {
        let typeLabel = '';
        if(acc.type === 'asset' || acc.type === 'asset-contra') typeLabel = '<span class="badge badge-success">Aset</span>';
        else if(acc.type === 'liability') typeLabel = '<span class="badge badge-error">Liabilitas</span>';
        else if(acc.type === 'net-asset') typeLabel = '<span class="badge badge-warning">Aset Neto</span>';
        else if(acc.type === 'revenue') typeLabel = '<span class="badge badge-success">Penghasilan</span>';
        else if(acc.type === 'expense') typeLabel = '<span class="badge badge-error">Beban</span>';
        
        let restriction = '-';
        if(acc.restriction === 'unrestricted') restriction = 'Tanpa Pembatasan';
        if(acc.restriction === 'restricted') restriction = 'Dengan Pembatasan';
        
        // Cek apakah akun digunakan di jurnal
        const isUsed = state.journals.some(j => j.entries.some(e => e.accountId === acc.id));
        const deleteBtn = isUsed 
            ? `<button class="btn-danger-sm" title="Tidak dapat dihapus karena sudah ada transaksi" disabled style="opacity:0.5; cursor:not-allowed;"><i class="fa-solid fa-trash"></i></button>`
            : `<button class="btn-danger-sm btn-delete-coa" data-id="${acc.id}" title="Hapus Akun"><i class="fa-solid fa-trash"></i></button>`;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${acc.id}</strong></td>
            <td>${acc.name}</td>
            <td>${typeLabel}</td>
            <td>${restriction}</td>
            <td>${acc.normalBalance === 'debit' ? 'Debit' : 'Kredit'}</td>
            <td class="text-right">${deleteBtn}</td>
        `;
        tbody.appendChild(tr);
    });
    
    // Bind Delete Event
    document.querySelectorAll('.btn-delete-coa').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (confirm(`Yakin ingin menghapus akun ${id}?`)) {
                try {
                    await api.request(`/coa/${id}`, { method: 'DELETE' });
                    state.coa = state.coa.filter(a => a.id !== id);
                    renderCOATable();
                    setupJournalInput();
                    setupOpeningBalance();
                    showToast('Akun berhasil dihapus', 'success');
                } catch (error) {
                    showToast(error.message || 'Gagal menghapus akun', 'error');
                }
            }
        });
    });
}

function setupCOAForm() {
    const btnToggle = document.getElementById('btn-toggle-add-coa');
    const container = document.getElementById('add-coa-container');
    const btnCancel = document.getElementById('btn-cancel-add-coa');
    const form = document.getElementById('add-coa-form');
    
    if(!btnToggle || !container || !btnCancel || !form) return;
    
    btnToggle.addEventListener('click', () => {
        container.style.display = 'block';
        btnToggle.style.display = 'none';
    });
    
    btnCancel.addEventListener('click', () => {
        container.style.display = 'none';
        btnToggle.style.display = 'block';
        form.reset();
    });
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('new-coa-code').value.trim();
        const name = document.getElementById('new-coa-name').value.trim();
        const type = document.getElementById('new-coa-type').value;
        const restriction = document.getElementById('new-coa-restriction').value;
        const normalBalance = document.getElementById('new-coa-balance').value;
        
        if (state.coa.find(a => a.id === code)) {
            showToast('Kode akun sudah terdaftar!', 'error');
            return;
        }

        const payload = {
            id: code,
            name,
            type,
            category: (type === 'asset' || type === 'asset-contra' || type === 'liability' || type === 'net-asset') ? 'Lancar' : null,
            normal_balance: normalBalance,
            restriction: restriction || null,
            report: (type === 'asset' || type === 'asset-contra' || type === 'liability' || type === 'net-asset') ? 'posisi-keuangan' : 'penghasilan-komprehensif'
        };

        try {
            const created = await api.request('/coa', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            state.coa.push(created);
            state.coa.sort((a, b) => parseInt(a.id) - parseInt(b.id));
            renderCOATable();
            setupJournalInput();
            setupOpeningBalance();
            showToast('Akun berhasil ditambahkan!', 'success');
            container.style.display = 'none';
            btnToggle.style.display = 'block';
            form.reset();
        } catch (error) {
            showToast(error.message || 'Gagal menambahkan akun', 'error');
        }
    });
}

// ==========================================================================
// Toast Notification
// ==========================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    const title = type === 'success' ? 'Sukses' : 'Peringatan';
    
    toast.innerHTML = `
        <div class="toast-icon"><i class="fa-solid ${icon}"></i></div>
        <div class="toast-content">
            <h4>${title}</h4>
            <p>${message}</p>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================================================
// Identity Settings Logic
// ==========================================================================
function setupIdentity() {
    const form = document.getElementById('identity-form');
    if(!form) return;
    
    document.getElementById('entity-name').value = state.identity.name || '';
    document.getElementById('entity-address').value = state.identity.address || '';
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const entityName = document.getElementById('entity-name').value;
        const entityAddress = document.getElementById('entity-address').value;
        const logoInput = document.getElementById('entity-logo');

        const saveIdentity = async (logoData) => {
            try {
                const payload = {
                    name: entityName,
                    address: entityAddress,
                    logo: logoData || state.identity.logo || ''
                };
                await api.request('/identity', {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                state.identity = payload;
                updateUIIdentity();
                showToast('Identitas berhasil disimpan!', 'success');
            } catch (error) {
                showToast(error.message || 'Gagal menyimpan identitas', 'error');
            }
        };

        if (logoInput.files && logoInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                state.identity.logo = evt.target.result;
                saveIdentity(evt.target.result);
            };
            reader.readAsDataURL(logoInput.files[0]);
        } else {
            saveIdentity();
        }
    });
    
    updateUIIdentity();
}

function updateUIIdentity() {
    // Update Sidebar
    const sidebarTitle = document.querySelector('.logo-area h2');
    if (sidebarTitle && state.identity.name) {
        sidebarTitle.innerHTML = state.identity.name;
    }
    
    const sidebarIcon = document.querySelector('.logo-area i.fa-leaf');
    const logoArea = document.querySelector('.logo-area');
    if (state.identity.logo && logoArea) {
        if (sidebarIcon) sidebarIcon.style.display = 'none';
        
        let img = document.getElementById('sidebar-logo-img');
        if (!img) {
            img = document.createElement('img');
            img.id = 'sidebar-logo-img';
            img.style.maxWidth = '30px';
            img.style.maxHeight = '30px';
            img.style.borderRadius = '6px';
            img.style.objectFit = 'cover';
            logoArea.insertBefore(img, sidebarTitle);
        }
        img.src = state.identity.logo;
    }

    const loginLogo = document.getElementById('login-logo-img');
    if (loginLogo) {
        if (state.identity.logo) {
            loginLogo.src = state.identity.logo;
            loginLogo.style.display = 'block';
        } else {
            loginLogo.style.display = 'none';
        }
    }

    const loginHeading = document.getElementById('login-heading');
    if (loginHeading) {
        loginHeading.textContent = state.identity.name ? `Masuk ke ${state.identity.name}` : 'Masuk ke NonProfitFin';
    }
    
    // Update Reports
    document.querySelectorAll('.report-header h2').forEach(el => {
        el.textContent = state.identity.name;
    });
    
    document.querySelectorAll('.report-header .entity-address-text').forEach(el => el.remove());
    
    if (state.identity.address) {
        document.querySelectorAll('.report-header').forEach(header => {
            const addr = document.createElement('p');
            addr.className = 'entity-address-text';
            addr.textContent = state.identity.address;
            addr.style.marginBottom = '0.5rem';
            addr.style.color = 'var(--text-muted)';
            const h2 = header.querySelector('h2');
            header.insertBefore(addr, h2.nextSibling);
        });
    }
}

// ==========================================================================
// Print Form / Receipt Logic
// ==========================================================================
function printCurrentJournal() {
    const date = document.getElementById('journal-date').value;
    const journalNumber = document.getElementById('journal-number').value;
    const customerName = document.getElementById('journal-customer').value.trim();
    const description = document.getElementById('journal-description').value;
    
    // Gather entries
    const entries = [];
    document.querySelectorAll('#journal-entries-body tr').forEach(tr => {
        const accountSelect = tr.querySelector('.account-select');
        const accountId = accountSelect.value;
        const accountName = accountId ? accountSelect.options[accountSelect.selectedIndex].text.split(' - ')[1] : '';
        const debit = Number(tr.querySelector('.debit-input').value) || 0;
        const credit = Number(tr.querySelector('.credit-input').value) || 0;
        
        if (accountId && (debit > 0 || credit > 0)) {
            entries.push({ accountId, accountName, debit, credit });
        }
    });
    
    // Validasi kosong
    if (entries.length === 0 || !journalNumber || !customerName || !description) {
        showToast('Isi form jurnal terlebih dahulu, termasuk no jurnal dan nama pelanggan', 'error');
        return;
    }

    const totalDebit = document.getElementById('total-debit').textContent;
    const totalKredit = document.getElementById('total-kredit').textContent;
    
    const container = document.getElementById('print-receipt-container');
    
    // Build Logo HTML
    const logoHtml = state.identity.logo 
        ? `<img src="${state.identity.logo}" alt="Logo" style="max-height: 80px; max-width: 120px; object-fit: contain;">` 
        : '';
        
    let entriesHtml = '';
    entries.forEach(e => {
        entriesHtml += `
            <tr>
                <td style="padding: 8px 12px; border: 1px solid #000; font-size: 14px;">${e.accountId}</td>
                <td style="padding: 8px 12px; border: 1px solid #000; font-size: 14px;">${e.accountName}</td>
                <td style="padding: 8px 12px; border: 1px solid #000; text-align: right; font-size: 14px;">${e.debit > 0 ? formatCurrency(e.debit) : '-'}</td>
                <td style="padding: 8px 12px; border: 1px solid #000; text-align: right; font-size: 14px;">${e.credit > 0 ? formatCurrency(e.credit) : '-'}</td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div style="padding: 40px; max-width: 800px; margin: 0 auto; background: white; color: black; border: 1px solid #ccc; box-shadow: none;">
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
                <div style="flex: 0 0 150px; text-align: left;">
                    ${logoHtml}
                </div>
                <div style="flex: 1; text-align: center; padding: 0 20px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase;">${state.identity.name || 'ENTITAS NONLABA'}</h1>
                    <p style="margin: 5px 0 0; font-size: 14px; color: #333;">${state.identity.address || 'Alamat Belum Diatur'}</p>
                </div>
                <div style="flex: 0 0 150px;"></div> <!-- Placeholder for balance -->
            </div>
            
            <h2 style="text-align: center; margin: 0 0 30px 0; font-size: 18px; text-decoration: underline; letter-spacing: 1px;">BUKTI TRANSAKSI JURNAL</h2>
            
            <table style="width: 100%; margin-bottom: 25px; border: none;">
                <tr>
                    <td style="width: 120px; font-weight: bold; padding: 5px 0;">No. Jurnal</td>
                    <td style="padding: 5px 0;">: ${journalNumber || '-'}</td>
                </tr>
                <tr>
                    <td style="width: 120px; font-weight: bold; padding: 5px 0;">Nama Pelanggan</td>
                    <td style="padding: 5px 0;">: ${customerName || '-'}</td>
                </tr>
                <tr>
                    <td style="width: 120px; font-weight: bold; padding: 5px 0;">Tanggal</td>
                    <td style="padding: 5px 0;">: ${date ? new Date(date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</td>
                </tr>
                <tr>
                    <td style="font-weight: bold; padding: 5px 0; vertical-align: top;">Keterangan</td>
                    <td style="padding: 5px 0;">: ${description || '-'}</td>
                </tr>
            </table>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px;">
                <thead>
                    <tr>
                        <th style="padding: 10px 12px; border: 1px solid #000; background-color: #f0f0f0; text-align: left; font-size: 14px; width: 80px;">Kode</th>
                        <th style="padding: 10px 12px; border: 1px solid #000; background-color: #f0f0f0; text-align: left; font-size: 14px;">Nama Akun</th>
                        <th style="padding: 10px 12px; border: 1px solid #000; background-color: #f0f0f0; text-align: right; font-size: 14px; width: 140px;">Debit</th>
                        <th style="padding: 10px 12px; border: 1px solid #000; background-color: #f0f0f0; text-align: right; font-size: 14px; width: 140px;">Kredit</th>
                    </tr>
                </thead>
                <tbody>
                    ${entriesHtml}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" style="padding: 10px 12px; border: 1px solid #000; text-align: right; font-weight: bold; font-size: 14px;">TOTAL</td>
                        <td style="padding: 10px 12px; border: 1px solid #000; text-align: right; font-weight: bold; font-size: 14px;">${totalDebit}</td>
                        <td style="padding: 10px 12px; border: 1px solid #000; text-align: right; font-weight: bold; font-size: 14px;">${totalKredit}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div style="display: flex; justify-content: space-between; margin-top: 50px; padding: 0 40px;">
                <div style="text-align: center; width: 200px;">
                    <p style="margin-bottom: 80px; font-size: 14px;">Dibuat Oleh,</p>
                    <p style="border-bottom: 1px solid #000; margin: 0;"></p>
                    <p style="font-size: 12px; margin-top: 5px;">Bagian Keuangan</p>
                </div>
                <div style="text-align: center; width: 200px;">
                    <p style="margin-bottom: 80px; font-size: 14px;">Disetujui Oleh,</p>
                    <p style="border-bottom: 1px solid #000; margin: 0;"></p>
                    <p style="font-size: 12px; margin-top: 5px;">Pimpinan / Manajer</p>
                </div>
            </div>
        </div>
    `;
    
    document.body.classList.add('is-printing-receipt');
    window.print();
    
    setTimeout(() => {
        document.body.classList.remove('is-printing-receipt');
    }, 1000);
}
