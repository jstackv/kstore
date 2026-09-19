import React from 'react';

// dark=true forces white text, for use on a surface that's always dark
// regardless of site theme (like AuthShell's hero panel). dark=false is
// theme-aware (ink/slate tokens), for use on normal page surfaces.
export default function Logo({ size = 'md', dark = true, iconOnly = false }) {
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl' : size === 'sm' ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl';
  const glyph = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
  const titleSize = size === 'sm' ? 'text-base' : 'text-2xl';
  return (
    <div className={`flex items-center ${iconOnly ? 'justify-center' : 'gap-3'}`}>
      <span className={`relative flex shrink-0 items-center justify-center bg-vault shadow-glow ${box}`}>
        <svg viewBox="0 0 24 24" className={`${glyph} text-white`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
          <path d="M9 12.5l2 2 4-4.5" />
        </svg>
      </span>
      {!iconOnly && (
        <div className="min-w-0 leading-tight">
          <span className={`block truncate font-serif ${titleSize} ${dark ? 'text-white' : 'text-ink'}`}>KStore</span>
          {size !== 'sm' && (
            <span className={`block truncate text-[11px] tracking-wide ${dark ? 'text-white/50' : 'text-slate'}`}>
              Your document vault
            </span>
          )}
        </div>
      )}
    </div>
  );
}
