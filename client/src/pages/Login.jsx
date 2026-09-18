import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="font-serif text-2xl text-ink">KStore</span>
          <p className="text-sm text-slate mt-1">Your documents, always at hand</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-lg shadow-sm border border-ink/8 p-6">
          <h1 className="font-serif text-lg text-ink mb-5">Sign in</h1>

          <label className="block text-xs font-medium text-slate mb-1">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-vault/40"
          />

          <label className="block text-xs font-medium text-slate mb-1">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-ink/15 rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-2 focus:ring-vault/40"
          />

          <button
            disabled={loading}
            className="w-full bg-vault text-white text-sm font-medium rounded-md py-2.5 hover:bg-vault-dark transition-colors disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-slate text-center mt-5">
          Don't have an account?{' '}
          <Link to="/register" className="text-vault-dark font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
