import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Save
} from 'lucide-react';

function BeneficiariesManager() {
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [addingNew, setAddingNew] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newComment, setNewComment] = useState('');
  const [addingLoading, setAddingLoading] = useState(false);

  const [editingBeneficiary, setEditingBeneficiary] = useState(null);
  const [editComment, setEditComment] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    loadBeneficiaries();
  }, []);

  const loadBeneficiaries = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getBeneficiaries();
      setBeneficiaries(data);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des bénéficiaires');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newUserId.trim()) {
      setError('Veuillez entrer un ID utilisateur');
      return;
    }

    setAddingLoading(true);
    try {
      await api.addBeneficiary(newUserId.trim(), newComment.trim());
      setSuccess('Bénéficiaire ajouté avec succès');
      setNewUserId('');
      setNewComment('');
      setAddingNew(false);
      await loadBeneficiaries();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || "Erreur lors de l'ajout du bénéficiaire");
    } finally {
      setAddingLoading(false);
    }
  };

  const handleUpdateComment = async (userId) => {
    setError('');
    setSuccess('');
    setEditLoading(true);
    try {
      await api.updateBeneficiaryComment(userId, editComment.trim());
      setSuccess('Commentaire mis à jour');
      setEditingBeneficiary(null);
      setEditComment('');
      await loadBeneficiaries();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveBeneficiary = async (userId, name) => {
    if (!window.confirm(`Supprimer ${name} de vos bénéficiaires ?`)) return;

    setError('');
    setSuccess('');
    try {
      await api.removeBeneficiary(userId);
      setSuccess('Bénéficiaire supprimé');
      await loadBeneficiaries();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const handleSendMoney = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = parseFloat(sendAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Veuillez entrer un montant valide');
      return;
    }

    setSendLoading(true);
    try {
      await api.createTransaction({
        destination_user_id: selectedBeneficiary.user_id,
        operation: Math.round(amount * 100)
      });
      setSuccess(`${amount}€ envoyé à ${selectedBeneficiary.name}`);
      setShowSendModal(false);
      setSelectedBeneficiary(null);
      setSendAmount('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setSendLoading(false);
    }
  };

  const startEdit = (beneficiary) => {
    setEditingBeneficiary(beneficiary.user_id);
    setEditComment(beneficiary.comment || '');
  };

  const cancelEdit = () => {
    setEditingBeneficiary(null);
    setEditComment('');
  };

  const openSendModal = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setSendAmount('');
    setShowSendModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Bénéficiaires</h2>
          <p className="text-base text-slate-500 mt-1">Gérez vos bénéficiaires favoris</p>
        </div>
        <button
          onClick={() => setAddingNew(!addingNew)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {addingNew ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {addingNew ? 'Annuler' : 'Ajouter'}
        </button>
      </div>

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

      {addingNew && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Ajouter un bénéficiaire</h3>
          <form onSubmit={handleAddBeneficiary} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                ID Utilisateur *
              </label>
              <input
                type="text"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="Entrez l'ID de l'utilisateur"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Commentaire (optionnel)
              </label>
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ex: Ami, Collègue, Famille..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={addingLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
            >
              {addingLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              Ajouter
            </button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {beneficiaries.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Users size={32} className="opacity-50" />
            </div>
            <p className="text-lg font-medium text-slate-600">Aucun bénéficiaire</p>
            <p className="text-sm">Ajoutez vos contacts favoris pour envoyer de l'argent rapidement.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {beneficiaries.map((beneficiary) => (
              <li key={beneficiary.user_id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold">
                        {beneficiary.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{beneficiary.name}</p>
                        <p className="text-sm text-slate-500">@{beneficiary.username}</p>
                        {editingBeneficiary === beneficiary.user_id ? (
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              placeholder="Commentaire..."
                              className="flex-1 px-3 py-1 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                              onClick={() => handleUpdateComment(beneficiary.user_id)}
                              disabled={editLoading}
                              className="p-1 text-green-600 hover:text-green-700"
                            >
                              {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 text-slate-600 hover:text-slate-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : beneficiary.comment ? (
                          <p className="text-xs text-slate-400 mt-1">{beneficiary.comment}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openSendModal(beneficiary)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Envoyer de l'argent"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => startEdit(beneficiary)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Modifier le commentaire"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleRemoveBeneficiary(beneficiary.user_id, beneficiary.name)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showSendModal && selectedBeneficiary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Envoyer de l'argent à {selectedBeneficiary.name}
            </h3>
            <form onSubmit={handleSendMoney} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Montant (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowSendModal(false);
                    setSelectedBeneficiary(null);
                    setSendAmount('');
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sendLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
                >
                  {sendLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default BeneficiariesManager;
