import React, { useState } from 'react';
import { CreditCard, User, Wallet, ShieldCheck, Wifi, Loader2, Info } from 'lucide-react';

function AccountOverview({ cardData, userData, loading }) {
  const [showBalanceInfo, setShowBalanceInfo] = useState(false);
  const balance = cardData?.balance || 0;
  
  // Fonction utilitaire pour formater l'argent
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-8 font-sans">
      
      {/* --- Section Carte Bancaire --- */}
      <div className="relative w-full md:max-w-md mx-auto lg:mx-0 perspective-1000 transition-transform duration-300 hover:scale-[1.02]">
        
        <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-500 rounded-2xl transform rotate-1 opacity-50 blur-md -z-10"></div>
        
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl p-8 text-white border border-white/10 relative overflow-hidden h-64 flex flex-col justify-between">
          
          {/* Décorations d'arrière-plan (Cercles abstraits) */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Haut de la carte */}
          <div className="flex justify-between items-start z-10">
            <div>
               {/* Puce Électronique factice */}
              <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600 rounded-md border border-yellow-600/50 shadow-inner flex items-center justify-center relative overflow-hidden">
                  <div className="w-full h-[1px] bg-yellow-700 absolute top-1/3"></div>
                  <div className="w-full h-[1px] bg-yellow-700 absolute top-2/3"></div>
                  <div className="h-full w-[1px] bg-yellow-700 absolute left-1/3"></div>
                  <div className="h-full w-[1px] bg-yellow-700 absolute left-2/3"></div>
              </div>
            </div>
            <Wifi className="text-white/50 rotate-90 h-6 w-6" />
          </div>

          {/* Centre de la carte (Solde & Numéro) */}
          <div className="z-10 mt-4">
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Solde Actuel</p>
              <button
                title="Comment le solde est calculé"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                onClick={() => setShowBalanceInfo(s => !s)}
                aria-expanded={showBalanceInfo}
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight mb-6">
              {formatCurrency(balance)}
            </h2>
            
            <div className="flex items-center gap-4">
               <p className="font-mono text-xl md:text-2xl tracking-widest text-slate-200 drop-shadow-md">
                •••• •••• •••• {cardData?._id?.slice(-4) || '0000'}
              </p>
            </div>
          </div>

          {/* Bas de la carte (Infos & Logo) */}
          <div className="flex justify-between items-end z-10">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Titulaire</p>
              <p className="text-sm font-medium tracking-wide text-slate-100 uppercase">{userData?.name || 'Nom Inconnu'}</p>
            </div>
            
            {/* Logo MasterCard/Visa simulé */}
            <div className="flex -space-x-3 opacity-90">
               <div className="w-8 h-8 rounded-full bg-red-500/80 mix-blend-screen"></div>
               <div className="w-8 h-8 rounded-full bg-orange-400/80 mix-blend-screen"></div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Section Grille d'Informations --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        
        {/* Carte Infos Personnelles */}
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-100 p-6 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <User size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Profil</h3>
          </div>

          <div className="space-y-5 relative z-10">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-sm text-slate-500 font-medium">Nom complet</span>
              <span className="text-slate-800 font-semibold">{userData?.name}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wide mb-1">Identifiant</span>
              <span className="text-slate-600 font-mono text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                {userData?._id}
              </span>
            </div>
          </div>
        </div>

        {/* Carte État de la Carte */}
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-100 p-6 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Carte sélectionnée</h3>
          </div>

          <div className="space-y-5 relative z-10">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <span className="text-sm text-slate-500 font-medium">État actuel</span>
              <div>
                {cardData?.status === 'active' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                  </span>
                )}
                {cardData?.status === 'inactive' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Inactive
                  </span>
                )}
                {cardData?.status === 'waiting_activation' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"></span> En attente
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wide mb-1">ID de la Carte</span>
              <span className="text-slate-600 font-mono text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                {cardData?._id}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase tracking-wide mb-1">Code PUK</span>
                <span className="text-slate-800 font-mono font-bold text-sm bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                  {cardData?.puk || 'N/A'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase tracking-wide mb-1">Code PIN</span>
                <span className="text-slate-800 font-mono font-bold text-sm bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                  {cardData?.pin || '****'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AccountOverview;