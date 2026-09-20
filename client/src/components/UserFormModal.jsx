import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

const emptyForm = { name: '', email: '', password: '', role: 'user' };

export default function UserFormModal({ open, mode = 'create', initial, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      mode === 'edit' && initial
        ? { name: initial.name, email: initial.email, password: '', role: initial.role }
        : emptyForm
    );
  }, [open, mode, initial]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="modal max-w-sm p-7">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-vault/15 text-vault-glow">
          <Icon name="user" className="h-6 w-6" />
        </div>
        <h3 className="mb-4 font-serif text-xl text-ink">{mode === 'edit' ? 'Edit user' : 'Add user'}</h3>

        <label className="label">Name</label>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input mb-4"
        />

        <label className="label">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="input mb-4"
        />

        <label className="label">{mode === 'edit' ? 'New password (optional)' : 'Password'}</label>
        <input
          type="password"
          required={mode !== 'edit'}
          minLength={6}
          placeholder={mode === 'edit' ? 'Leave blank to keep current password' : undefined}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="input mb-4"
        />

        <label className="label">Role</label>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="select mb-6">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
