import React from 'react';
import { User, ShieldCheck, Loader2 } from 'lucide-react';
import CardList from './cards/CardList';

function AccountOverview({ 
  cards = [], 
  currentCardId, 
  onSelectCard, 
  onToggleStatus,
  onRefresh,
  refreshing = false,
  userData, 
  balance = 0,
  loading 
}) {
  const currentCard = cards.find(c => c._id === currentCardId) || cards[0] || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 font-sans">
      
      {/* --- Section Cartes avec CardList --- */}
      <CardList
        cards={cards}
        currentCardId={currentCardId}
        onSelectCard={onSelectCard}
        onToggleStatus={onToggleStatus}
        onRefresh={onRefresh}
        refreshing={refreshing}
        userName={userData?.name}
        balance={balance}
      />

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

        {/* Carte État de la Carte sélectionnée */}
        <div className="group bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-100 p-6 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Carte sélectionnée</h3>
          </div>

          {currentCard ? (
            <div className="space-y-5 relative z-10">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span className="text-sm text-slate-500 font-medium">État actuel</span>
                <div>
                  {currentCard?.status === 'active' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active
                    </span>
                  )}
                  {currentCard?.status === 'inactive' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span> Inactive
                    </span>
                  )}
                  {currentCard?.status === 'waiting_activation' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"></span> En attente
                    </span>
                  )}
                  {currentCard?.status === 'blocked' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> Bloquée
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase tracking-wide mb-1">ID de la Carte</span>
                <span className="text-slate-600 font-mono text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                  {currentCard?._id}
                </span>
              </div>

              {currentCard?.puk && (
                <div className="pt-2 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wide mb-1">Code PUK</span>
                    <span className="text-slate-800 font-mono font-bold text-sm bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                      {currentCard.puk}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">
              <p>Aucune carte sélectionnée</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AccountOverview;