const API_BASE_URL = 'https://api.cashless.iut.valentinp.fr/v1';

export const api = {
  // Authentication
  login: async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/v1/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Identifiants incorrects');
    }
    
    const data = await response.json();

    return data;
  },

  // Card operations
  getCard: async (cardId) => {
    const response = await fetch(`${API_BASE_URL}/v1/card/${cardId}`);
    if (!response.ok) throw new Error('Erreur lors de la récupération de la carte');
    return response.json();
  },

  blockCard: async (cardId) => {
    const response = await fetch(`${API_BASE_URL}/v1/card/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'inactive' })
    });
    if (!response.ok) throw new Error('Erreur lors du blocage de la carte');
    return response.json();
  },

  // User operations
  getUserByCardId: async (cardId) => {
    const response = await fetch(`${API_BASE_URL}/v1/user?card_id=${cardId}`);
    if (!response.ok) throw new Error('Utilisateur non trouvé');
    return response.json();
  }
};
