import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentViewer from './pages/DocumentViewer';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import PublicFolder from './pages/PublicFolder';
import PublicDocumentViewer from './pages/PublicDocumentViewer';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Public share links - no login required, deliberately outside ProtectedRoute */}
      <Route path="/share/:token" element={<PublicFolder />} />
      <Route path="/share/:token/view/:id" element={<PublicDocumentViewer />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/documents/folder/:folderId" element={<Documents />} />
        <Route path="/documents/view/:id" element={<DocumentViewer />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
