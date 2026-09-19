import React from 'react';
import { formatBytes, formatDate } from '../utils/format';
import Icon from './Icon';
import { warmDocument } from '../services/documentService';
import FileBadge from './FileBadge';

export default function DocumentRow({ document, onOpen, onDownload, onRename, onDelete, selected, onToggleSelect }) {
  return (
    <div
      onMouseEnter={() => warmDocument(document._id)}
      onTouchStart={() => warmDocument(document._id)}
      className={`group grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-ink/5 px-4 py-3 transition-colors last:border-b-0 hover:bg-vault-light/50 md:grid-cols-[auto_1fr_90px_120px_auto] ${
        selected ? 'bg-vault-light/60' : ''
      }`}
    >
      <span className="relative shrink-0">
        <FileBadge type={document.fileType} />
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

      <button onClick={() => onOpen(document)} className="min-w-0 text-left" title={document.name}>
        <span className="block truncate text-sm font-semibold text-ink transition-colors group-hover:text-vault-dark">
          {document.name}
        </span>
        <span className="block text-xs text-slate md:hidden">
          {formatBytes(document.fileSize)} · {formatDate(document.createdAt)}
        </span>
      </button>

      <span className="hidden text-right text-xs font-medium text-slate md:block">{formatBytes(document.fileSize)}</span>
      <span className="hidden text-right text-xs text-slate md:block">{formatDate(document.createdAt)}</span>

      <div className="flex items-center justify-end gap-1">
        <button onClick={() => onOpen(document)} className="btn-soft btn-sm" title="View online">
          <Icon name="eye" className="h-4 w-4" />
          <span className="hidden sm:inline">View</span>
        </button>
        <div className="flex items-center transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <button onClick={() => onDownload(document)} className="icon-btn" title="Download" aria-label="Download">
            <Icon name="download" className="h-4 w-4" />
          </button>
          <button onClick={() => onRename(document)} className="icon-btn" title="Rename" aria-label="Rename">
            <Icon name="pencil" className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(document)} className="icon-btn-danger" title="Delete" aria-label="Delete">
            <Icon name="trash" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
