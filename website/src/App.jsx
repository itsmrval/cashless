import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import UserLayout from './layouts/UserLayout';
import AdminLayout from './layouts/AdminLayout';

// Vues du Dashboard Utilisateur
import Dashboard from './components/Dashboard';

// Vues du Dashboard Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserManagement from './components/AdminUserManagement';
import AdminCardManagement from './pages/admin/AdminCardManagement';
import AdminTransactions from './pages/admin/AdminTransactions';

// --- Composants de protection de route définis localement ---

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children ? children : <Outlet />;
};

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return children ? children : <Outlet />;
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Route de connexion */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {/* --- Routes Utilisateur Protégées --- */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="transactions" element={<Dashboard />} />
        <Route path="beneficiaries" element={<Dashboard />} />
        <Route path="card" element={<Dashboard />} />
      </Route>

      {/* --- Routes Admin Protégées --- */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUserManagement />} />
        <Route path="cards" element={<AdminCardManagement />} />
        <Route path="transactions" element={<AdminTransactions />} />
      </Route>

      {/* Redirection par défaut */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;