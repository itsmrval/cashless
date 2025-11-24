import React, { useState, useMemo } from 'react';
import { api } from '../api/api'; // Assurez-vous que ce chemin est correct
import { 
  RefreshCw, 
  Ban, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Lock 
} from 'lucide-react';

// Fonction utilitaire pour formater les dates
const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

function CardManagement({ cardData, userData, onCardUpdate }) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState(null); // 'refresh' or 'block'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Utilisation de useMemo pour ne pas recalculer statusConfig à chaque render
  const statusConfig = useMemo(() => {
    const status = cardData?.status;
    const configs = {
      active: { label: 'Active', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
      inactive: { label: 'Inactive', text: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-200', dot: 'bg-slate-500' },
      waiting_activation: { label: "En attente", text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
      blocked: { label: 'Bloquée', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' }
    };
    return configs[status] || { label: status || '-', text: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-200', dot: 'bg-gray-500' };
  }, [cardData?.status]);


  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleBlockCard = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir bloquer définitivement cette carte ?')) return;
    
    setLoading(true);
    setActionType('block');
    clearMessages();
    
    try {
      const updatedCard = await api.blockCard(cardData._id);
      onCardUpdate(updatedCard);
      setSuccess('Votre carte a été bloquée avec succès.');
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors du blocage.');
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
      const updatedCard = await api.getCard(cardData._id);
      onCardUpdate(updatedCard);
      setSuccess('Informations de la carte mises à jour.');
      setTimeout(() => setSuccess(''), 3000); // Fait disparaître le succès
    } catch (err) {
      setError(err.message || 'Impossible de rafraîchir les données.');
    } finally {
      setLoading(false);
      setActionType(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 font-sans">
      
      {/* --- En-tête et Actions --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Gestion de la Carte</h2>
          <p className="text-base text-slate-500 mt-1">Gérez les informations et la sécurité de votre carte.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-all"
            aria-label="Actualiser les informations"
          >
            {loading && actionType === 'refresh' ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
          </button>
          
          {cardData?.status === 'active' && (
            <button
              onClick={handleBlockCard}
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading && actionType === 'block' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Ban className="h-5 w-5" />
              )}
              Bloquer
            </button>
          )}
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

      {/* --- Grille d'Informations --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Carte "Détails" */}
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-100 space-y-5">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Numéro de carte</p>
            <p className="font-mono mt-1 text-sm text-slate-800 bg-slate-50 px-2 py-1 rounded w-fit border border-slate-200">
              {cardData?._id || 'N/A'}
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
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Statut</p>
            <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
              <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${cardData?.status === 'active' ? 'animate-pulse' : ''}`}></span>
              {statusConfig.label}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Date de création</p>
            <p className="mt-1 text-base font-medium text-slate-900">
              {formatDate(cardData?.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* --- Section Sécurité (Callout) --- */}
      <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex items-start gap-4">
        <div className="flex-shrink-0 p-2.5 bg-slate-200 rounded-full">
           <Lock className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-800">Sécurité et Code PUK</h3>
          <p className="text-sm text-slate-600 mt-1">
            Votre code PUK est enregistré en sécurité dans nos systèmes. En cas de perte ou d'oubli, veuillez contacter le support client pour le récupérer.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CardManagement;