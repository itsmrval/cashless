import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  CreditCard, 
  LifeBuoy 
} from 'lucide-react';

// Définition des onglets pour un code plus propre
const navItems = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'card', label: 'Ma carte', icon: CreditCard },
];

function Sidebar({ activeTab, setActiveTab, userName }) {
  const userInitial = userName ? userName[0].toUpperCase() : 'U';

  return (
    <aside className="w-72 bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col h-full">
      
      {/* --- Section Utilisateur --- */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
            {userInitial}
          </div>
          <div>
            <p className="text-sm text-slate-500">Bonjour,</p>
            <p className="text-lg font-semibold text-slate-900">{userName || 'Utilisateur'}</p>
          </div>
        </div>
      </div>

      {/* --- Navigation Principale --- */}
      <nav className="flex-grow space-y-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-bold shadow-inner-sm border border-blue-100'
                  : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={20} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* --- Section Support (Poussée en bas) --- */}
      <div className="mt-6 border-t border-slate-200 pt-4">
        <a
          href="#"
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <LifeBuoy size={20} className="text-slate-400" />
          <span>Support</span>
        </a>
      </div>
    </aside>
  );
}

export default Sidebar;