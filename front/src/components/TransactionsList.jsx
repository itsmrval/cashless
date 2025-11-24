import React from 'react';
import { 
  Download, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coffee, 
  Banknote, 
  Wallet, 
  CreditCard,
  ShoppingBag
} from 'lucide-react';

function TransactionsList({ cardId }) {
  const mockTransactions = [
    { id: '1', type: 'debit', amount: 15.5, description: 'Cafétéria', date: new Date(Date.now() - 1000 * 60 * 60 * 2), balance_after: 84.5 },
    { id: '2', type: 'credit', amount: 50.0, description: 'Rechargement', date: new Date(Date.now() - 1000 * 60 * 60 * 24), balance_after: 100.0 },
    { id: '3', type: 'debit', amount: 8.3, description: 'Distributeur', date: new Date(Date.now() - 1000 * 60 * 60 * 48), balance_after: 50.0 },
    { id: '4', type: 'debit', amount: 42.90, description: 'Supermarché', date: new Date(Date.now() - 1000 * 60 * 60 * 72), balance_after: 7.1 }
  ];

  // Formatage propre de la monnaie
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Formatage intelligent de la date
  const formatDate = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) return `Aujourd'hui, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    if (hours < 48) return `Hier, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Logique pour choisir l'icône en fonction de la description
  const getTransactionIcon = (description, type) => {
    const lowerDesc = description.toLowerCase();
    if (type === 'credit') return <Wallet size={20} />;
    if (lowerDesc.includes('café') || lowerDesc.includes('resto')) return <Coffee size={20} />;
    if (lowerDesc.includes('distributeur')) return <Banknote size={20} />;
    if (lowerDesc.includes('supermarché') || lowerDesc.includes('course')) return <ShoppingBag size={20} />;
    return <CreditCard size={20} />;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 font-sans">
      
      {/* --- En-tête --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Historique</h2>
          <p className="text-base text-slate-500 mt-1">Vos dernières opérations bancaires</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
            <Filter size={16} />
            Filtrer
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
            <Download size={16} />
            Exporter
          </button>
        </div>
      </div>

      {/* --- Liste des Transactions --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {mockTransactions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <CreditCard size={32} className="opacity-50" />
            </div>
            <p className="text-lg font-medium text-slate-600">Aucune transaction</p>
            <p className="text-sm">Vos futures opérations apparaîtront ici.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {mockTransactions.map((tx) => (
              <li key={tx.id} className="group hover:bg-slate-50 transition-colors duration-200 p-4 sm:px-6">
                <div className="flex items-center justify-between">
                  
                  {/* Gauche : Icône + Description */}
                  <div className="flex items-center gap-4">
                    {/* Avatar de l'icône */}
                    <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      tx.type === 'credit' 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-slate-100 text-slate-600 group-hover:bg-white group-hover:shadow-sm transition-all'
                    }`}>
                      {getTransactionIcon(tx.description, tx.type)}
                      
                      {/* Petite flèche indicatrice en absolu */}
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                        tx.type === 'credit' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        {tx.type === 'credit' ? <ArrowDownLeft size={10} strokeWidth={3} /> : <ArrowUpRight size={10} strokeWidth={3} />}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {tx.description}
                      </p>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">
                        {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>

                  {/* Droite : Montant + Solde */}
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
        
        {/* Footer de la liste */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-center sm:text-left">
          <p className="text-xs text-slate-500">
            Affichage des 4 dernières opérations • <span className="text-blue-600 font-medium cursor-pointer hover:underline">Voir tout l'historique</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default TransactionsList;