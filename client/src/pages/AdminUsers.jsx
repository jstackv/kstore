import React, { useEffect, useState } from 'react';
import { listUsers, createUser, updateUser, deleteUser } from '../services/adminService';
import { formatBytes, formatDate } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';
import UserFormModal from '../components/UserFormModal';
import ConfirmDialog from '../components/ConfirmDialog';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState({ open: false, mode: 'create', target: null });
  const [confirmTarget, setConfirmTarget] = useState(null);

  const load = () => {
    listUsers()
      .then((res) => setUsers(res.users))
      .catch(() => showToast('Could not load users', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submitForm = async (form) => {
    try {
      if (formModal.mode === 'edit') {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await updateUser(formModal.target.id, payload);
        showToast('User updated');
      } else {
        await createUser(form);
        showToast('User created');
      }
      setFormModal({ open: false, mode: 'create', target: null });
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save user', 'error');
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteUser(confirmTarget.id);
      showToast('User and all their documents were deleted');
      setConfirmTarget(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete user', 'error');
      setConfirmTarget(null);
    }
  };

  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-ink">Users</h1>
          <p className="mt-1.5 text-sm text-slate">
            Accounts are created here, not by self-registration — {users.length} user{users.length === 1 ? '' : 's'}{' '}
            total.
          </p>
        </div>
        <button onClick={() => setFormModal({ open: true, mode: 'create', target: null })} className="btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Add user
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      ) : (
        <div className="card divide-y divide-ink/5 overflow-hidden">
          <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 bg-paper/70 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate md:grid">
            <span>Name / Email</span>
            <span>Role</span>
            <span className="text-right">Storage used</span>
            <span className="text-right">Joined</span>
            <span className="w-20" />
          </div>
          {users.map((u) => (
            <div key={u.id} className="grid grid-cols-1 items-center gap-2 px-5 py-4 md:grid-cols-[1fr_auto_auto_auto_auto] md:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-vault font-serif text-sm text-white">
                  {u.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {u.name}
                    {u.id === me?.id && <span className="ml-1.5 text-xs font-normal text-slate">(you)</span>}
                  </p>
                  <p className="truncate text-xs text-slate">{u.email}</p>
                </div>
              </div>
              <span
                className={`w-fit rounded-full px-2 py-0.5 text-xs font-semibold ${
                  u.role === 'admin' ? 'bg-vault/15 text-vault-dark' : 'bg-ink/5 text-slate'
                }`}
              >
                {u.role}
              </span>
              <span className="text-sm text-slate md:text-right">{formatBytes(u.storageUsed)}</span>
              <span className="text-sm text-slate md:text-right">{formatDate(u.createdAt)}</span>
              <div className="flex gap-1 md:justify-end">
                <button
                  onClick={() => setFormModal({ open: true, mode: 'edit', target: u })}
                  className="icon-btn"
                  title="Edit"
                  aria-label="Edit user"
                >
                  <Icon name="pencil" className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setConfirmTarget(u)}
                  disabled={u.id === me?.id}
                  className="icon-btn-danger disabled:opacity-30"
                  title={u.id === me?.id ? "You can't delete your own account" : 'Delete'}
                  aria-label="Delete user"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UserFormModal
        open={formModal.open}
        mode={formModal.mode}
        initial={formModal.target}
        onClose={() => setFormModal({ open: false, mode: 'create', target: null })}
        onSubmit={submitForm}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        title={`Delete ${confirmTarget?.name}?`}
        message="This permanently deletes their account and every document and folder they own, including the files stored in Cloudinary. This can't be undone."
        confirmLabel="Delete permanently"
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
