import React from 'react';
import Icon from './Icon';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

export default function Header({ collapsed, onToggleSidebar }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-ink/10 bg-surface/85 px-5 py-3.5 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="icon-btn hidden md:inline-flex"
        >
          <Icon name="panel" className={`h-[18px] w-[18px] transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
        </button>
        <div className="md:hidden">
          <Logo dark={false} size="sm" />
        </div>
      </div>

      <ThemeToggle variant="light" />
    </header>
  );
}
