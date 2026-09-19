import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

export default function NewFolderModal({ open, onClose, onCreate, initialName = '', title = 'New folder' }) {
  const [name, setName] = useState(initialName);

  // Reset the field every time the dialog opens (fixes rename showing an empty box)
  useEffect(() => {
    if (open) setName(initialName || '');
  }, [open, initialName]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
  };

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="modal max-w-sm p-7">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brass text-white shadow-md">
          <Icon name="folder" className="h-6 w-6" />
        </div>
        <h3 className="mb-4 font-serif text-xl text-ink">{title}</h3>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Folder name"
          className="input mb-6"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
