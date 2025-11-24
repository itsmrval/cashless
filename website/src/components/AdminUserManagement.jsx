// src/components/AdminUserManagement.jsx
import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import {
  UserPlus,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  Users,
  Search,
  Mail,
  Wallet,
  Shield,
  User,
  Key
} from 'lucide-react';

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Create user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'admin' });
  
  // Edit user modal
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', username: '', role: '' });

  // Reset password modal
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAllUsers();
      // Load balances for each user
      const usersWithBalances = await Promise.all(
        data.map(async (user) => {
          try {
            const balanceData = await api.getUserBalance(user._id);
            return { ...user, balance: balanceData.balance };
          } catch {
            return { ...user, balance: 0 };
          }
        })
      );
      setUsers(usersWithBalances);
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.createUser(newUser);
      setSuccess('Utilisateur créé avec succès');
      setNewUser({ name: '', username: '', password: '', role: 'admin' });
      setShowCreateForm(false);
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return;
    setError('');
    setSuccess('');
    try {
      await api.deleteUser(userId);
      setSuccess('Utilisateur supprimé');
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditForm({ name: user.name, username: user.username, role: user.role || 'admin' });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.updateUser(editingUser._id, editForm);
      setSuccess('Utilisateur mis à jour');
      setEditingUser(null);
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    try {
      await api.adminResetPassword(resetPasswordUser._id, newPassword);
      setSuccess(`Mot de passe de ${resetPasswordUser.name} réinitialisé avec succès`);
      setResetPasswordUser(null);
      setNewPassword('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la réinitialisation du mot de passe');
    }
  };

  const formatCurrency = (cents) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return user.name?.toLowerCase().includes(search) ||
           user.username?.toLowerCase().includes(search) ||
           user._id?.toLowerCase().includes(search);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  Gestion des Utilisateurs
                </h1>
                <p className="text-slate-600 mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                    <span className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse"></span>
                    {users.length} utilisateur{users.length > 1 ? 's' : ''}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadUsers}
                className="group p-3 text-slate-600 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-300 hover:text-purple-600 transition-all duration-200"
                title="Actualiser"
              >
                <RefreshCw className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
              </button>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
              >
                <UserPlus className="h-5 w-5" />
                Nouvel Utilisateur
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
              <div className="p-3 bg-purple-50 rounded-xl">
                <UserPlus className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Créer un Nouvel Utilisateur</h3>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nom complet <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="Ex: Jean Dupont"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Nom d'utilisateur <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="Ex: jdupont"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Mot de passe <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Rôle</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    <option value="user">Utilisateur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg font-medium transition-all"
                >
                  Créer l'Utilisateur
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

        {/* Search Bar */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, username ou ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map((user) => (
            <div
              key={user._id}
              className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-br from-slate-800 via-purple-900 to-indigo-900 p-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-purple-500/10 rounded-full -ml-10 -mb-10"></div>
                
                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white truncate">{user.name}</h3>
                      <p className="text-xs text-slate-300">@{user.username}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Balance */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 border border-emerald-100">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Wallet className="h-3 w-3 text-emerald-600" />
                    <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Solde</p>
                  </div>
                  <p className="text-lg font-bold text-emerald-900">{formatCurrency(user.balance || 0)}</p>
                </div>

                {/* User ID */}
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-[10px] text-slate-500 font-medium mb-0.5">Identifiant</p>
                  <p className="text-[10px] font-mono text-slate-700 truncate">{user._id}</p>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(user)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-all"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Modifier
                  </button>
                  <button
                    onClick={() => setResetPasswordUser(user)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                  >
                    <Key className="h-3.5 w-3.5" />
                    MDP
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user._id)}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Supp
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredUsers.length === 0 && !loading && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-6 bg-slate-100 rounded-full">
                <Users className="h-12 w-12 text-slate-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Aucun utilisateur trouvé</h3>
                <p className="text-slate-600">
                  {searchTerm 
                    ? 'Essayez de modifier votre recherche'
                    : 'Commencez par créer un nouvel utilisateur'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Edit2 className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Modifier l'Utilisateur</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nom complet</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Rôle</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="user">Utilisateur</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 shadow-lg font-medium transition-all"
                >
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Réinitialiser le Mot de Passe</h3>
              </div>
              <button
                onClick={() => {
                  setResetPasswordUser(null);
                  setNewPassword('');
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>Utilisateur:</strong> {resetPasswordUser.name} (@{resetPasswordUser.username})
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nouveau mot de passe <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <p className="mt-2 text-xs text-slate-500">Au moins 6 caractères</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg font-medium transition-all"
                >
                  Réinitialiser
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordUser(null);
                    setNewPassword('');
                  }}
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