// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Routes et Layouts
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

// Pages
import LoginPage from './pages/LoginPage';
import UserLayout from './layouts/UserLayout'; // Nouveau : Le "cadre" de l'app (header, footer)
import AdminLayout from './layouts/AdminLayout'; // Nouveau : Le "cadre" de l'admin

// Vues du Dashboard Utilisateur
import Dashboard from './components/Dashboard'; // Votre ancien Dashboard

// Vues du Dashboard Admin (Nouveau)
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './components/AdminUserManagement';
import AdminCardManagement from './pages/admin/AdminCardManagement';
import AdminTransactions from './pages/admin/AdminTransactions';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* --- Routes Utilisateur Protégées --- */}
      <Route path="/" element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
        {/* Le UserLayout contient le Header et le Footer, et un <Outlet /> */}
        {/* Dashboard est maintenant la page "index" (/) de UserLayout */}
        <Route index element={<Dashboard />} />
        {/* Vous pourriez ajouter d'autres pages utilisateur ici, ex: /profil */}
        {/* <Route path="profil" element={<ProfilPage />} /> */}
      </Route>

      {/* --- Routes Admin Protégées --- */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        {/* Le AdminLayout contient le Sidebar Admin et un <Outlet /> */}
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUserManagement />} />
        <Route path="cards" element={<AdminCardManagement />} />
        <Route path="transactions" element={<AdminTransactions />} />
      </Route>

      {/* Redirection par défaut si aucune route ne correspond */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;