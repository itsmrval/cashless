import React, { useState } from 'react';
import AccountOverview from './dashboard/AccountOverview';
import TransactionsList from './dashboard/TransactionsList';
import CardManagement from './dashboard/CardManagement';
import MainLayout from './layout/MainLayout';

/*
 * NOTE: 
 * Son unique rôle est de gérer l'onglet actif et de fournir les données
 * au MainLayout et aux composants enfants.
 */
function Dashboard({ cardData, userData, onCardUpdate }) {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <MainLayout
      userName={userData?.name}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
      {/* Le contenu de l'onglet actif est affiché ici par MainLayout */}
      {activeTab === 'overview' && (
        <AccountOverview cardData={cardData} userData={userData} />
      )}
      {activeTab === 'transactions' && (
        <TransactionsList cardId={cardData?._id} />
      )}
      {activeTab === 'card' && (
        <CardManagement 
          cardData={cardData} 
          userData={userData} 
          onCardUpdate={onCardUpdate}
        />
      )}
    </MainLayout>
  );
}

export default Dashboard;