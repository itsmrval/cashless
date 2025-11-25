import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  User
} from 'lucide-react';

const navItems = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'beneficiaries', label: 'Bénéficiaires', icon: Users },
  { id: 'card', label: 'Mes cartes', icon: CreditCard },
];

function Sidebar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userName = user?.name || 'Utilisateur';
  const userInitial = userName[0]?.toUpperCase() || 'U';
  const userRole = user?.role || 'Utilisateur';

  const handleAdminToggle = () => {
    navigate('/admin');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  // Contenu de la sidebar (réutilisé pour mobile et desktop)
  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      {/* Header avec logo */}
      <div className={`flex items-center gap-3 ${isMobile ? 'mb-6' : 'mb-8'}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Cashless
          </h1>
        </div>
      </div>

      {/* Section Utilisateur */}
      <div className={`${isMobile ? 'mb-6' : 'mb-8'} p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md ring-2 ring-white">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-500">Bonjour,</p>
            <p className="text-base font-semibold text-slate-900 truncate">{userName}</p>
            {isAdmin ? (
              <button
                onClick={handleAdminToggle}
                className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 hover:from-blue-200 hover:to-indigo-200 transition-all"
              >
                <ShieldCheck className="w-3 h-3" />
                Accès Admin
                <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 mt-1 text-xs text-slate-500">
                <User className="w-3 h-3" />
                {userRole}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Principale */}
      <nav className="flex-grow space-y-1.5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 mb-3">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
              <span>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Section du bas: Paramètres & Déconnexion */}
      <div className="mt-auto pt-4 border-t border-slate-200 space-y-1.5">
        <button
          onClick={() => handleNavClick('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            activeTab === 'settings'
              ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm border border-blue-100'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <Settings size={20} className={activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'} />
          <span>Paramètres</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
        >
          <LogOut size={20} className="text-slate-400 group-hover:text-red-500" />
          <span>Déconnexion</span>
        </button>

        {/* Copyright */}
        <p className="text-[10px] text-slate-400 text-center mt-4 pt-3 border-t border-slate-100">
          Cashless © {new Date().getFullYear()} — Tous droits réservés
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: Top bar with hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Cashless
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {userInitial}
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Mobile: Drawer overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile: Drawer */}
      <aside className={`
        lg:hidden fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 p-5
        transform transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <SidebarContent isMobile />
      </aside>

      {/* Desktop: Fixed sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-72 min-w-[18rem] max-w-[18rem] bg-white shadow-lg border-r border-slate-200 p-5 flex-col z-40">
        <SidebarContent />
      </aside>
    </>
  );
}

export default Sidebar;