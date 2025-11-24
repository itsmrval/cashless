// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api'; // Assurez-vous que le chemin vers votre API est correct

const normalizeUser = (userData) => {
  if (!userData) return null;
  const normalizedId = userData.id || userData._id || userData.userId || null;
  if (!normalizedId) {
    return { ...userData };
  }

  return {
    ...userData,
    id: userData.id || normalizedId,
    _id: userData._id || normalizedId,
    userId: userData.userId || normalizedId
  };
};

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
      const storedToken = localStorage.getItem('cashless_token');

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        const normalizedUser = normalizeUser(parsedUser);
        setUser(normalizedUser);
        localStorage.setItem('cashless_user', JSON.stringify(normalizedUser));
        if (storedCard && storedCard !== 'undefined') {
           setCard(JSON.parse(storedCard));
        }
      } else {
        localStorage.removeItem('cashless_user');
        localStorage.removeItem('cashless_card');
        localStorage.removeItem('cashless_token');
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
    
    console.log('Login data:', data); // Debug

    const normalizedUser = normalizeUser(data.user);

    // Enregistrer l'état et dans localStorage
    setUser(normalizedUser);
    setCard(data.card);
    localStorage.setItem('cashless_user', JSON.stringify(normalizedUser));
    localStorage.setItem('cashless_card', JSON.stringify(data.card));
    // Token is already set by api.login

    // Redirection basée sur le rôle (votre objectif !)
    const userRole = normalizedUser?.role?.toLowerCase();
    const isUserAdmin = userRole === 'admin' || normalizedUser?.username?.toLowerCase() === 'admin';
    console.log('User role:', userRole); // Debug
    
    if (isUserAdmin) {
      console.log('Redirecting to /admin'); // Debug
      navigate('/admin');
    } else {
      console.log('Redirecting to /'); // Debug
      navigate('/');
    }
  };

  // Fonction de déconnexion
  const logout = () => {
    setUser(null);
    setCard(null);
    localStorage.removeItem('cashless_user');
    localStorage.removeItem('cashless_card');
    localStorage.removeItem('cashless_token');
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
    isAdmin: (user?.role?.toLowerCase() === 'admin') || (user?.username?.toLowerCase() === 'admin'),
    isLoading, // Utile pour ne pas afficher le site avant de savoir si on est connecté
    login,
    logout,
    updateCardData, // Fournit la fonction pour mettre à jour la carte
  };

  console.log('AuthContext value:', { 
    user, 
    isAuthenticated: !!user, 
    isAdmin: (user?.role?.toLowerCase() === 'admin') || (user?.username?.toLowerCase() === 'admin'),
    role: user?.role 
  }); // Debug

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