import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Loader2, AlertCircle } from 'lucide-react';

// Il ne reçoit plus de props
function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(''); // Pour les erreurs API

  // Utiliser le contexte
  const { login, isLoading } = useAuth(); // isLoading global de AuthContext

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(''); // Réinitialiser l'erreur locale
    try {
      // Appelle la fonction login du contexte
      await login(username.trim(), password);
      // La redirection est gérée dans le contexte !
    } catch (err) {
      // Attrape l'erreur si l'API échoue
      setLocalError(err.message || 'Erreur lors de la connexion');
    }
  };

  /*
   * NOTE:
   * Ce composant ne contient plus de titre (h1) ni de carte (bg-white).
   * C'est App.jsx qui gère désormais l'affichage du titre "Cashless"
   * et qui place ce formulaire à l'intérieur d'une carte blanche.
   * Ce composant est maintenant juste le formulaire.
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      
      {/* --- Nom d'utilisateur --- */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1.5">
          Nom d'utilisateur
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <User className="h-5 w-5 text-slate-400" />
          </span>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="votre.nom (ex: demo)"
            required
            disabled={isLoading}
            autoComplete="username"
          />
        </div>
      </div>

      {/* --- Mot de passe --- */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
          Mot de passe
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Lock className="h-5 w-5 text-slate-400" />
          </span>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="•••••••• (ex: 123)"
            required
            disabled={isLoading}
            autoComplete="current-password"
          />
        </div>
      </div>

      {/* --- Message d'Erreur --- */}
      {localError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{localError}</span>
        </div>
      )}

      {/* --- Bouton de Connexion --- */}
      <button
        type="submit"
        disabled={isLoading} // Utilise isLoading du contexte
        className="w-full flex justify-center items-center bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30"
      >
        {isLoading ? ( // Utilise isLoading du contexte
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          'Se connecter'
        )}
      </button>
    </form>
  );
}

export default Login;