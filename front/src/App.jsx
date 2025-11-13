import React, { useState } from 'react';
import Login from './components/Login'; // Assure-toi que le chemin est correct
import Dashboard from './components/Dashboard'; // Assure-toi que le chemin est correct
import { CreditCard, LogOut } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cardData, setCardData] = useState(null);
  const [userData, setUserData] = useState(null);

  const handleLogin = (card, user) => {
    setCardData(card);
    setUserData(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCardData(null);
    setUserData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex flex-col font-sans text-slate-800">
      
      {/* Contenu principal qui s'étend */}
      <div className="flex-grow flex flex-col">
        {!isAuthenticated ? (
          
          // --- ÉTAT DÉCONNECTÉ (Page de Login) ---
          <div className="flex-grow flex flex-col justify-center items-center p-4">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-blue-700">Cashless</h1>
              <p className="text-slate-500 mt-1">Connectez-vous pour gérer votre compte.</p>
            </div>
            
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
              <Login onLogin={handleLogin} />
            </div>
          </div>

        ) : (
          
          // --- ÉTAT CONNECTÉ (Dashboard Shell) ---
          <div className="flex-grow flex flex-col w-full">
            
            {/* === Header (Navbar) === */}
            <header className="w-full bg-white/90 backdrop-blur-sm border-b border-slate-200 shadow-sm sticky top-0 z-50">
              <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  
                  {/* Logo/Brand */}
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <span className="hidden sm:block text-xl font-bold text-blue-700">Cashless</span>
                  </div>
                  
                  {/* Menu Utilisateur & Déconnexion */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors px-3 py-2 rounded-lg hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      Déconnexion
                    </button>
                  </div>
                </div>
              </nav>
            </header>

            {/* === Contenu Principal (Dashboard) === */}
            <main className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
              <Dashboard 
                cardData={cardData} 
                userData={userData} 
                onCardUpdate={setCardData}
                // onLogout est maintenant géré par le Header ci-dessus
              />
            </main>
          </div>
        )}
      </div>

      {/* --- Footer (Toujours en bas) --- */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50">
        Cashless &copy; {new Date().getFullYear()} — Tous droits réservés
      </footer>
    </div>
  );
}

export default App;