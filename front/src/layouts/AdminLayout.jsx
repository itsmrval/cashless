// src/layouts/AdminLayout.jsx
import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Un exemple de sidebar admin très simple
function AdminSidebar() {
  const { logout } = useAuth();
  return (
    <aside className="w-64 bg-slate-800 text-white p-4 flex flex-col min-h-screen">
      <h2 className="text-2xl font-bold mb-6">Admin Cashless</h2>
      <nav className="flex-grow space-y-2">
        <Link to="/admin" className="block p-2 rounded hover:bg-slate-700">Dashboard</Link>
        <Link to="/admin/users" className="block p-2 rounded hover:bg-slate-700">Gérer Utilisateurs</Link>
        <Link to="/admin/cards" className="block p-2 rounded hover:bg-slate-700">Gérer Cartes</Link>
      </nav>
      <button onClick={logout} className="p-2 w-full text-left rounded bg-red-600 hover:bg-red-700">
        Déconnexion
      </button>
    </aside>
  );
}

export default function AdminLayout() {
  return (
    <div className="flex">
      <AdminSidebar />
      <main className="flex-grow p-8 bg-slate-50">
        <Outlet /> {/* Contenu de la page admin (users, cards, etc.) */}
      </main>
    </div>
  );
}