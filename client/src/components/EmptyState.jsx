import React from 'react';
import Icon from './Icon';

export default function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 -m-4 rounded-full bg-vault opacity-15 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-surface shadow-lift ring-1 ring-ink/5 animate-float">
          <Icon name="files" className="h-9 w-9 text-vault" strokeWidth={1.6} />
        </div>
      </div>
      <h3 className="mb-1.5 font-serif text-2xl text-ink">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-slate">{message}</p>
      {action}
    </div>
  );
}
