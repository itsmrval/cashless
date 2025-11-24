import React from 'react';

function Header({ userName, cardStatus, onLogout }) {
  const statusLabel = {
    active: { text: 'Active', color: 'text-green-600', bg: 'bg-green-50' },
    inactive: { text: 'Inactive', color: 'text-red-600', bg: 'bg-red-50' },
    waiting_activation: { text: "En attente", color: 'text-yellow-600', bg: 'bg-yellow-50' },
    blocked: { text: 'Bloquée (blocked)', color: 'text-red-700', bg: 'bg-red-50' }
  }[cardStatus] || { text: cardStatus || '-', color: 'text-gray-600', bg: 'bg-gray-50' };

  return (
    <header className="flex items-center justify-between gap-6 py-4">
      <div className="flex items-center gap-4">
        <div className="text-2xl font-bold text-blue-700">💳 Cashless</div>
        <div className="hidden sm:flex items-center gap-3 text-sm text-gray-600">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabel.bg} ${statusLabel.color}`}>{statusLabel.text}</span>
          <span className="text-gray-400">•</span>
          <span>{userName}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center bg-white border border-gray-100 rounded-full px-3 py-1 shadow-sm">
          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input className="w-44 outline-none text-sm bg-transparent" placeholder="Rechercher" />
        </div>

        <button className="relative p-2 rounded-full hover:bg-gray-100 transition">
          <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center font-semibold">{userName ? userName[0] : 'U'}</div>
          <button onClick={onLogout} className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50">Déconnexion</button>
        </div>
      </div>
    </header>
  );
}

export default Header;
