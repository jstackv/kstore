import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';

const BASE_NAV = [
  { to: '/', label: 'Home', icon: 'grid', end: true },
  { to: '/documents', label: 'Documents', icon: 'files' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

export default function MobileNav() {
  const { user } = useAuth();
  const nav = user?.role === 'admin' ? [...BASE_NAV, { to: '/admin/users', label: 'Users', icon: 'shield' }] : BASE_NAV;

  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 flex rounded-2xl bg-night-800/95 p-1.5 shadow-modal ring-1 ring-white/10 backdrop-blur-xl md:hidden">
      {nav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-semibold transition ${
              isActive ? 'bg-white/10 text-white' : 'text-white/55'
            }`
          }
        >
          <Icon name={item.icon} className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
