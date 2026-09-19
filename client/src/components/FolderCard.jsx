import React from 'react';
import Icon from './Icon';

export default function FolderCard({ folder, onOpen, onRename, onDelete }) {
  return (
    <div className="card group flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <button onClick={() => onOpen(folder)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brass text-white shadow-md transition-transform group-hover:scale-105">
          <Icon name="folder" className="h-6 w-6" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{folder.name}</span>
          <span className="block text-xs text-slate">Folder</span>
        </span>
      </button>
      <div className="flex shrink-0 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <button onClick={() => onRename(folder)} className="icon-btn" title="Rename" aria-label="Rename folder">
          <Icon name="pencil" className="h-4 w-4" />
        </button>
        <button onClick={() => onDelete(folder)} className="icon-btn-danger" title="Delete" aria-label="Delete folder">
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
