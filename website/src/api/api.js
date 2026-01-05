const API_BASE_URL = 'https://api.cashless.rvcs.fr';

const getAuthHeaders = () => {
  const token = localStorage.getItem('cashless_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const getCurrentUserId = () => {
  return localStorage.getItem('cashless_user_id');
};

const handleUnauthorized = () => {
  localStorage.removeItem('cashless_token');
  localStorage.removeItem('cashless_user');
  localStorage.removeItem('cashless_cards');
  localStorage.removeItem('cashless_currentCardId');
  localStorage.removeItem('cashless_user_id');
  window.location.href = '/login';
};

const fetchWithAuth = async (url, options = {}) => {
  const response = await fetch(url, options);

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  return response;
};

export const api = {
  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Identifiants incorrects');
    }
    
    const data = await response.json();
    const { token, user } = data;

    localStorage.setItem('cashless_token', token);
    const userId = user?.id || user?.userId || user?._id;
    if (userId) {
      localStorage.setItem('cashless_user_id', String(userId));
    }

    let card = null;
    try {
      const cardsResponse = await fetch(`${API_BASE_URL}/v1/card`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (cardsResponse.ok) {
        const cards = await cardsResponse.json();
        const candidateIds = new Set();
        const uId = user?.id || user?.userId || user?._id;
        if (uId !== undefined && uId !== null) candidateIds.add(String(uId));
        if (user?._id) candidateIds.add(String(user._id));

        card = cards.find(c => {
          if (!c.user_id) return false;
          if (typeof c.user_id === 'string') return candidateIds.has(String(c.user_id));
          if (typeof c.user_id === 'object') {
            const maybe = c.user_id._id || c.user_id.id || c.user_id;
            return candidateIds.has(String(maybe));
          }
          return false;
        }) || null;
      }
    } catch (e) {
    }

    return { user, card, token };
  },

  getAllCards: async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/card`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Erreur lors de la récupération des cartes');
    return response.json();
  },

  getCard: async (cardId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/card/${cardId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Erreur lors de la récupération de la carte');
    return response.json();
  },

  createCard: async (cardData) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/card`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cardData)
    });
    if (!response.ok) throw new Error('Erreur lors de la création de la carte');
    return response.json();
  },

  updateCard: async (cardId, updates) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/card/${cardId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Erreur lors de la mise à jour de la carte');
    return response.json();
  },

  blockCard: async (cardId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/card/${cardId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'inactive' })
    });
    if (!response.ok) throw new Error('Erreur lors du blocage de la carte');
    return response.json();
  },

  assignCard: async (cardId, userId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/card/${cardId}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId })
    });
    if (!response.ok) throw new Error("Erreur lors de l'assignation de la carte");
    return response.json();
  },

  unassignCard: async (cardId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/card/${cardId}/assign`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Erreur lors de la désassignation de la carte");
    return response.json();
  },

  deleteCard: async (cardId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/card/${cardId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Erreur lors de la suppression de la carte");
  },

  getAllUsers: async () => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
    return response.json();
  },

  getUser: async (userId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${userId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Erreur lors de la récupération de l'utilisateur");
    return response.json();
  },

  createUser: async (userData) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error("Erreur lors de la création de l'utilisateur");
    return response.json();
  },

  updateUser: async (userId, updates) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error("Erreur lors de la mise à jour de l'utilisateur");
    return response.json();
  },

  updatePassword: async (userId, currentPassword, newPassword) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${userId}/password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la mise à jour du mot de passe");
    }
    return response.json();
  },

  adminResetPassword: async (userId, newPassword) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${userId}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la réinitialisation du mot de passe");
    }
    return response.json();
  },

  deleteUser: async (userId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Erreur lors de la suppression de l'utilisateur");
  },

  getUserByCardId: async (cardId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user?card_id=${cardId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Utilisateur non trouvé');
    return response.json();
  },

  getUserBalance: async (userId) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${userId}/balance`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Erreur lors de la récupération du solde");
    return response.json();
  },

  getTransactions: async (userId = null, page = 1, limit = null) => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    params.append('page', page);
    if (limit) params.append('limit', limit);

    const url = `${API_BASE_URL}/v1/transactions?${params.toString()}`;
    const response = await fetchWithAuth(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Erreur lors de la récupération des transactions");
    return response.json(); // Returns { transactions, pagination }
  },

  createTransaction: async (transactionData) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/transactions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(transactionData)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la création de la transaction");
    }
    return response.json();
  },

  updateTransactionComment: async (transactionId, comment) => {
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/transactions/${transactionId}/comment`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ comment })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la mise à jour du commentaire");
    }
    return response.json();
  },

  getBeneficiaries: async () => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) throw new Error("Utilisateur non connecté");
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${currentUserId}/beneficiaries`, { headers: getAuthHeaders() });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la récupération des bénéficiaires");
    }
    return response.json();
  },

  addBeneficiary: async (userId, comment = '') => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) throw new Error("Utilisateur non connecté");
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${currentUserId}/beneficiaries`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId, comment })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de l'ajout du bénéficiaire");
    }
    return response.json();
  },

  updateBeneficiaryComment: async (userId, comment) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) throw new Error("Utilisateur non connecté");
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${currentUserId}/beneficiaries/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ comment })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la mise à jour du commentaire");
    }
    return response.json();
  },

  removeBeneficiary: async (userId) => {
    const currentUserId = getCurrentUserId();
    if (!currentUserId) throw new Error("Utilisateur non connecté");
    const response = await fetchWithAuth(`${API_BASE_URL}/v1/user/${currentUserId}/beneficiaries/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la suppression du bénéficiaire");
    }
  }
};
