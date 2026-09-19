import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthShell from '../components/AuthShell';

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
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to open your vault."
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-vault-dark hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={submit}>
        <label className="label">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input mb-4" placeholder="you@example.com" />

        <label className="label">Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input mb-7" placeholder="••••••••" />

        <button disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
