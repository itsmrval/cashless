import React, { useState, useEffect } from 'react';
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
    updateUserData
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
          return { balance: 0 };
        }),
        api.getTransactions(currentUserId).catch(err => {
          return { transactions: [] };
        })
      ]);
      setBalance(balanceData.balance || 0);
      setTransactions(transData.transactions || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCardStatus = async (cardId) => {
    try {
      await toggleCardStatus(cardId);
    } catch (err) {
    }
  };

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