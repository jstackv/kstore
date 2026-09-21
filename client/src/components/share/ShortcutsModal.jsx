import React, { useEffect } from 'react';
import Icon from '../Icon';

const GROUPS = {
  pdf: [
    ['← / →', 'Previous / next page'],
    ['Home / End', 'First / last page'],
    ['+  −  0', 'Zoom in, out, fit to width'],
    ['Ctrl + scroll', 'Zoom with the mouse or trackpad'],
    ['T', 'Toggle page thumbnails'],
  ],
  image: [
    ['+  −  0', 'Zoom in, out, reset'],
    ['Scroll / pinch', 'Zoom toward the cursor'],
    ['Drag', 'Pan around'],
    ['Double-click', 'Zoom in / back out'],
    ['R', 'Rotate 90°'],
  ],
  docx: [['+  −  0', 'Zoom in, out, reset']],
  office: [],
};

// Cheat-sheet opened with "?" in the document viewer.
export default function ShortcutsModal({ kind, hasSiblings, onClose }) {
  useEffect(() => {
    const onKey = (e) => (e.key === 'Escape' || e.key === '?') && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = [
    ...(GROUPS[kind] || []),
    ...(hasSiblings ? [['[  ]', 'Previous / next document in this folder']] : []),
    ['F', 'Fullscreen'],
    ['D', 'Download'],
    ['C', 'Copy link to this document'],
    ['Esc', 'Back to the folder'],
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-night-800 p-6 text-white shadow-modal ring-1 ring-white/10 animate-scale-in"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-serif text-lg">
            <Icon name="keyboard" className="h-5 w-5 text-vault-glow" />
            Keyboard shortcuts
          </h2>
          <button onClick={onClose} className="vbtn h-8 w-8 !px-0" aria-label="Close">
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <ul className="space-y-2.5">
          {rows.map(([keys, label]) => (
            <li key={keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-white/70">{label}</span>
              <span className="flex shrink-0 gap-1">
                {keys.split(/\s{2,}|\s\/\s/).map((k) => (
                  <kbd key={k} className="kbd">
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
