import React from 'react';
import { formatBytes, formatDate, fileIconLabel } from '../utils/format';

const TYPE_COLORS = {
  pdf: 'bg-rust/10 text-rust',
  doc: 'bg-vault/10 text-vault-dark',
  docx: 'bg-vault/10 text-vault-dark',
  xls: 'bg-brass/20 text-brass',
  xlsx: 'bg-brass/20 text-brass',
  ppt: 'bg-ink/10 text-ink',
  pptx: 'bg-ink/10 text-ink',
  jpg: 'bg-slate/10 text-slate',
  jpeg: 'bg-slate/10 text-slate',
  png: 'bg-slate/10 text-slate',
};

export default function DocumentRow({ document, onOpen, onDownload, onRename, onDelete }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3 border-b border-ink/8 hover:bg-white transition-colors group">
      <span
        className={`text-[10px] font-semibold px-1.5 py-1 rounded w-11 text-center ${
          TYPE_COLORS[document.fileType] || 'bg-slate/10 text-slate'
        }`}
      >
        {fileIconLabel(document.fileType)}
      </span>

      <button
        onClick={() => onOpen(document)}
        className="text-left text-sm font-medium text-ink truncate hover:text-vault-dark"
        title={document.name}
      >
        {document.name}
      </button>

      <span className="text-xs text-slate w-20 text-right">{formatBytes(document.fileSize)}</span>
      <span className="text-xs text-slate w-24 text-right">{formatDate(document.createdAt)}</span>

      <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onDownload(document)} className="text-xs font-medium text-vault-dark hover:underline">
          Download
        </button>
        <button onClick={() => onRename(document)} className="text-xs font-medium text-slate hover:text-ink">
          Rename
        </button>
        <button onClick={() => onDelete(document)} className="text-xs font-medium text-rust hover:underline">
          Delete
        </button>
      </div>
    </div>
  );
}
