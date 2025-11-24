// src/layouts/UserLayout.jsx
// (C'est la partie "connectée" de votre ancien App.jsx)
import React from 'react';
import { Outlet } from 'react-router-dom'; // Important !
import { LogOut, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UserLayout() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex flex-col font-sans text-slate-800">
      
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
                onClick={logout} // Utilise le logout du contexte
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
        {/* C'est ici que le Router affichera le composant de la route (ex: Dashboard) */}
        <Outlet />
      </main>

      {/* --- Footer (Toujours en bas) --- */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50">
        Cashless &copy; {new Date().getFullYear()} — Tous droits réservés
      </footer>
    </div>
  );
}