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
  Eye
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
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestion des Cartes</h1>
          <p className="text-slate-500 mt-1">Gérer les cartes du système Cashless</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            Nouvelle Carte
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold mb-4">Créer une Carte</h3>
          <form onSubmit={handleCreateCard} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Commentaire</label>
                <input
                  type="text"
                  value={newCard.comment}
                  onChange={(e) => setNewCard({ ...newCard, comment: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Description de la carte"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Code PUK</label>
                <input
                  type="text"
                  value={newCard.puk}
                  onChange={(e) => setNewCard({ ...newCard, puk: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Code PUK"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Créer
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cards Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">ID Carte</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Commentaire</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">PUK</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Clé Publique</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cards.map((card) => (
                <tr key={card._id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-xs font-mono text-slate-700">{card._id.substring(0, 12)}...</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{card.comment || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded border ${getStatusBadgeClass(card.status)}`}>
                      {card.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">{card.user_id?.name || '-'}</td>
                  <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-900">{card.puk || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    {card.public_key ? (
                      <button
                        onClick={() => setViewingPublicKey(card)}
                        className="text-blue-600 hover:text-blue-700"
                        title="Voir la clé publique"
                      >
                        <Eye className="h-4 w-4 inline" />
                      </button>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEditModal(card, 'status')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Changer statut"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(card, 'comment')}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="Modifier commentaire"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {card.user_id ? (
                        <button
                          onClick={() => handleUnassign(card._id)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                          title="Désassigner"
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => openEditModal(card, 'assign')}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Assigner"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCard(card._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold">
                {editType === 'comment' && 'Modifier le Commentaire'}
                {editType === 'status' && 'Changer le Statut'}
                {editType === 'assign' && 'Assigner à un Utilisateur'}
              </h3>
              <button onClick={() => setEditingCard(null)} className="p-1 hover:bg-slate-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              {editType === 'comment' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Commentaire</label>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {editType === 'status' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Statut</label>
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="waiting_activation">En attente</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              {editType === 'assign' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Utilisateur</label>
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucun</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold">Clé Publique</h3>
              <button onClick={() => setViewingPublicKey(null)} className="p-1 hover:bg-slate-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <pre className="bg-slate-50 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-slate-200">
                {viewingPublicKey.public_key}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
