import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', { name });
      await refreshUser();
      showToast('Profile updated');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      showToast('Password changed');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 md:px-10 animate-fade-in">
      <div className="mb-8 flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-vault font-serif text-3xl text-white shadow-glow">
          {(user?.name || '?').charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="font-serif text-4xl text-ink">Profile settings</h1>
          <p className="text-sm text-slate">{user?.email}</p>
        </div>
      </div>

      <form onSubmit={saveProfile} className="card mb-6 p-7">
        <h2 className="mb-5 font-serif text-xl text-ink">Account details</h2>

        <label className="label">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input mb-4" />

        <label className="label">Email</label>
        <input disabled value={user?.email || ''} className="input mb-6" />

        <button disabled={savingProfile} className="btn-primary">
          {savingProfile ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form onSubmit={savePassword} className="card mb-6 p-7">
        <h2 className="mb-5 font-serif text-xl text-ink">Change password</h2>

        <label className="label">Current password</label>
        <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="input mb-4" />

        <label className="label">New password</label>
        <input type="password" required minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input mb-6" />

        <button disabled={savingPassword} className="btn-primary">
          {savingPassword ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <button onClick={logout} className="btn-ghost md:hidden">
        Log out
      </button>
    </div>
  );
}
