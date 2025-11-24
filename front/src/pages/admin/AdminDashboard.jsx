// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { Users, CreditCard, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCards: 0,
    activeCards: 0,
    totalTransactions: 0,
    recentUsers: [],
    recentCards: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [users, cards, transactions] = await Promise.all([
        api.getAllUsers(),
        api.getAllCards(),
        api.getTransactions().catch(() => [])
      ]);

      const activeCards = cards.filter(c => c.status === 'active').length;
      
      setStats({
        totalUsers: users.length,
        totalCards: cards.length,
        activeCards,
        totalTransactions: transactions.length,
        recentUsers: users.slice(-5).reverse(),
        recentCards: cards.slice(-5).reverse()
      });
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tableau de Bord Administrateur</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble du système Cashless</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Utilisateurs</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalUsers}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Cartes Totales</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalCards}</p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <CreditCard className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Cartes Actives</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.activeCards}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <CreditCard className="h-6 w-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Transactions</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalTransactions}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <TrendingUp className="h-6 w-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Derniers Utilisateurs</h3>
          {stats.recentUsers.length > 0 ? (
            <div className="space-y-3">
              {stats.recentUsers.map(user => (
                <div key={user._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.username}</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded">
                    {user.role || 'admin'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Aucun utilisateur</p>
          )}
        </div>

        {/* Recent Cards */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Dernières Cartes</h3>
          {stats.recentCards.length > 0 ? (
            <div className="space-y-3">
              {stats.recentCards.map(card => (
                <div key={card._id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-mono text-sm text-slate-700">{card._id.substring(0, 12)}...</p>
                    <p className="text-xs text-slate-500">{card.user_id?.name || 'Non assignée'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    card.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                    card.status === 'inactive' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {card.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Aucune carte</p>
          )}
        </div>
      </div>
    </div>
  );
}