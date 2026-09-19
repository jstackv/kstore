import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatBytes, STORAGE_LIMIT } from '../utils/format';
import Icon from './Icon';
import Logo from './Logo';
import ConfirmDialog from './ConfirmDialog';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/documents', label: 'Documents', icon: 'files' },
  { to: '/profile', label: 'Profile', icon: 'user' },
];

export default function Sidebar({ storageUsed = 0, collapsed = false }) {
  const { user, logout } = useAuth();
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const pct = Math.min(100, (storageUsed / STORAGE_LIMIT) * 100);
  const shown = storageUsed > 0 ? Math.max(pct, 3) : 0;

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-ink/10 bg-surface py-6 transition-[width] duration-300 md:flex ${
        collapsed ? 'w-20 px-3' : 'w-72 px-5'
      }`}
    >
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-vault/10 blur-3xl" />

      <div className="relative mb-10 px-1">
        <Logo dark={false} iconOnly={collapsed} />
      </div>

      <nav className="relative flex flex-col gap-1.5">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center rounded-xl py-3 text-sm font-semibold transition-all ${
                collapsed ? 'justify-center px-0' : 'gap-3 px-4'
              } ${isActive ? 'bg-vault-light text-vault-dark' : 'text-slate hover:bg-vault-light/60 hover:text-vault-dark'}`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className={`absolute top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-vault ${
                      collapsed ? '-left-3' : 'left-0'
                    }`}
                  />
                )}
                <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                {!collapsed && item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="relative mt-auto space-y-4">
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <span
              title={`${Math.round(pct)}% of storage used`}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper text-vault-dark ring-1 ring-ink/10"
            >
              <Icon name="cloud" className="h-5 w-5" />
            </span>
            <span
              title={`${user?.name || ''} · ${user?.email || ''}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vault font-serif text-lg text-white"
            >
              {(user?.name || '?').charAt(0).toUpperCase()}
            </span>
            <button
              onClick={() => setConfirmingLogout(true)}
              title="Log out"
              aria-label="Log out"
              className="icon-btn"
            >
              <Icon name="logout" className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-paper p-4 ring-1 ring-ink/10">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-ink/70">
                  <Icon name="cloud" className="h-4 w-4" />
                  Storage
                </span>
                <span className="text-slate">{Math.round(pct)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full bg-vault transition-all duration-700" style={{ width: `${shown}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-slate">
                {formatBytes(storageUsed)} of {formatBytes(STORAGE_LIMIT)} used
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-paper p-3 ring-1 ring-ink/10">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vault font-serif text-lg text-white">
                {(user?.name || '?').charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{user?.name}</p>
                <p className="truncate text-[11px] text-slate">{user?.email}</p>
              </div>
              <button
                onClick={() => setConfirmingLogout(true)}
                title="Log out"
                aria-label="Log out"
                className="icon-btn shrink-0"
              >
                <Icon name="logout" className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmingLogout}
        tone="friendly"
        icon="logout"
        title="Heading out?"
        message="You'll need to sign back in to reach your documents again."
        confirmLabel="Log out"
        onCancel={() => setConfirmingLogout(false)}
        onConfirm={() => {
          setConfirmingLogout(false);
          logout();
        }}
      />
    </aside>
  );
}
