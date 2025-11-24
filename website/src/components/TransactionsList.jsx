import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Coffee,
  Banknote,
  Wallet,
  CreditCard,
  ShoppingBag,
  RefreshCw,
  Loader2,
  Send,
  X,
  AlertCircle,
  CheckCircle,
  Plus,
  Star
} from 'lucide-react';
import { api } from '../api/api';

function TransactionsList({ transactions = [], userId, loading, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const normalizedUserId = userId ? String(userId) : null;

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [loadingBeneficiaries, setLoadingBeneficiaries] = useState(false);
  const [newTransaction, setNewTransaction] = useState({ destination_user_id: '', operation: '' });
  const [transactionError, setTransactionError] = useState('');
  const [transactionSuccess, setTransactionSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const [beneficiaryComment, setBeneficiaryComment] = useState('');

  useEffect(() => {
    if (showTransactionModal) {
      loadBeneficiaries();
    }
  }, [showTransactionModal]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
  };

  const loadBeneficiaries = async () => {
    setLoadingBeneficiaries(true);
    try {
      const data = await api.getBeneficiaries();
      setBeneficiaries(data);
    } catch (err) {
      console.error('Error loading beneficiaries:', err);
    } finally {
      setLoadingBeneficiaries(false);
    }
  };

  const handleOpenTransactionModal = () => {
    setShowTransactionModal(true);
    setTransactionError('');
    setTransactionSuccess('');
    setShowManualEntry(false);
    setManualUserId('');
    setSaveAsBeneficiary(false);
    setBeneficiaryComment('');
  };

  const handleSelectBeneficiary = (beneficiaryId) => {
    setNewTransaction({ ...newTransaction, destination_user_id: beneficiaryId });
    setShowManualEntry(false);
  };

  const handleManualUserIdChange = (value) => {
    setManualUserId(value);
    setNewTransaction({ ...newTransaction, destination_user_id: value });
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setTransactionError('');
    setTransactionSuccess('');
    setSubmitting(true);

    try {
      const operationCents = Math.round(parseFloat(newTransaction.operation) * 100);
      await api.createTransaction({
        destination_user_id: newTransaction.destination_user_id,
        operation: operationCents
      });

      if (saveAsBeneficiary && manualUserId) {
        try {
          await api.addBeneficiary(manualUserId, beneficiaryComment);
        } catch (err) {
          console.error('Failed to save beneficiary:', err);
        }
      }

      setTransactionSuccess('Transaction effectuée avec succès !');
      setNewTransaction({ destination_user_id: '', operation: '' });
      setManualUserId('');
      setSaveAsBeneficiary(false);
      setBeneficiaryComment('');
      setTimeout(() => {
        setShowTransactionModal(false);
        if (onRefresh) onRefresh();
      }, 1500);
    } catch (err) {
      setTransactionError(err.message || 'Erreur lors de la transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    const transDate = new Date(date);
    const now = new Date();
    const diff = now - transDate;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) return `Aujourd'hui, ${transDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (hours < 48) return `Hier, ${transDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    return transDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getTransactionIcon = (description, type) => {
    const lowerDesc = description?.toLowerCase() || '';
    if (type === 'credit') return <Wallet size={20} />;
    if (lowerDesc.includes('café') || lowerDesc.includes('resto')) return <Coffee size={20} />;
    if (lowerDesc.includes('distributeur')) return <Banknote size={20} />;
    if (lowerDesc.includes('supermarché') || lowerDesc.includes('course')) return <ShoppingBag size={20} />;
    return <CreditCard size={20} />;
  };

  const getTransactionType = (trans) => {
    if (!normalizedUserId) return 'neutral';
    const destinationId = trans.destination_user?.id || trans.destination_user?._id;
    const sourceId = trans.source_user?.id || trans.source_user?._id;

    if (destinationId && String(destinationId) === normalizedUserId) return 'credit';
    if (sourceId && String(sourceId) === normalizedUserId) return 'debit';
    return 'neutral';
  };

  const transactionsWithBalance = transactions.map((trans, index) => {
    const type = getTransactionType(trans);
    const amount = trans.operation || 0;
    
    let runningBalance = 0;
    for (let i = 0; i <= index; i++) {
      const t = transactions[i];
      const tType = getTransactionType(t);
      if (tType === 'credit') runningBalance += t.operation;
      else if (tType === 'debit') runningBalance -= t.operation;
    }
    
    return {
      ...trans,
      type,
      amount,
      balance_after: runningBalance
    };
  });

  const filteredTransactions = transactionsWithBalance.filter(t => {
    if (filter === 'credit') return t.type === 'credit';
    if (filter === 'debit') return t.type === 'debit';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Historique</h2>
          <p className="text-base text-slate-500 mt-1">Vos dernières opérations bancaires</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenTransactionModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-lg font-medium transition-all"
          >
            <Send className="h-4 w-4" />
            Envoyer
          </button>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <option value="all">Toutes</option>
            <option value="credit">Crédits</option>
            <option value="debit">Débits</option>
          </select>
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CreditCard size={32} className="opacity-50" />
            </div>
            <p className="text-lg font-medium text-slate-600">Aucune transaction</p>
            <p className="text-sm">Vos futures opérations apparaîtront ici.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filteredTransactions.map((tx) => (
              <li key={tx._id} className="group hover:bg-slate-50 transition-colors duration-200 p-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'credit' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-slate-100 text-slate-600 group-hover:bg-white group-hover:shadow-sm transition-all'
                    }`}>
                      {getTransactionIcon(tx.description, tx.type)}
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                        tx.type === 'credit' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {tx.type === 'credit' ? <ArrowDownLeft size={10} strokeWidth={3} /> : <ArrowUpRight size={10} strokeWidth={3} />}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {tx.type === 'credit' 
                          ? `De ${tx.source_user?.name || 'Inconnu'}` 
                          : `Vers ${tx.destination_user?.name || 'Inconnu'}`
                        }
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold tracking-tight ${
                      tx.type === 'credit' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-1 font-medium">
                      Solde: {formatCurrency(tx.balance_after)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {filteredTransactions.length > 0 && (
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center sm:text-left">
            <p className="text-xs text-slate-500">
              Affichage de {filteredTransactions.length} opération(s)
            </p>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Envoyer de l'argent</h3>
              </div>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTransaction} className="p-6 space-y-6">
              {transactionError && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{transactionError}</span>
                </div>
              )}
              {transactionSuccess && (
                <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{transactionSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Destinataire <span className="text-red-500">*</span>
                </label>

                {loadingBeneficiaries ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    {beneficiaries.length > 0 && !showManualEntry && (
                      <div className="space-y-2 mb-4">
                        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                          <Star className="h-3 w-3" /> Bénéficiaires
                        </p>
                        {beneficiaries.map(b => (
                          <button
                            key={b.user_id}
                            type="button"
                            onClick={() => handleSelectBeneficiary(b.user_id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                              newTransaction.destination_user_id === b.user_id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                              {b.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 text-left">
                              <p className="font-semibold text-slate-900 text-sm">{b.name}</p>
                              <p className="text-xs text-slate-500">@{b.username}</p>
                              {b.comment && <p className="text-xs text-slate-400 mt-0.5">{b.comment}</p>}
                            </div>
                            {newTransaction.destination_user_id === b.user_id && (
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {!showManualEntry ? (
                      <button
                        type="button"
                        onClick={() => setShowManualEntry(true)}
                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-slate-600 hover:text-blue-600"
                      >
                        <Plus className="h-4 w-4" />
                        Entrer un ID utilisateur
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={manualUserId}
                          onChange={(e) => handleManualUserIdChange(e.target.value)}
                          placeholder="ID de l'utilisateur"
                          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                          <input
                            type="checkbox"
                            id="saveBeneficiary"
                            checked={saveAsBeneficiary}
                            onChange={(e) => setSaveAsBeneficiary(e.target.checked)}
                            className="rounded border-slate-300"
                          />
                          <label htmlFor="saveBeneficiary" className="text-sm text-slate-700 cursor-pointer">
                            Enregistrer comme bénéficiaire
                          </label>
                        </div>
                        {saveAsBeneficiary && (
                          <input
                            type="text"
                            value={beneficiaryComment}
                            onChange={(e) => setBeneficiaryComment(e.target.value)}
                            placeholder="Commentaire (optionnel)"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setShowManualEntry(false);
                            setManualUserId('');
                            setSaveAsBeneficiary(false);
                            setBeneficiaryComment('');
                            setNewTransaction({ ...newTransaction, destination_user_id: '' });
                          }}
                          className="text-sm text-slate-600 hover:text-slate-800"
                        >
                          ← Retour aux bénéficiaires
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Montant (€) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={newTransaction.operation}
                  onChange={(e) => setNewTransaction({ ...newTransaction, operation: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    'Envoyer'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionsList;
