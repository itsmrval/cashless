import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, CreditCard, ShieldCheck, User } from 'lucide-react';

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
    waiting_activation: { text: "En attente", color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
  };

  const status = statusConfig[card?.status] || { text: card?.status || '-', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-4 z-50 shadow-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo et Statut */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Cashless
            </h1>
          </div>
          {card && (
            <span className={`hidden sm:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border ${status.bg} ${status.color} ${status.border}`}>
              {status.text}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              {isAdmin ? (
                <button
                  onClick={handleRoleClick}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 hover:from-blue-200 hover:to-indigo-200 transition-all"
                  title={isAdminView ? 'Passer à la vue utilisateur' : 'Passer à la vue admin'}
                >
                  {isAdminView ? <ShieldCheck className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {isAdminView ? 'Admin' : user?.role || 'Admin'}
                </button>
              ) : (
                <p className="text-xs text-slate-500">{user?.role || 'Utilisateur'}</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>

          {/* Logout */}
          <button 
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-200"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Déconnexion</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
