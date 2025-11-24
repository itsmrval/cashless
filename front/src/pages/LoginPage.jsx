// src/pages/LoginPage.jsx
import React from 'react';
import Login from '../components/Login'; 
import { CreditCard } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex flex-col font-sans text-slate-800">
      <div className="flex-grow flex flex-col justify-center items-center p-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg mb-4">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-blue-700">Cashless</h1>
          <p className="text-slate-500 mt-1">Connectez-vous pour gérer votre compte.</p>
        </div>
        
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          {/* Le composant Login n'a plus besoin de prop onLogin */}
          <Login />
        </div>
      </div>
      
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white/50">
        Cashless &copy; {new Date().getFullYear()} — Tous droits réservés
      </footer>
    </div>
  );
}