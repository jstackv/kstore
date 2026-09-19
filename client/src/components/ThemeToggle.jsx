import React from 'react';
import Icon from './Icon';
import { useTheme } from '../context/ThemeContext';

// variant "dark": for placing on a permanently-dark surface (sidebar, auth hero)
// variant "light": for placing on the normal page surface
export default function ThemeToggle({ variant = 'light', className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const base = 'inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-vault/25';
  const styles =
    variant === 'dark'
      ? 'text-white/60 hover:bg-white/10 hover:text-white'
      : 'text-slate hover:bg-vault-light hover:text-vault-dark';

  return (
    <button
      onClick={toggleTheme}
      className={`${base} ${styles} ${className}`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <Icon name={isDark ? 'sun' : 'moon'} className="h-[18px] w-[18px]" />
    </button>
  );
}
