// src/routes/AdminRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Protège les routes pour les administrateurs
export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    // Si connecté mais pas admin, redirige vers le dashboard utilisateur
    return <Navigate to="/" replace />; 
  }

  return children ? children : <Outlet />;
}