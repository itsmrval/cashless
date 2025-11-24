import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  Loader2, 
  AlertCircle,
  Filter,
  TrendingUp
} from 'lucide-react';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [userBalance, setUserBalance] = useState(null);

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
        t.source_user_id === selectedUser || t.destination_user_id === selectedUser
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 mt-1">Historique de toutes les transactions</p>
        </div>
        <button
          onClick={loadData}
          className="p-2 text-slate-500 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <Filter className="h-4 w-4" />
            Filtrer par utilisateur
          </label>
          <select
            value={selectedUser}
            onChange={(e) => handleUserFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Toutes les transactions</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>{user.name}</option>
            ))}
          </select>
        </div>

        {selectedUser && userBalance !== null && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
              <TrendingUp className="h-4 w-4" />
              Solde de {users.find(u => u._id === selectedUser)?.name}
            </div>
            <p className="text-3xl font-bold text-blue-900">{formatCurrency(userBalance)}</p>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Destination</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Carte Source</th>
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
                  const isCredit = selectedUser && trans.destination_user_id === selectedUser;
                  const isDebit = selectedUser && trans.source_user_id === selectedUser;
                  
                  return (
                    <tr key={trans._id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(trans.date)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isDebit && <ArrowUpRight className="h-4 w-4 text-red-500" />}
                          <span className="text-sm text-slate-900">
                            {getUserName(trans.source_user_id)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isCredit && <ArrowDownLeft className="h-4 w-4 text-emerald-500" />}
                          <span className="text-sm text-slate-900">
                            {getUserName(trans.destination_user_id)}
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
                        {trans.source_card_id ? trans.source_card_id.substring(0, 12) + '...' : '-'}
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
    </div>
  );
}
