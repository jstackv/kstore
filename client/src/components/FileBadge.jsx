import React from 'react';

// One solid color per file type - distinct enough to scan a list at a
// glance, without resorting to gradients.
const STYLES = {
  pdf: 'bg-[#E5484D]',
  doc: 'bg-[#3B5BDB]',
  docx: 'bg-[#3B5BDB]',
  xls: 'bg-[#0E9F7E]',
  xlsx: 'bg-[#0E9F7E]',
  ppt: 'bg-[#F26B21]',
  pptx: 'bg-[#F26B21]',
  jpg: 'bg-vault',
  jpeg: 'bg-vault',
  png: 'bg-vault',
};

export default function FileBadge({ type, size = 'md' }) {
  const dims = size === 'lg' ? 'h-14 w-14 text-xs rounded-2xl' : size === 'sm' ? 'h-9 w-9 text-[9px] rounded-lg' : 'h-11 w-11 text-[10px] rounded-xl';
  return (
    <span
      className={`relative shrink-0 inline-flex items-center justify-center font-bold uppercase tracking-wide text-white shadow-md overflow-hidden ${dims} ${
        STYLES[type] || 'bg-[#5E6088]'
      }`}
    >
      <span className="absolute right-0 top-0 h-3 w-3 bg-white/30 rounded-bl-lg" />
      {(type || 'file').slice(0, 4)}
    </span>
  );
}
