import React from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

// tone: 'danger' (default) for destructive actions, 'friendly' for
// everyday confirmations like logging out - same nice modal, softer color.
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  icon = 'trash',
  tone = 'danger',
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  const isDanger = tone === 'danger';
  // Portal straight to <body>: rendering in place would nest this inside
  // whatever triggered it (e.g. the sidebar, which uses position: sticky
  // and so creates its own stacking context) - that traps z-50 locally and
  // the modal ends up painted behind unrelated page content. A portal
  // escapes any ancestor's stacking context entirely.
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal max-w-sm p-7">
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
            isDanger ? 'bg-rust/10 text-rust' : 'bg-vault/15 text-vault-glow'
          }`}
        >
          <Icon name={icon} className="h-6 w-6" />
        </div>
        <h3 className="mb-1.5 font-serif text-xl text-ink">{title}</h3>
        <p className="mb-7 text-sm leading-relaxed text-slate">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button onClick={onConfirm} className={isDanger ? 'btn-danger' : 'btn-primary'}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
