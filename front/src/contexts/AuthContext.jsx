// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api'; // Assurez-vous que le chemin vers votre API est correct

// 1. Créer le contexte
const AuthContext = createContext(null);

// 2. Créer le Fournisseur (Provider)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [card, setCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Pour le chargement initial
  const navigate = useNavigate();

  // Effet pour charger l'utilisateur depuis localStorage au démarrage
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('cashless_user');
      const storedCard = localStorage.getItem('cashless_card');
      if (storedUser && storedCard) {
        setUser(JSON.parse(storedUser));
        setCard(JSON.parse(storedCard));
      }
    } catch (error) {
      console.error("Impossible de réhydrater la session", error);
      localStorage.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fonction de connexion
  const login = async (username, password) => {
    const data = await api.login(username, password); // Laisse l'erreur se propager
    
    // Enregistrer l'état et dans localStorage
    setUser(data.user);
    setCard(data.card);
    localStorage.setItem('cashless_user', JSON.stringify(data.user));
    localStorage.setItem('cashless_card', JSON.stringify(data.card));

    // Redirection basée sur le rôle (votre objectif !)
    if (data.user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    setUser(null);
    setCard(null);
    localStorage.removeItem('cashless_user');
    localStorage.removeItem('cashless_card');
    navigate('/login');
  };

  // Fonction pour mettre à jour la carte (par ex. après un blocage)
  const updateCardData = (newCardData) => {
    setCard(newCardData);
    localStorage.setItem('cashless_card', JSON.stringify(newCardData));
  };

  // Rendre le contexte disponible pour les enfants
  const value = {
    user,
    card,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLoading, // Utile pour ne pas afficher le site avant de savoir si on est connecté
    login,
    logout,
    updateCardData, // Fournit la fonction pour mettre à jour la carte
  };

  // Ne rend rien tant que l'état initial n'est pas chargé
  if (isLoading) {
    return null; // Ou un spinner de chargement global
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 3. Créer un hook personnalisé pour un accès facile
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé au sein dun AuthProvider");
  }
  return context;
};