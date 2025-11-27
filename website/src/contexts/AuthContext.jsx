import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/api';

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

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentCardId, setCurrentCardId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const card = cards.find(c => c._id === currentCardId) || cards[0] || null;

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('cashless_user');
      const storedCards = localStorage.getItem('cashless_cards');
      const storedCurrentCardId = localStorage.getItem('cashless_currentCardId');
      const storedToken = localStorage.getItem('cashless_token');

      if (storedUser && storedToken) {
        const parsedUser = JSON.parse(storedUser);
        const normalizedUser = normalizeUser(parsedUser);
        setUser(normalizedUser);
        localStorage.setItem('cashless_user', JSON.stringify(normalizedUser));

        if (storedCards && storedCards !== 'undefined') {
          const parsedCards = JSON.parse(storedCards);
          setCards(Array.isArray(parsedCards) ? parsedCards : []);
        }
        if (storedCurrentCardId && storedCurrentCardId !== 'undefined') {
          setCurrentCardId(storedCurrentCardId);
        }
      } else {
        localStorage.removeItem('cashless_user');
        localStorage.removeItem('cashless_cards');
        localStorage.removeItem('cashless_currentCardId');
        localStorage.removeItem('cashless_token');
      }
    } catch (error) {
      console.error("Impossible de réhydrater la session", error);
      localStorage.clear();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const userId = user?.id || user?._id || user?.userId;
    if (!userId) return;

    const pollInterval = setInterval(async () => {
      try {
        const userCards = await fetchUserCards(userId);
        setCards(userCards);
        localStorage.setItem('cashless_cards', JSON.stringify(userCards));

        if (currentCardId && !userCards.find(c => c._id === currentCardId)) {
          const newCurrentId = userCards[0]?._id || null;
          setCurrentCardId(newCurrentId);
          localStorage.setItem('cashless_currentCardId', newCurrentId || '');
        }
      } catch (error) {
        console.error('Error polling cards:', error);
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [user, currentCardId]);

  const fetchUserCards = async (userId) => {
    try {
      const allCards = await api.getAllCards();
      const candidateIds = new Set();
      if (userId) candidateIds.add(String(userId));

      const userCards = allCards.filter(c => {
        if (!c.user_id) return false;
        if (typeof c.user_id === 'string') return candidateIds.has(String(c.user_id));
        if (typeof c.user_id === 'object') {
          const maybe = c.user_id._id || c.user_id.id || c.user_id;
          return candidateIds.has(String(maybe));
        }
        return false;
      });

      return userCards;
    } catch (e) {
      console.warn('Could not fetch cards', e);
      return [];
    }
  };

  const login = async (username, password) => {
    const data = await api.login(username, password);

    const normalizedUser = normalizeUser(data.user);
    const userId = normalizedUser?.id || normalizedUser?._id || normalizedUser?.userId;

    const userCards = await fetchUserCards(userId);

    setUser(normalizedUser);
    setCards(userCards);

    const activeCard = userCards.find(c => c.status === 'active') || userCards[0];
    const selectedCardId = activeCard?._id || null;
    setCurrentCardId(selectedCardId);

    localStorage.setItem('cashless_user', JSON.stringify(normalizedUser));
    localStorage.setItem('cashless_cards', JSON.stringify(userCards));
    localStorage.setItem('cashless_currentCardId', selectedCardId || '');

    const userRole = normalizedUser?.role?.toLowerCase();
    const isUserAdmin = userRole === 'admin' || normalizedUser?.username?.toLowerCase() === 'admin';

    if (isUserAdmin) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const logout = () => {
    setUser(null);
    setCards([]);
    setCurrentCardId(null);
    localStorage.removeItem('cashless_user');
    localStorage.removeItem('cashless_cards');
    localStorage.removeItem('cashless_currentCardId');
    localStorage.removeItem('cashless_token');
    localStorage.removeItem('cashless_user_id');
    navigate('/login');
  };

  const selectCard = (cardId) => {
    setCurrentCardId(cardId);
    localStorage.setItem('cashless_currentCardId', cardId || '');
  };

  const updateCardData = (updatedCard) => {
    setCards(prevCards => {
      const newCards = prevCards.map(c =>
        c._id === updatedCard._id ? updatedCard : c
      );
      localStorage.setItem('cashless_cards', JSON.stringify(newCards));
      return newCards;
    });
  };

  const refreshCards = async () => {
    const userId = user?.id || user?._id || user?.userId;
    if (!userId) return;

    const userCards = await fetchUserCards(userId);
    setCards(userCards);
    localStorage.setItem('cashless_cards', JSON.stringify(userCards));

    if (currentCardId && !userCards.find(c => c._id === currentCardId)) {
      const newCurrentId = userCards[0]?._id || null;
      setCurrentCardId(newCurrentId);
      localStorage.setItem('cashless_currentCardId', newCurrentId || '');
    }
  };

  const toggleCardStatus = async (cardId) => {
    const targetCard = cards.find(c => c._id === cardId);
    if (!targetCard) return;

    const newStatus = targetCard.status === 'active' ? 'inactive' : 'active';
    const updatedCard = await api.updateCard(cardId, { status: newStatus });
    updateCardData(updatedCard);
    return updatedCard;
  };

  const updateUserData = (newUserData) => {
    const normalizedUser = normalizeUser(newUserData);
    setUser(normalizedUser);
    localStorage.setItem('cashless_user', JSON.stringify(normalizedUser));
  };

  const value = {
    user,
    cards,
    card,
    currentCardId,
    selectCard,
    refreshCards,
    toggleCardStatus,
    isAuthenticated: !!user,
    isAdmin: (user?.role?.toLowerCase() === 'admin') || (user?.username?.toLowerCase() === 'admin'),
    isLoading,
    login,
    logout,
    updateCardData,
    updateUserData,
  };

  if (isLoading) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé au sein d'un AuthProvider");
  }
  return context;
};