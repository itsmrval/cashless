import React from 'react';

const UserInfo = ({ user, cardId }) => {
  if (!user) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-coffee-600 to-coffee-800 rounded-xl shadow-lg p-6 text-white fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm opacity-80">Bienvenue</p>
          <h2 className="text-2xl font-bold">{user.name}</h2>
        </div>
        <div className="bg-white bg-opacity-20 rounded-full p-3">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      </div>
      
      <div className="flex items-baseline space-x-2 mb-2">
        <span className="text-3xl font-bold">{user.balance.toFixed(2)} €</span>
        <span className="text-sm opacity-80">disponible</span>
      </div>
      
      <div className="flex items-center justify-between text-sm opacity-80">
        <span>Carte: {cardId}</span>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Actif</span>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;
