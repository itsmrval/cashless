import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { 
  CreditCard, 
  Plus, 
  RefreshCw, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Edit2, 
  Trash2,
  UserCheck,
  UserX,
  X,
  Eye,
  Search,
  Filter,
  Key,
  Shield
} from 'lucide-react';

export default function AdminCardManagement() {
  const [cards, setCards] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Create card
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCard, setNewCard] = useState({ comment: '', puk: '' });
  
  // Edit modals
  const [editingCard, setEditingCard] = useState(null);
  const [editType, setEditType] = useState(null); // 'comment', 'status', 'assign'
  const [editValue, setEditValue] = useState('');
  
  // View public key
  const [viewingPublicKey, setViewingPublicKey] = useState(null);
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [cardsData, usersData] = await Promise.all([
        api.getAllCards(),
        api.getAllUsers()
      ]);
      setCards(cardsData);
      setUsers(usersData);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.createCard(newCard);
      setSuccess('Carte créée avec succès');
      setNewCard({ comment: '', puk: '' });
      setShowCreateForm(false);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette carte ?')) return;
    setError('');
    setSuccess('');
    try {
      await api.deleteCard(cardId);
      setSuccess('Carte supprimée');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const openEditModal = (card, type) => {
    setEditingCard(card);
    setEditType(type);
    if (type === 'comment') {
      setEditValue(card.comment || '');
    } else if (type === 'status') {
      setEditValue(card.status);
    } else if (type === 'assign') {
      setEditValue(card.user_id?._id || card.user_id || '');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editType === 'assign') {
        if (editValue) {
          await api.assignCard(editingCard._id, editValue);
        } else {
          await api.unassignCard(editingCard._id);
        }
      } else {
        const updates = editType === 'comment' 
          ? { comment: editValue } 
          : { status: editValue };
        await api.updateCard(editingCard._id, updates);
      }
      setSuccess('Carte mise à jour');
      setEditingCard(null);
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleUnassign = async (cardId) => {
    if (!window.confirm('Désassigner cette carte ?')) return;
    setError('');
    setSuccess('');
    try {
      await api.unassignCard(cardId);
      setSuccess('Carte désassignée');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la désassignation');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'inactive': return 'bg-red-50 text-red-700 border-red-200';
      case 'waiting_activation': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'pin_missing': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'inactive': return 'Inactive';
      case 'waiting_activation': return 'En attente';
      case 'pin_missing': return 'PIN manquant';
      default: return status;
    }
  };

  const filteredCards = cards.filter(card => {
    const matchesSearch = !searchTerm || 
      card._id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.user_id?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.puk?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || card.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: cards.length,
    active: cards.filter(c => c.status === 'active').length,
    inactive: cards.filter(c => c.status === 'inactive').length,
    waiting_activation: cards.filter(c => c.status === 'waiting_activation').length,
    pin_missing: cards.filter(c => c.status === 'pin_missing').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                <CreditCard className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Gestion des Cartes
                </h1>
                <p className="text-slate-600 mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                    {cards.length} carte{cards.length > 1 ? 's' : ''} au total
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadData}
                className="group p-3 text-slate-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 hover:text-blue-600 transition-all duration-200"
                title="Actualiser"
              >
                <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
              >
                <Plus className="h-5 w-5" />
                Nouvelle Carte
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-6 py-4 rounded-xl shadow-sm flex items-center gap-3 animate-in slide-in-from-top">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-50 rounded-xl">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Créer une Nouvelle Carte</h3>
            </div>
            <form onSubmit={handleCreateCard} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Commentaire <span className="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={newCard.comment}
                    onChange={(e) => setNewCard({ ...newCard, comment: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Ex: Carte pour événement spécial"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Code PUK <span className="text-slate-400 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="text"
                    value={newCard.puk}
                    onChange={(e) => setNewCard({ ...newCard, puk: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                    placeholder="Code PUK"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg font-medium transition-all"
                >
                  Créer la Carte
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par ID, commentaire, utilisateur, PUK..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            
            {/* Status Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  statusFilter === 'all'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                Toutes ({statusCounts.all})
              </button>
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                Actives ({statusCounts.active})
              </button>
              <button
                onClick={() => setStatusFilter('waiting_activation')}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  statusFilter === 'waiting_activation'
                    ? 'bg-amber-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                En attente ({statusCounts.waiting_activation})
              </button>
              <button
                onClick={() => setStatusFilter('pin_missing')}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  statusFilter === 'pin_missing'
                    ? 'bg-orange-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                PIN manquant ({statusCounts.pin_missing})
              </button>
              <button
                onClick={() => setStatusFilter('inactive')}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                  statusFilter === 'inactive'
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                Inactives ({statusCounts.inactive})
              </button>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card._id}
              className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-blue-500/10 rounded-full -ml-10 -mb-10"></div>
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-1.5 bg-white/10 rounded-lg">
                      <CreditCard className="h-4 w-4 text-white" />
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getStatusBadgeClass(card.status)}`}>
                      {getStatusLabel(card.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Numéro de carte</p>
                    <p className="font-mono text-sm text-white tracking-wider">
                      •••• {card._id.substring(card._id.length - 4)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* User Info */}
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-slate-500 mb-0.5">Titulaire</p>
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {card.user_id?.name || 'Non assignée'}
                    </p>
                  </div>
                </div>

                {/* Comment */}
                {card.comment && (
                  <div className="flex items-start gap-2 pb-3 border-b border-slate-100">
                    <div className="p-1.5 bg-indigo-50 rounded-lg">
                      <Edit2 className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-slate-500 mb-0.5">Commentaire</p>
                      <p className="text-xs text-slate-700 line-clamp-2">{card.comment}</p>
                    </div>
                  </div>
                )}

                {/* Security Info */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Key className="h-3 w-3 text-slate-500" />
                      <p className="text-[10px] text-slate-500 font-medium">PUK</p>
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-900">{card.puk || '-'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Shield className="h-3 w-3 text-slate-500" />
                      <p className="text-[10px] text-slate-500 font-medium">PIN</p>
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-900">{card.pin || '-'}</p>
                  </div>
                </div>

                {/* Public Key */}
                {card.public_key && (
                  <button
                    onClick={() => setViewingPublicKey(card)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-all text-xs font-medium"
                  >
                    <Eye className="h-3 w-3" />
                    Clé publique
                  </button>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(card, 'status')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Statut
                  </button>
                  <button
                    onClick={() => openEditModal(card, 'comment')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Commentaire
                  </button>
                  {card.user_id ? (
                    <button
                      onClick={() => handleUnassign(card._id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all"
                    >
                      <UserX className="h-3.5 w-3.5" />
                      Désassigner
                    </button>
                  ) : (
                    <button
                      onClick={() => openEditModal(card, 'assign')}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Assigner
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteCard(card._id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>

              {/* Card ID Footer */}
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                <p className="text-[10px] text-slate-500 font-mono text-center truncate">{card._id}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCards.length === 0 && !loading && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 bg-slate-100 rounded-full">
                <CreditCard className="h-12 w-12 text-slate-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune carte trouvée</h3>
                <p className="text-slate-600">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Essayez de modifier vos filtres de recherche'
                    : 'Commencez par créer une nouvelle carte'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Edit2 className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {editType === 'comment' && 'Modifier le Commentaire'}
                  {editType === 'status' && 'Changer le Statut'}
                  {editType === 'assign' && 'Assigner à un Utilisateur'}
                </h3>
              </div>
              <button 
                onClick={() => setEditingCard(null)} 
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              {editType === 'comment' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Commentaire</label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Entrez un commentaire..."
                  />
                </div>
              )}
              {editType === 'status' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Statut</label>
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="waiting_activation">En attente</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pin_missing">PIN Manquant</option>
                  </select>
                </div>
              )}
              {editType === 'assign' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Utilisateur</label>
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">Aucun</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg font-medium transition-all"
                >
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Public Key Modal */}
      {viewingPublicKey && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 animate-in zoom-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Clé Publique</h3>
              </div>
              <button 
                onClick={() => setViewingPublicKey(null)} 
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl border border-slate-700">
                <pre className="text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all">
                  {viewingPublicKey.public_key}
                </pre>
              </div>
              <p className="text-xs text-slate-500 mt-3 text-center">
                Carte ID: {viewingPublicKey._id}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
