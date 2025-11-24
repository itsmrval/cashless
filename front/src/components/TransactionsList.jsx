import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coffee, 
  Banknote, 
  Wallet, 
  CreditCard,
  ShoppingBag,
  RefreshCw,
  Loader2
} from 'lucide-react';

function TransactionsList({ transactions = [], userId, loading, onRefresh }) {
  const [filter, setFilter] = useState('all'); // 'all', 'credit', 'debit'
  const normalizedUserId = userId ? String(userId) : null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount / 100);
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
    const destinationId = typeof trans.destination_user_id === 'object'
      ? (trans.destination_user_id?._id || trans.destination_user_id?.id || trans.destination_user_id?.userId)
      : trans.destination_user_id;
    const sourceId = typeof trans.source_user_id === 'object'
      ? (trans.source_user_id?._id || trans.source_user_id?.id || trans.source_user_id?.userId)
      : trans.source_user_id;

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
                        {tx.type === 'credit' ? 'Reçu' : 'Envoyé'} 
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
    </div>
  );
}

export default TransactionsList;
