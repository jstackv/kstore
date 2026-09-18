import React from 'react';
import { NavLink } from 'react-router-dom';

export default function MobileNav() {
  const item = ({ isActive }) =>
    `flex-1 text-center py-3 text-xs font-medium ${isActive ? 'text-vault-dark' : 'text-slate'}`;

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-ink/10 flex z-40">
      <NavLink to="/" end className={item}>
        Dashboard
      </NavLink>
      <NavLink to="/documents" className={item}>
        Documents
      </NavLink>
      <NavLink to="/profile" className={item}>
        Profile
      </NavLink>
    </nav>
  );
}
