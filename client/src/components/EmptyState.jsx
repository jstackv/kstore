import React from 'react';

export default function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
      <div className="h-12 w-12 rounded-full bg-vault-light flex items-center justify-center mb-4">
        <div className="h-4 w-6 border-2 border-vault rounded-sm" />
      </div>
      <h3 className="font-serif text-lg text-ink mb-1">{title}</h3>
      <p className="text-sm text-slate max-w-sm mb-5">{message}</p>
      {action}
    </div>
  );
}
