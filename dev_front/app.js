// Configuration
let API_URL = localStorage.getItem('api_url') || 'http://localhost:3000';
document.getElementById('api-url').value = API_URL;

// State
let users = [];
let cards = [];
let currentCardId = null;

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
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (response.status === 204) return null;
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
    renderUsers();
}

function renderUsers() {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user._id}</td>
            <td>${user.name}</td>
            <td>
                <button class="danger" onclick="deleteUser('${user._id}')">Supprimer</button>
            </td>
        </tr>
    `).join('');
}

document.getElementById('create-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('user-name').value;
    await apiCall('/v1/user', 'POST', { name });
    document.getElementById('user-name').value = '';
    loadUsers();
});

async function deleteUser(id) {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await apiCall(`/v1/user/${id}`, 'DELETE');
    loadUsers();
}

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
            <td>
                <button onclick="editStatus('${card._id}', '${card.status}')">Statut</button>
                <button onclick="editComment('${card._id}', '${card.comment || ''}')">Commentaire</button>
                <button class="secondary" onclick="assignCard('${card._id}')">Assigner</button>
                ${card.user_id ? `<button class="secondary" onclick="unassignCard('${card._id}')">Désassigner</button>` : ''}
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

document.getElementById('refresh-cards').addEventListener('click', loadCards);

// Modal close
document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.closest('.modal').classList.remove('active');
    });
});

// Init
loadUsers();
loadCards();
