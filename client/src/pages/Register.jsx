import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthShell from '../components/AuthShell';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      showToast(err.response?.data?.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start storing your documents beautifully."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-vault-dark hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={submit}>
        <label className="label">Name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="input mb-4" placeholder="Your name" />

        <label className="label">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input mb-4" placeholder="you@example.com" />

        <label className="label">Password</label>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="input mb-7" placeholder="At least 6 characters" />

        <button disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
