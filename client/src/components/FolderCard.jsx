import React from 'react';

export default function FolderCard({ folder, onOpen, onRename, onDelete }) {
  return (
    <div className="group flex items-center justify-between px-4 py-3 border-b border-ink/8 hover:bg-white transition-colors">
      <button
        onClick={() => onOpen(folder)}
        className="flex items-center gap-3 text-left flex-1 min-w-0"
      >
        <span className="h-7 w-9 rounded bg-brass-light border border-brass/30 shrink-0" />
        <span className="text-sm font-medium text-ink truncate">{folder.name}</span>
      </button>
      <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onRename(folder)} className="text-xs font-medium text-slate hover:text-ink">
          Rename
        </button>
        <button onClick={() => onDelete(folder)} className="text-xs font-medium text-rust hover:underline">
          Delete
        </button>
      </div>
    </div>
  );
}
