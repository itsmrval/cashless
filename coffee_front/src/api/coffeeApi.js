import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour logger les requêtes (utile pour le debug)
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Attend qu'une carte soit scannée sur le lecteur
 */
export const waitForCard = async (timeout = 30) => {
  try {
    const response = await api.get('/wait-card', {
      params: { timeout },
      timeout: (timeout + 5) * 1000 // Timeout HTTP un peu plus long
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 408) {
      throw new Error('Timeout: Veuillez scanner votre carte');
    }
    throw new Error('Erreur lors de la lecture de la carte');
  }
};

/**
 * Récupère l'ID de la carte actuellement scannée
 */
export const getCurrentCard = async () => {
  try {
    const response = await api.get('/current-card');
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Aucune carte scannée');
    }
    throw new Error('Erreur lors de la récupération de la carte');
  }
};

/**
 * Récupère le menu complet des produits
 */
export const getMenu = async () => {
  try {
    const response = await api.get('/menu');
    return response.data;
  } catch (error) {
    throw new Error('Impossible de récupérer le menu');
  }
};

/**
 * Récupère les informations de l'utilisateur par l'ID de la carte
 */
export const getUserInfo = async (cardId) => {
  try {
    const response = await api.get(`/user/${cardId}`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Carte non trouvée ou non assignée');
    }
    throw new Error('Impossible de récupérer les informations utilisateur');
  }
};

/**
 * Vérifie le code PIN pour une carte
 * Note: Cette fonction devra être implémentée côté API Python
 */
export const verifyPin = async (cardId, pin) => {
  try {
    const response = await api.post('/verify-pin', {
      card_id: cardId,
      pin: pin
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Code PIN incorrect');
    }
    throw new Error('Erreur lors de la vérification du PIN');
  }
};

/**
 * Effectue un paiement
 * Note: Cette fonction devra être implémentée côté API Python
 */
export const processPayment = async (cardId, items, totalAmount, pin) => {
  try {
    const response = await api.post('/payment', {
      card_id: cardId,
      items: items,
      total_amount: totalAmount,
      pin: pin
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      throw new Error('Solde insuffisant');
    }
    if (error.response?.status === 401) {
      throw new Error('Code PIN incorrect');
    }
    throw new Error('Erreur lors du paiement');
  }
};

/**
 * Vérifie la santé de l'API
 */
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('API non disponible');
  }
};

export default api;
