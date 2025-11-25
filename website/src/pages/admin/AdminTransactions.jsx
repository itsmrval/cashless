import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  Filter,
  TrendingUp,
  Info,
  Send,
  X,
  CheckCircle,
  DollarSign,
  Users
} from 'lucide-react';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [userBalance, setUserBalance] = useState(null);
  const [showBalanceInfo, setShowBalanceInfo] = useState(false);
  
  // Create transaction modal
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [newTransaction, setNewTransaction] = useState({ source_user_id: '', destination_user_id: '', operation: '', infinite_funds: false });
  const [transactionError, setTransactionError] = useState('');
  const [transactionSuccess, setTransactionSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [transData, usersData] = await Promise.all([
        api.getTransactions(),
        api.getAllUsers()
      ]);
      setTransactions(transData);
      setUsers(usersData);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadUserBalance = async (userId) => {
    if (!userId) {
      setUserBalance(null);
      return;
    }
    try {
      const balanceData = await api.getUserBalance(userId);
      setUserBalance(balanceData.balance);
    } catch (err) {
      setUserBalance(null);
    }
  };

  const handleUserFilter = (userId) => {
    setSelectedUser(userId);
    loadUserBalance(userId);
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setTransactionError('');
    setTransactionSuccess('');
    setSubmitting(true);

    try {
      const operationCents = Math.round(parseFloat(newTransaction.operation) * 100);
      await api.createTransaction({
        source_user_id: newTransaction.source_user_id,
        destination_user_id: newTransaction.destination_user_id,
        operation: operationCents,
        infinite_funds: newTransaction.infinite_funds
      });
      setTransactionSuccess('Transaction créée avec succès !');
      setNewTransaction({ source_user_id: '', destination_user_id: '', operation: '', infinite_funds: false });
      setTimeout(() => {
        setShowTransactionModal(false);
        loadData();
      }, 1500);
    } catch (err) {
      setTransactionError(err.message || 'Erreur lors de la création de la transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserName = (userId) => {
    const user = users.find(u => u._id === userId);
    return user ? user.name : userId?.substring(0, 8) + '...' || '-';
  };

  const filteredTransactions = selectedUser
    ? transactions.filter(t => 
        t.source_user?.id === selectedUser || t.destination_user?.id === selectedUser
      )
    : transactions;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl shadow-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Transactions
                </h1>
                <p className="text-slate-600 mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse"></span>
                    {transactions.length} transaction{transactions.length > 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadData}
                className="group p-3 text-slate-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 hover:text-emerald-600 transition-all duration-200"
                title="Actualiser"
              >
                <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
              </button>
              <button
                onClick={() => setShowTransactionModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
              >
                <Send className="h-5 w-5" />
                Nouvelle Transaction
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

      {/* Filter and Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
            <Filter className="h-4 w-4 text-emerald-600" />
            Filtrer par utilisateur
          </label>
          <select
            value={selectedUser}
            onChange={(e) => handleUserFilter(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
          >
            <option value="">Toutes les transactions</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>{user.name}</option>
            ))}
          </select>
        </div>

        {selectedUser && userBalance !== null && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-lg border border-emerald-100 p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 mb-2">
              <TrendingUp className="h-4 w-4" />
              Solde de {users.find(u => u._id === selectedUser)?.name}
              <button
                title="Comment le solde est calculé"
                className="text-emerald-400 hover:text-emerald-600 p-1 rounded-md ml-2"
                onClick={() => setShowBalanceInfo(s => !s)}
                aria-expanded={showBalanceInfo}
              >
                <Info className="h-4 w-4" />
              </button>
            </div>
            <p className="text-3xl font-bold text-emerald-900">{formatCurrency(userBalance)}</p>
            {showBalanceInfo && (
              <div className="mt-3 text-xs text-slate-700 bg-white/40 p-3 rounded-md border border-emerald-50">
                Le solde est calculé dynamiquement à partir des transactions associées
                à l'utilisateur (source/destination). Seules les 50 dernières transactions
                sont prises en compte — le résultat peut donc être incomplet selon l'historique.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-slate-50 to-emerald-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Source</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Destination</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">Carte Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    Aucune transaction
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((trans) => {
                  const isCredit = selectedUser && trans.destination_user?.id === selectedUser;
                  const isDebit = selectedUser && trans.source_user?.id === selectedUser;
                  
                  return (
                    <tr key={trans._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(trans.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isDebit && <ArrowUpRight className="h-4 w-4 text-red-500" />}
                          <span className="text-sm text-slate-900">
                            {trans.source_user?.name || 'Inconnu'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isCredit && <ArrowDownLeft className="h-4 w-4 text-emerald-500" />}
                          <span className="text-sm text-slate-900">
                            {trans.destination_user?.name || 'Inconnu'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-semibold ${
                          isCredit ? 'text-emerald-600' : 
                          isDebit ? 'text-red-600' : 'text-slate-900'
                        }`}>
                          {isCredit && '+'}{isDebit && '-'}{formatCurrency(trans.operation)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {trans.source_card_id && typeof trans.source_card_id === 'string' 
                          ? trans.source_card_id.substring(0, 16) + '...' 
                          : trans.source_card_id?._id 
                          ? trans.source_card_id._id.substring(0, 16) + '...'
                          : '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {filteredTransactions.length > 0 && (
          <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Affichage de {filteredTransactions.length} transaction(s)
              {selectedUser && ` pour ${users.find(u => u._id === selectedUser)?.name}`}
            </p>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-emerald-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Send className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Créer une Transaction</h3>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Source (Expéditeur) <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTransaction.source_user_id}
                  onChange={(e) => setNewTransaction({ ...newTransaction, source_user_id: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                >
                  <option value="">Sélectionner l'expéditeur</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.name} (@{user.username})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Destination (Destinataire) <span className="text-red-500">*</span>
                </label>
                <select
                  value={newTransaction.destination_user_id}
                  onChange={(e) => setNewTransaction({ ...newTransaction, destination_user_id: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  required
                >
                  <option value="">Sélectionner le destinataire</option>
                  {users.map(user => (
                    <option key={user._id} value={user._id}>{user.name} (@{user.username})</option>
                  ))}
                </select>
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="infinite-funds"
                  checked={newTransaction.infinite_funds}
                  onChange={(e) => setNewTransaction({ ...newTransaction, infinite_funds: e.target.checked })}
                  className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <label htmlFor="infinite-funds" className="flex-1 cursor-pointer">
                  <div className="text-sm font-semibold text-amber-900">
                    Autoriser solde négatif
                  </div>
                  <div className="text-xs text-amber-700">
                    Ignorer la vérification du solde pour cette transaction (admin uniquement)
                  </div>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                  ) : (
                    'Créer la Transaction'
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
    </div>
  );
}
