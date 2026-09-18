import React, { useState } from 'react';

export default function NewFolderModal({ open, onClose, onCreate, initialName = '', title = 'New folder' }) {
  const [name, setName] = useState(initialName);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <form onSubmit={submit} className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h3 className="font-serif text-lg text-ink mb-4">{title}</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Folder name"
          className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-vault/40"
        />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate hover:text-ink">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-vault rounded-md hover:bg-vault-dark">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
