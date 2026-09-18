import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen bg-paper">
      <Sidebar storageUsed={user?.storageUsed} />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
