import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user, refreshUser } = useAuth();
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
    <div className="px-6 md:px-10 py-8 max-w-lg">
      <h1 className="font-serif text-2xl text-ink mb-8">Profile settings</h1>

      <form onSubmit={saveProfile} className="bg-white rounded-lg border border-ink/8 p-6 mb-6">
        <h2 className="font-serif text-base text-ink mb-4">Account details</h2>

        <label className="block text-xs font-medium text-slate mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-vault/40"
        />

        <label className="block text-xs font-medium text-slate mb-1">Email</label>
        <input
          disabled
          value={user?.email || ''}
          className="w-full border border-ink/10 rounded-md px-3 py-2 text-sm mb-5 bg-paper text-slate"
        />

        <button
          disabled={savingProfile}
          className="bg-vault text-white text-sm font-medium rounded-md px-4 py-2.5 hover:bg-vault-dark disabled:opacity-60"
        >
          {savingProfile ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form onSubmit={savePassword} className="bg-white rounded-lg border border-ink/8 p-6">
        <h2 className="font-serif text-base text-ink mb-4">Change password</h2>

        <label className="block text-xs font-medium text-slate mb-1">Current password</label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-vault/40"
        />

        <label className="block text-xs font-medium text-slate mb-1">New password</label>
        <input
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-vault/40"
        />

        <button
          disabled={savingPassword}
          className="bg-vault text-white text-sm font-medium rounded-md px-4 py-2.5 hover:bg-vault-dark disabled:opacity-60"
        >
          {savingPassword ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
