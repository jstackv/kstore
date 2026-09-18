import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STORAGE_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB display ceiling

const navItem =
  'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors';

export default function Sidebar({ storageUsed = 0 }) {
  const { user, logout } = useAuth();
  const pct = Math.min(100, Math.round((storageUsed / STORAGE_LIMIT) * 100));

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 bg-white border-r border-ink/10 px-4 py-6">
      <div className="px-2 mb-8">
        <span className="font-serif text-xl text-ink tracking-tight">KStore</span>
        <p className="text-xs text-slate mt-0.5">Your document vault</p>
      </div>

      <nav className="flex flex-col gap-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `${navItem} ${isActive ? 'bg-vault-light text-vault-dark' : 'text-slate hover:bg-paper hover:text-ink'}`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/documents"
          className={({ isActive }) =>
            `${navItem} ${isActive ? 'bg-vault-light text-vault-dark' : 'text-slate hover:bg-paper hover:text-ink'}`
          }
        >
          Documents
        </NavLink>
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `${navItem} ${isActive ? 'bg-vault-light text-vault-dark' : 'text-slate hover:bg-paper hover:text-ink'}`
          }
        >
          Profile
        </NavLink>
      </nav>

      <div className="mt-auto">
        <div className="px-2 mb-4">
          <div className="flex justify-between text-xs text-slate mb-1.5">
            <span>Storage</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full bg-paper rounded-full overflow-hidden">
            <div className="h-full bg-brass rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="px-2 py-3 border-t border-ink/10">
          <p className="text-sm font-medium text-ink truncate">{user?.name}</p>
          <p className="text-xs text-slate truncate mb-3">{user?.email}</p>
          <button
            onClick={logout}
            className="text-xs font-medium text-rust hover:underline"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}
