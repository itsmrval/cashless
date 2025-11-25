import React, { useState } from 'react';
import { RefreshCw, Loader2, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import CardItem, { NoCardPlaceholder } from './CardItem';

function CardList({ 
  cards = [], 
  currentCardId,
  onSelectCard,
  userName,
  onRefresh,
  refreshing = false,
  showBalance = true,
  balance = 0
}) {
  const [expanded, setExpanded] = useState(false);

  const currentCard = cards.find(c => c._id === currentCardId) || cards[0] || null;
  const otherCards = cards.filter(c => c._id !== (currentCard?._id));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
  };

  // Handler pour sélectionner une carte et fermer la liste
  const handleSelectCard = (cardId) => {
    onSelectCard?.(cardId);
    setExpanded(false);
  };

  // Pas de cartes
  if (!cards || cards.length === 0) {
    return (
      <div className="space-y-4">
        {/* Solde */}
        {showBalance && (
          <div className="text-center mb-4">
            <p className="text-sm text-slate-500 mb-1">Solde du compte</p>
            <p className="text-4xl font-bold text-slate-900">{formatCurrency(balance)}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-400" />
            Ma carte
          </h3>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50"
              aria-label="Actualiser"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
        
        {/* Placeholder centré */}
        <div className="flex justify-center">
          <div className="w-full max-w-[340px]">
            <NoCardPlaceholder />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Solde */}
      {showBalance && (
        <div className="text-center mb-4">
          <p className="text-sm text-slate-500 mb-1">Solde du compte</p>
          <p className="text-4xl font-bold text-slate-900">{formatCurrency(balance)}</p>
          {cards.length > 1 && (
            <p className="text-xs text-slate-400 mt-1">
              Solde partagé entre vos {cards.length} cartes
            </p>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-slate-400" />
          {expanded ? 'Toutes les cartes' : (cards.length > 1 ? 'Carte sélectionnée' : 'Ma carte')}
        </h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-50"
            aria-label="Actualiser"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Mode non-étendu : carte principale + aperçu empilé */}
      {!expanded && currentCard && (
        <div className="flex justify-center">
          <div className="relative w-full max-w-[340px]">
            {/* Carte principale */}
            <div className="relative z-10">
              <CardItem
                card={currentCard}
                isSelected={true}
                onSelect={handleSelectCard}
                userName={userName}
                readOnly={true}
              />
            </div>

            {/* Aperçu empilé des autres cartes */}
            {otherCards.length > 0 && (
              <>
                {otherCards.slice(0, 2).map((card, index) => (
                  <div 
                    key={card._id}
                    className="absolute left-2 right-2 -z-10 transition-all duration-300"
                    style={{
                      top: `calc(100% - ${16 - index * 8}px)`,
                      transform: `scale(${0.95 - index * 0.03})`,
                      opacity: 0.6 - index * 0.2,
                    }}
                  >
                    <div className="h-6 bg-gradient-to-br from-slate-700 to-slate-600 rounded-b-2xl shadow-lg"></div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Mode étendu : toutes les cartes en liste verticale */}
      {expanded && (
        <div className="flex justify-center">
          <div className="flex flex-col gap-4 w-full max-w-[340px]">
            {/* Carte sélectionnée */}
            <div className="relative">
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-blue-500 rounded-r-full"></div>
              <CardItem
                card={currentCard}
                isSelected={true}
                onSelect={handleSelectCard}
                userName={userName}
                readOnly={true}
              />
            </div>

            {/* Autres cartes - même taille, en dessous */}
            {otherCards.map((card) => (
              <div key={card._id} className="transition-all duration-300 hover:scale-[1.01]">
                <CardItem
                  card={card}
                  isSelected={false}
                  onSelect={handleSelectCard}
                  userName={userName}
                  readOnly={true}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton pour voir/sélectionner les cartes */}
      {cards.length > 1 && (
        <div className="flex justify-center">
          <div className="w-full max-w-[340px]">
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-600 transition-all"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Réduire
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Voir toutes les cartes ({cards.length})
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardList;
