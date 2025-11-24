// src/components/Dashboard.jsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext'; // Importez useAuth
import AccountOverview from './AccountOverview';
import TransactionsList from './TransactionsList';
import CardManagement from './CardManagement';
import MainLayout from './MainLayout';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  // Récupérer les données directement du contexte !
  const { user, card, updateCardData } = useAuth();

  return (
    <MainLayout
      userName={user?.name}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {/* Le contenu de l'onglet actif est affiché ici par MainLayout */}
      {activeTab === 'overview' && (
        <AccountOverview cardData={card} userData={user} />
      )}
      {activeTab === 'transactions' && (
        <TransactionsList cardId={card?._id} />
      )}
      {activeTab === 'card' && (
        <CardManagement 
          cardData={card} 
          userData={user} 
          onCardUpdate={updateCardData} // Utilise la fonction du contexte
        />
      )}
    </MainLayout>
  );
}

export default Dashboard;