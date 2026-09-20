import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Wrap inside ProtectedRoute (or after it in the tree) - this only adds the
// role check, not the authentication check itself.
export default function AdminRoute({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
