import React, { useState, useMemo } from 'react';
import { api } from '../api/api';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Lock,
  Unlock,
  CreditCard,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import CardList from './cards/CardList';
import CardItem from './cards/CardItem';

// Fonction utilitaire pour formater les dates
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

function CardManagement({ 
  cards = [], 
  currentCardId, 
  onSelectCard, 
  onToggleStatus,
  userData, 
  onCardUpdate,
  onRefreshCards,
  refreshing = false
}) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expanded, setExpanded] = useState(false);

  const currentCard = cards.find(c => c._id === currentCardId) || cards[0] || null;
  const otherCards = cards.filter(c => c._id !== (currentCard?._id));

  // Handler pour sélectionner une carte et fermer la liste
  const handleSelectCard = (cardId) => {
    onSelectCard?.(cardId);
    setExpanded(false);
  };

  const statusConfig = useMemo(() => {
    const status = currentCard?.status;
    const configs = {
      active: { label: 'Active', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
      inactive: { label: 'Inactive', text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', dot: 'bg-slate-500' },
      waiting_activation: { label: "En attente", text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
      blocked: { label: 'Bloquée', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' }
    };
    return configs[status] || { label: status || '-', text: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-200', dot: 'bg-gray-500' };
  }, [currentCard?.status]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleToggleCardStatus = async (cardId) => {
    const targetCard = cards.find(c => c._id === cardId);
    if (!targetCard) return;

    const isActive = targetCard.status === 'active';
    const actionMessage = isActive ? 'désactiver' : 'activer';
    const successMessage = isActive ? 'désactivée' : 'activée';

    if (!window.confirm(`Êtes-vous sûr de vouloir ${actionMessage} cette carte ?`)) return;

    setLoading(true);
    setActionType('toggle');
    clearMessages();

    try {
      await onToggleStatus(cardId);
      setSuccess(`La carte a été ${successMessage} avec succès.`);
    } catch (err) {
      setError(err.message || `Une erreur est survenue lors du changement de statut.`);
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setActionType('refresh');
    clearMessages();
    
    try {
      await onRefreshCards?.();
      setSuccess('Informations des cartes mises à jour.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Impossible de rafraîchir les données.');
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  // Si pas de cartes
  if (!cards || cards.length === 0) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 font-sans">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Gestion des cartes</h2>
            <p className="text-base text-slate-500 mt-1">Gérez vos cartes et leur sécurité.</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-all"
            aria-label="Actualiser les informations"
          >
            {(loading && actionType === 'refresh') || refreshing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </button>
        </div>

        <CardList
          cards={[]}
          userName={userData?.name}
          refreshing={refreshing}
          showBalance={false}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      
      {/* --- En-tête et Actions --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Gestion des cartes</h2>
          <p className="text-base text-slate-500 mt-1">
            {cards.length > 1 
              ? `Vous avez ${cards.length} cartes. Sélectionnez une carte pour la gérer.`
              : 'Gérez les informations et la sécurité de votre carte.'
            }
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-all"
            aria-label="Actualiser les informations"
          >
            {(loading && actionType === 'refresh') || refreshing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* --- Alertes de Statut --- */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      {/* --- Section Cartes avec même style que CardList --- */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-slate-400" />
          {expanded ? 'Toutes les cartes' : 'Carte sélectionnée'}
        </h3>

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
                  onToggleStatus={handleToggleCardStatus}
                  userName={userData?.name}
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
                  onToggleStatus={handleToggleCardStatus}
                  userName={userData?.name}
                />
              </div>

              {/* Autres cartes - même taille, en dessous */}
              {otherCards.map((card) => (
                <div key={card._id} className="transition-all duration-300 hover:scale-[1.01]">
                  <CardItem
                    card={card}
                    isSelected={false}
                    onSelect={handleSelectCard}
                    onToggleStatus={handleToggleCardStatus}
                    userName={userData?.name}
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

      {/* --- Grille d'Informations de la carte sélectionnée --- */}
      {currentCard && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Carte "Détails" */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 space-y-5">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Détails de la carte</h4>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Numéro de carte</p>
              <p className="font-mono mt-1 text-sm text-slate-800 bg-slate-50 px-2 py-1 rounded w-fit border border-slate-200">
                {currentCard?._id || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Titulaire</p>
              <p className="mt-1 text-base font-medium text-slate-900">
                {userData?.name || 'N/A'}
              </p>
            </div>
          </div>

          {/* Carte "Statut" */}
          <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 space-y-5">
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Statut & Actions</h4>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Statut</p>
              <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${currentCard?.status === 'active' ? 'animate-pulse' : ''}`}></span>
                {statusConfig.label}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Date de création</p>
              <p className="mt-1 text-base font-medium text-slate-900">
                {formatDate(currentCard?.createdAt)}
              </p>
            </div>

            {/* Action rapide */}
            {(currentCard?.status === 'active' || currentCard?.status === 'inactive') && (
              <button
                onClick={() => handleToggleCardStatus(currentCard._id)}
                disabled={loading}
                className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg shadow-sm font-medium transition-all ${
                  currentCard?.status === 'active'
                    ? 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-400'
                } disabled:cursor-not-allowed`}
              >
                {loading && actionType === 'toggle' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : currentCard?.status === 'active' ? (
                  <Lock className="h-5 w-5" />
                ) : (
                  <Unlock className="h-5 w-5" />
                )}
                {currentCard?.status === 'active' ? 'Désactiver cette carte' : 'Activer cette carte'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* --- Section Sécurité (Callout) --- */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex items-start gap-4">
        <div className="flex-shrink-0 p-2.5 bg-slate-200 rounded-full">
           <Lock className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-800">Sécurité</h3>
          <p className="text-sm text-slate-600 mt-1">
            Vos codes PUK sont enregistrés en sécurité dans nos systèmes. En cas de perte ou d'oubli, veuillez contacter le support client pour les récupérer.
            {cards.length > 1 && ' Chaque carte peut être verrouillée individuellement.'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CardManagement;