// Configuration
let API_URL = localStorage.getItem('api_url') || 'http://localhost:3000';
let AUTH_TOKEN = localStorage.getItem('auth_token');

// State
let users = [];
let cards = [];
let transactions = [];
let currentCardId = null;

// Check if logged in
if (AUTH_TOKEN) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('api-url').value = API_URL;
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }

        const data = await response.json();
        AUTH_TOKEN = data.token;
        localStorage.setItem('auth_token', AUTH_TOKEN);

        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        document.getElementById('api-url').value = API_URL;

        loadUsers();
        loadCards();
        loadTransactions();
    } catch (error) {
        const errorDiv = document.getElementById('login-error');
        errorDiv.textContent = error.message;
        errorDiv.classList.add('show');
        setTimeout(() => errorDiv.classList.remove('show'), 5000);
    }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    AUTH_TOKEN = null;
    localStorage.removeItem('auth_token');
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
});

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`${tab}-tab`).classList.add('active');
    });
});

// Settings
document.getElementById('save-url').addEventListener('click', () => {
    API_URL = document.getElementById('api-url').value;
    localStorage.setItem('api_url', API_URL);
    alert('URL sauvegardée');
});

// Error display
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}

// API Helper
async function apiCall(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (response.status === 204) return null;
        if (response.status === 401) {
            AUTH_TOKEN = null;
            localStorage.removeItem('auth_token');
            document.getElementById('login-screen').style.display = 'flex';
            document.getElementById('app-container').style.display = 'none';
            throw new Error('Session expirée, veuillez vous reconnecter');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        showError(`Erreur: ${error.message}`);
        throw error;
    }
}

// Users
async function loadUsers() {
    users = await apiCall('/v1/user');
    // Fetch balances for all users
    for (let user of users) {
        try {
            const balanceData = await apiCall(`/v1/user/${user._id}/balance`);
            user.balance = balanceData.balance;
        } catch (error) {
            user.balance = 0;
        }
    }
    renderUsers();
    populateUserSelects();
    populateTransactionUserFilter();
}

