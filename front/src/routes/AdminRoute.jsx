// src/routes/AdminRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Protège les routes pour les administrateurs
export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, user } = useAuth();

  console.log('AdminRoute check:', { isAuthenticated, isAdmin, user }); // Debug

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    // Si connecté mais pas admin, redirige vers le dashboard utilisateur
    console.log('User is not admin, redirecting to /'); // Debug
    return <Navigate to="/" replace />; 
  }

  return children ? children : <Outlet />;
}