import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AccountOverview from './AccountOverview';
import TransactionsList from './TransactionsList';
import CardManagement from './CardManagement';
import BeneficiariesManager from './BeneficiariesManager';
import MainLayout from './MainLayout';
import { api } from '../api/api';

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, card, updateCardData } = useAuth();

  const getTabFromPath = (pathname) => {
    if (pathname === '/') return 'overview';
    const tab = pathname.substring(1);
    return ['overview', 'transactions', 'beneficiaries', 'card'].includes(tab) ? tab : 'overview';
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

  const normalizeId = (value) => {
    if (!value) return null;
    if (typeof value === 'object') {
      return value._id || value.id || value.userId || value.toString?.() || null;
    }
    return String(value);
  };

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
        api.getTransactions().catch(err => {
          console.error('Failed to fetch transactions:', err);
          return [];
        })
      ]);
      setBalance(balanceData.balance || 0);
      setTransactions(transData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout
      userName={user?.name}
      activeTab={activeTab}
      setActiveTab={handleTabChange}
    >
      {/* Le contenu de l'onglet actif est affiché ici par MainLayout */}
      {activeTab === 'overview' && (
        <AccountOverview 
          cardData={{ ...card, balance }} 
          userData={user} 
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
          cardData={card}
          userData={user}
          onCardUpdate={updateCardData}
        />
      )}
    </MainLayout>
  );
}

export default Dashboard;