function renderUsers() {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user._id}</td>
            <td>${user.name}</td>
            <td>${user.username || '-'}</td>
            <td>
                <span class="badge">${user.role || 'admin'}</span>
            </td>
            <td>${(user.balance / 100).toFixed(2)}€</td>
            <td>
                <button onclick="editUserRole('${user._id}', '${user.role || 'admin'}')">Rôle</button>
                <button class="danger" onclick="deleteUser('${user._id}')">Supprimer</button>
            </td>
        </tr>
    `).join('');
}

function populateUserSelects() {
    const sourceSelect = document.getElementById('transaction-source');
    const destSelect = document.getElementById('transaction-destination');

    sourceSelect.innerHTML = '<option value="">Source (User)</option>' + users.map(user =>
        `<option value="${user._id}">${user.name}</option>`
    ).join('');

    destSelect.innerHTML = '<option value="">Destination (User)</option>' + users.map(user =>
        `<option value="${user._id}">${user.name}</option>`
    ).join('');
}

document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('user-name').value;
    const username = document.getElementById('user-username').value;
    const password = document.getElementById('user-password').value;
    await apiCall('/v1/user', 'POST', { name, username, password });
    document.getElementById('user-name').value = '';
    document.getElementById('user-username').value = '';
    document.getElementById('user-password').value = '';
    loadUsers();
});

async function deleteUser(id) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await apiCall(`/v1/user/${id}`, 'DELETE');
    loadUsers();
}

let currentUserId = null;

function editUserRole(userId, currentRole) {
    currentUserId = userId;
    document.getElementById('user-role-select').value = currentRole;
    document.getElementById('user-role-modal').classList.add('active');
}

document.getElementById('user-role-confirm').addEventListener('click', async () => {
    const role = document.getElementById('user-role-select').value;
    await apiCall(`/v1/user/${currentUserId}`, 'PATCH', { role });
    document.getElementById('user-role-modal').classList.remove('active');
    loadUsers();
});

document.getElementById('refresh-users').addEventListener('click', loadUsers);

// Cards
async function loadCards() {
    cards = await apiCall('/v1/card');
    renderCards();
}

function renderCards() {
    const tbody = document.querySelector('#cards-table tbody');
    tbody.innerHTML = cards.map(card => `
        <tr>
            <td>${card._id}</td>
            <td>${card.comment || '-'}</td>
            <td>
                <span class="status-badge status-${card.status}">${card.status}</span>
            </td>
            <td>${card.user_id ? card.user_id.name : '-'}</td>
            <td><strong>${card.puk || '-'}</strong></td>
            <td>${card.public_key ? '<span class="badge">✓</span>' : '-'}</td>
            <td>
                <button onclick="editStatus('${card._id}', '${card.status}')">Statut</button>
                <button onclick="editComment('${card._id}', '${card.comment || ''}')">Commentaire</button>
                <button class="secondary" onclick="assignCard('${card._id}')">Assigner</button>
                ${card.user_id ? `<button class="secondary" onclick="unassignCard('${card._id}')">Désassigner</button>` : ''}
                ${card.public_key ? `<button onclick="viewPublicKey('${card._id}')">Clé publique</button>` : ''}
                <button class="danger" onclick="deleteCard('${card._id}')">Supprimer</button>
            </td>
        </tr>
    `).join('');
}

async function deleteCard(id) {
    if (!confirm('Supprimer cette carte ?')) return;
    await apiCall(`/v1/card/${id}`, 'DELETE');
    loadCards();
}

async function assignCard(cardId) {
    currentCardId = cardId;
    await loadUsers();
    const select = document.getElementById('assign-user-select');
    select.innerHTML = users.map(user =>
        `<option value="${user._id}">${user.name}</option>`
    ).join('');
    document.getElementById('assign-modal').classList.add('active');
}

async function unassignCard(cardId) {
    if (!confirm('Désassigner cette carte ?')) return;
    await apiCall(`/v1/card/${cardId}/assign`, 'DELETE');
    loadCards();
}

document.getElementById('assign-confirm').addEventListener('click', async () => {
    const userId = document.getElementById('assign-user-select').value;
    await apiCall(`/v1/card/${currentCardId}/assign`, 'POST', { user_id: userId });
    document.getElementById('assign-modal').classList.remove('active');
    loadCards();
});

function editComment(cardId, currentComment) {
    currentCardId = cardId;
    document.getElementById('comment-input').value = currentComment;
    document.getElementById('comment-modal').classList.add('active');
}

document.getElementById('comment-confirm').addEventListener('click', async () => {
    const comment = document.getElementById('comment-input').value;
    await apiCall(`/v1/card/${currentCardId}`, 'PATCH', { comment });
    document.getElementById('comment-modal').classList.remove('active');
    loadCards();
});

function editStatus(cardId, currentStatus) {
    currentCardId = cardId;
    document.getElementById('status-select').value = currentStatus;
    document.getElementById('status-modal').classList.add('active');
}

document.getElementById('status-confirm').addEventListener('click', async () => {
    const status = document.getElementById('status-select').value;
    await apiCall(`/v1/card/${currentCardId}`, 'PATCH', { status });
    document.getElementById('status-modal').classList.remove('active');
    loadCards();
});

function viewPublicKey(cardId) {
    const card = cards.find(c => c._id === cardId);
    if (card && card.public_key) {
        document.getElementById('public-key-display').textContent = card.public_key;
        document.getElementById('public-key-modal').classList.add('active');
    }
}

document.getElementById('refresh-cards').addEventListener('click', loadCards);

// Transactions
async function loadTransactions(userId = null) {
    try {
        const url = userId
            ? `${API_URL}/v1/transactions?userId=${userId}`
            : `${API_URL}/v1/transactions`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });

        if (response.ok) {
            transactions = await response.json();
        } else {
            transactions = [];
        }
        renderTransactions();

        if (userId) {
            await loadBalance(userId);
        } else {
            document.getElementById('balance-display').textContent = '';
        }
    } catch (error) {
        transactions = [];
        renderTransactions();
        document.getElementById('balance-display').textContent = '';
    }
}

async function loadBalance(userId) {
    try {
        const response = await fetch(`${API_URL}/v1/user/${userId}/balance`, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const balanceEuros = (data.balance / 100).toFixed(2);
            document.getElementById('balance-display').textContent = `Balance: ${balanceEuros}€`;
        } else {
            document.getElementById('balance-display').textContent = '';
        }
    } catch (error) {
        document.getElementById('balance-display').textContent = '';
    }
}

function renderTransactions() {
    const tbody = document.querySelector('#transactions-table tbody');
    tbody.innerHTML = transactions.map(trans => `
        <tr>
            <td>${new Date(trans.date).toLocaleString()}</td>
            <td>${trans.source_user_name || '-'}</td>
            <td>${trans.destination_user_name || '-'}</td>
            <td>${(trans.operation / 100).toFixed(2)}€</td>
            <td>${trans.source_card_id ? trans.source_card_id.substring(0, 8) + '...' : '-'}</td>
        </tr>
    `).join('');
}

function populateTransactionUserFilter() {
    const filterSelect = document.getElementById('transaction-user-filter');
    filterSelect.innerHTML = '<option value="">All Transactions</option>' + users.map(user =>
        `<option value="${user._id}">${user.name}</option>`
    ).join('');
}

document.getElementById('transaction-user-filter').addEventListener('change', (e) => {
    const userId = e.target.value;
    loadTransactions(userId || null);
});

document.getElementById('create-transaction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const source = document.getElementById('transaction-source').value;
    const destination = document.getElementById('transaction-destination').value;
    const amount = parseInt(document.getElementById('transaction-amount').value);

    await apiCall('/v1/transactions', 'POST', {
        source_user_id: source,
        destination_user_id: destination,
        operation: amount
    });

    document.getElementById('transaction-amount').value = '';
    loadTransactions();
});

document.getElementById('refresh-transactions').addEventListener('click', loadTransactions);

// Modal close
document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
    });
});

// Init
if (AUTH_TOKEN) {
    loadUsers();
    loadCards();
    loadTransactions();
}
