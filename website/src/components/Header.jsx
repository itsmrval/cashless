import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Bell, Search } from 'lucide-react';

function Header() {
  const { user, card, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role?.toLowerCase() === 'admin' || user?.username?.toLowerCase() === 'admin';
  const isAdminView = location.pathname.startsWith('/admin');

  const handleRoleClick = () => {
    if (isAdmin) {
      if (isAdminView) {
        navigate('/');
      } else {
        navigate('/admin');
      }
    }
  };

  const statusConfig = {
    active: { text: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    inactive: { text: 'Inactive', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    waiting_activation: { text: "En attente", color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    blocked: { text: 'Bloquée', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' }
  };

  const status = statusConfig[card?.status] || { text: card?.status || '-', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo et Statut */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="text-2xl">💳</div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Cashless
            </h1>
          </div>
          {card && (
            <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${status.bg} ${status.color} ${status.border}`}>
              {status.text}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Search - masqué sur mobile */}
          <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input 
              className="w-44 outline-none text-sm bg-transparent placeholder-slate-400" 
              placeholder="Rechercher" 
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              {isAdmin ? (
                <button
                  onClick={handleRoleClick}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
                  title={isAdminView ? 'Passer à la vue utilisateur' : 'Passer à la vue admin'}
                >
                  {user?.role || 'Admin'}
                </button>
              ) : (
                <p className="text-xs text-slate-500">{user?.role || 'Utilisateur'}</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <button 
              onClick={logout}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile: Statut de la carte */}
      {card && (
        <div className="sm:hidden mt-3 flex justify-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${status.bg} ${status.color} ${status.border}`}>
            {status.text}
          </span>
        </div>
      )}
    </header>
  );
}

export default Header;
