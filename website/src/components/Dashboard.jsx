import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AccountOverview from './AccountOverview';
import TransactionsList from './TransactionsList';
import CardManagement from './CardManagement';
import BeneficiariesManager from './BeneficiariesManager';
import Settings from './Settings';
import MainLayout from './MainLayout';
import { api } from '../api/api';

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    user, 
    cards, 
    card, 
    currentCardId, 
    selectCard, 
    toggleCardStatus,
    updateCardData, 
    updateUserData,
    refreshCards 
  } = useAuth();

  const getTabFromPath = (pathname) => {
    if (pathname === '/') return 'overview';
    const tab = pathname.substring(1);
    return ['overview', 'transactions', 'beneficiaries', 'card', 'settings'].includes(tab) ? tab : 'overview';
  };

  const [activeTab, setActiveTab] = useState(getTabFromPath(location.pathname));
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.id || user?._id || user?.userId || null;

  useEffect(() => {
    const tab = getTabFromPath(location.pathname);
    setActiveTab(tab);
  }, [location.pathname]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const path = tab === 'overview' ? '/' : `/${tab}`;
    navigate(path);
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setBalance(0);
      setTransactions([]);
      return;
    }
    loadDashboardData(userId);
  }, [userId]);

  const loadDashboardData = async (currentUserId = userId) => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [balanceData, transData] = await Promise.all([
        api.getUserBalance(currentUserId).catch(err => {
          console.error('Failed to fetch balance:', err);
          return { balance: 0 };
        }),
        api.getTransactions(currentUserId).catch(err => {
          console.error('Failed to fetch transactions:', err);
          return { transactions: [] };
        })
      ]);
      setBalance(balanceData.balance || 0);
      setTransactions(transData.transactions || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler pour toggle le statut d'une carte
  const handleToggleCardStatus = async (cardId) => {
    try {
      await toggleCardStatus(cardId);
    } catch (err) {
      console.error('Error toggling card status:', err);
    }
  };

  // Handler pour rafraîchir les cartes manuellement
  const handleRefreshCards = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCards?.();
    } finally {
      setRefreshing(false);
    }
  }, [refreshCards]);

  return (
    <MainLayout
      activeTab={activeTab}
      setActiveTab={handleTabChange}
    >
      {activeTab === 'overview' && (
        <AccountOverview
          cards={cards}
          currentCardId={currentCardId}
          onSelectCard={selectCard}
          onToggleStatus={handleToggleCardStatus}
          onRefresh={handleRefreshCards}
          refreshing={refreshing}
          userData={user}
          balance={balance}
          loading={loading}
        />
      )}
      {activeTab === 'transactions' && (
        <TransactionsList
          transactions={transactions}
          userId={userId}
          loading={loading}
          onRefresh={loadDashboardData}
        />
      )}
      {activeTab === 'beneficiaries' && (
        <BeneficiariesManager />
      )}
      {activeTab === 'card' && (
        <CardManagement
          cards={cards}
          currentCardId={currentCardId}
          onSelectCard={selectCard}
          onToggleStatus={handleToggleCardStatus}
          userData={user}
          onCardUpdate={updateCardData}
          onRefreshCards={handleRefreshCards}
          refreshing={refreshing}
        />
      )}
      {activeTab === 'settings' && (
        <Settings
          user={user}
          onUserUpdate={updateUserData}
        />
      )}
    </MainLayout>
  );
}

export default Dashboard;