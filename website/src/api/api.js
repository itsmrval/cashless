const API_BASE_URL = 'https://api.cashless.valentinp.fr';

const getAuthHeaders = () => {
  const token = localStorage.getItem('cashless_token');
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

export const api = {
  // Authentication
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

    // Store token
    localStorage.setItem('cashless_token', token);

    // Fetch card for the user (try to be robust about ID shapes)
    let card = null;
    try {
      // We fetch all cards and filter by user_id because there is no direct endpoint to get "my card"
      const cardsResponse = await fetch(`${API_BASE_URL}/v1/card`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (cardsResponse.ok) {
        const cards = await cardsResponse.json();

        // Normalize user id from the login response — backend returns user.id
        const candidateIds = new Set();
        const uId = user?.id || user?.userId || user?._id;
        if (uId !== undefined && uId !== null) candidateIds.add(String(uId));

        // Also add possible _id key if present on user object
        if (user?._id) candidateIds.add(String(user._id));

        // Find a card where card.user_id matches any candidate id. card.user_id can be a string or an object
        card = cards.find(c => {
          if (!c.user_id) return false;
          // string case
          if (typeof c.user_id === 'string') return candidateIds.has(String(c.user_id));
          // object case (populated): try common keys
          if (typeof c.user_id === 'object') {
            const maybe = c.user_id._id || c.user_id.id || c.user_id;
            return candidateIds.has(String(maybe));
          }
          return false;
        }) || null;
      }
    } catch (e) {
      console.warn('Could not fetch cards', e);
    }

    // Allow admins to log in even if they have no card assigned.
    // Regular users still require a card and it must not be blocked.
    // MODIFICATION: On autorise la connexion même sans carte ou si elle est bloquée
    /*
    if (!card) {
      const isAdmin = (typeof user.role === 'string' && user.role.toLowerCase() === 'admin') ||
                      (typeof user.username === 'string' && user.username.toLowerCase() === 'admin');
      if (isAdmin) {
        // Admin has no card: allow login, return user with null card
        return { user, card: null, token };
      }
      throw new Error('Aucune carte associée à ce compte');
    }

    if (card.status === 'blocked' || card.status === 'inactive') {
       // Backend uses 'inactive', but let's handle 'blocked' just in case
       // Actually, for login purposes, maybe we want to allow login but show blocked status?
       // The original code threw an error.
       throw new Error('Votre carte est bloquée');
    }
    */

    return { user, card, token };
  },

  // Card operations
  getAllCards: async () => {
    const response = await fetch(`${API_BASE_URL}/v1/card`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Erreur lors de la récupération des cartes');
    return response.json();
  },

  getCard: async (cardId) => {
    const response = await fetch(`${API_BASE_URL}/v1/card/${cardId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Erreur lors de la récupération de la carte');
    return response.json();
  },

  createCard: async (cardData) => {
    const response = await fetch(`${API_BASE_URL}/v1/card`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(cardData)
    });
    if (!response.ok) throw new Error('Erreur lors de la création de la carte');
    return response.json();
  },

  updateCard: async (cardId, updates) => {
    const response = await fetch(`${API_BASE_URL}/v1/card/${cardId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Erreur lors de la mise à jour de la carte');
    return response.json();
  },

  blockCard: async (cardId) => {
    // Backend supports 'inactive'
    const response = await fetch(`${API_BASE_URL}/v1/card/${cardId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: 'inactive' })
    });
    if (!response.ok) throw new Error('Erreur lors du blocage de la carte');
    return response.json();
  },

  assignCard: async (cardId, userId) => {
    const response = await fetch(`${API_BASE_URL}/v1/card/${cardId}/assign`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_id: userId })
    });
    if (!response.ok) throw new Error("Erreur lors de l'assignation de la carte");
    return response.json();
  },

  unassignCard: async (cardId) => {
    const response = await fetch(`${API_BASE_URL}/v1/card/${cardId}/assign`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Erreur lors de la désassignation de la carte");
    return response.json();
  },

  deleteCard: async (cardId) => {
    const response = await fetch(`${API_BASE_URL}/v1/card/${cardId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Erreur lors de la suppression de la carte");
  },

  // User operations
  getAllUsers: async () => {
    const response = await fetch(`${API_BASE_URL}/v1/user`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Erreur lors de la récupération des utilisateurs');
    return response.json();
  },

  getUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/v1/user/${userId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Erreur lors de la récupération de l'utilisateur");
    return response.json();
  },

  createUser: async (userData) => {
    const response = await fetch(`${API_BASE_URL}/v1/user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData)
    });
    if (!response.ok) throw new Error("Erreur lors de la création de l'utilisateur");
    return response.json();
  },

  updateUser: async (userId, updates) => {
    const response = await fetch(`${API_BASE_URL}/v1/user/${userId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error("Erreur lors de la mise à jour de l'utilisateur");
    return response.json();
  },

  deleteUser: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/v1/user/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Erreur lors de la suppression de l'utilisateur");
  },

  getUserByCardId: async (cardId) => {
    const response = await fetch(`${API_BASE_URL}/v1/user?card_id=${cardId}`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error('Utilisateur non trouvé');
    return response.json();
  },

  getUserBalance: async (userId) => {
    const response = await fetch(`${API_BASE_URL}/v1/user/${userId}/balance`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Erreur lors de la récupération du solde");
    return response.json();
  },

  // Transactions
  getTransactions: async () => {
    const response = await fetch(`${API_BASE_URL}/v1/transactions`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Erreur lors de la récupération des transactions");
    return response.json();
  },

  createTransaction: async (transactionData) => {
    const response = await fetch(`${API_BASE_URL}/v1/transactions`, {
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

  // Beneficiaries
  getBeneficiaries: async () => {
    const response = await fetch(`${API_BASE_URL}/v1/user/me/beneficiaries`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Erreur lors de la récupération des bénéficiaires");
    return response.json();
  },

  addBeneficiary: async (userId, comment = '') => {
    const response = await fetch(`${API_BASE_URL}/v1/user/me/beneficiaries`, {
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
    const response = await fetch(`${API_BASE_URL}/v1/user/me/beneficiaries/${userId}`, {
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
    const response = await fetch(`${API_BASE_URL}/v1/user/me/beneficiaries/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!response.ok) throw new Error("Erreur lors de la suppression du bénéficiaire");
  }
};
