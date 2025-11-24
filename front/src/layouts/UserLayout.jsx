// src/layouts/UserLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';

export default function UserLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex flex-col font-sans text-slate-800">
      
      {/* === Header === */}
      <Header />

      {/* === Contenu Principal === */}
      <main className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
        <Outlet />
      </main>

      {/* === Footer === */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50">
        Cashless &copy; {new Date().getFullYear()} — Tous droits réservés
      </footer>
    </div>
  );
}