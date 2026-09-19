import React from 'react';
import { formatBytes, formatDate } from '../utils/format';
import { warmDocument } from '../services/documentService';
import Icon from './Icon';
import FileBadge from './FileBadge';

export default function DocumentGridCard({ document, onOpen, onDownload, onRename, onDelete, selected, onToggleSelect }) {
  return (
    <div
      onMouseEnter={() => warmDocument(document._id)}
      onTouchStart={() => warmDocument(document._id)}
      className={`card group relative flex flex-col p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lift ${
        selected ? 'ring-2 ring-vault' : ''
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <span className="relative shrink-0">
          <FileBadge type={document.fileType} size="lg" />
          <label
            className={`absolute -left-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border-2 shadow-sm transition-all ${
              selected
                ? 'border-vault bg-vault opacity-100'
                : 'border-ink/15 bg-surface opacity-0 group-hover:opacity-100 focus-within:opacity-100'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={!!selected}
              onChange={() => onToggleSelect(document._id)}
            />
            {selected && <Icon name="check" className="h-3 w-3 text-white" strokeWidth={3} />}
          </label>
        </span>
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button onClick={() => onRename(document)} className="icon-btn" title="Rename" aria-label="Rename">
            <Icon name="pencil" className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(document)} className="icon-btn-danger" title="Delete" aria-label="Delete">
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button onClick={() => onOpen(document)} className="mb-1 text-left" title={document.name}>
        <span className="block truncate text-sm font-semibold text-ink transition-colors group-hover:text-vault-dark">
          {document.name}
        </span>
      </button>
      <p className="mb-4 text-xs text-slate">
        {formatBytes(document.fileSize)} · {formatDate(document.createdAt)}
      </p>

      <div className="mt-auto flex gap-2">
        <button onClick={() => onOpen(document)} className="btn-soft btn-sm flex-1">
          <Icon name="eye" className="h-4 w-4" />
          View
        </button>
        <button onClick={() => onDownload(document)} className="icon-btn" title="Download" aria-label="Download">
          <Icon name="download" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
