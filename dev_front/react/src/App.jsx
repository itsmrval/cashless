import React, { useState } from 'react';
import UsersTab from './components/UsersTab';
import CardsTab from './components/CardsTab';

function App() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">Cashless - Administration</h1>
        <div className="flex gap-4 border-b mb-8">
          <button
            className={`py-2 px-6 font-medium border-b-2 transition-colors ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('users')}
          >
            Utilisateurs
          </button>
          <button
            className={`py-2 px-6 font-medium border-b-2 transition-colors ${activeTab === 'cards' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('cards')}
          >
            Cartes
          </button>
        </div>
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'cards' && <CardsTab />}
      </div>
    </div>
  );
}

export default App;
