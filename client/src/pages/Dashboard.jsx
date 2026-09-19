import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { warmDocument } from '../services/documentService';
import { formatBytes, formatDate, STORAGE_LIMIT } from '../utils/format';
import UploadModal from '../components/UploadModal';
import Icon from '../components/Icon';
import FileBadge from '../components/FileBadge';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const load = () => {
    api
      .get('/dashboard')
      .then((res) => {
        setData(res.data);
        res.data.recentDocuments?.slice(0, 3).forEach((d) => warmDocument(d._id));
      })
      .catch(() => showToast('Could not load dashboard data', 'error'));
  };

  useEffect(load, []);

  const stats = data?.stats;
  const firstName = user?.name?.split(' ')[0];
  const pct = stats ? Math.min(100, (stats.storageUsed / STORAGE_LIMIT) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 animate-fade-in">
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-3xl bg-night-900 p-8 text-white shadow-lift md:p-11">
        <div className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full bg-vault opacity-35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-vault-glow/20 blur-3xl" />
        <div className="relative max-w-xl">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 ring-1 ring-white/15">
            <Icon name="shield" className="h-3.5 w-3.5" />
            Secure vault
          </span>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            {firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
          </h1>
          <p className="mt-3 text-base text-white/65">Everything you keep here is one click from view — no downloads needed.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button onClick={() => setUploadOpen(true)} className="btn bg-white text-vault-dark shadow-lg hover:-translate-y-0.5 hover:shadow-xl">
              <Icon name="upload" className="h-4 w-4" />
              Upload document
            </button>
            <button onClick={() => navigate('/documents')} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              Browse documents
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Documents" value={stats?.totalDocuments ?? '—'} icon="files" tone="bg-vault" />
        <StatCard label="Folders" value={stats?.totalFolders ?? '—'} icon="folder" tone="bg-aqua" />
        <StatCard
          label="Storage used"
          value={stats ? formatBytes(stats.storageUsed) : '—'}
          icon="cloud"
          tone="bg-brass"
          progress={stats ? Math.max(pct, stats.storageUsed > 0 ? 3 : 0) : 0}
        />
      </div>

      {/* Recent */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink/5 px-6 py-4">
          <h2 className="font-serif text-xl text-ink">Recently uploaded</h2>
          <button onClick={() => navigate('/documents')} className="text-xs font-bold text-vault-dark hover:underline">
            View all →
          </button>
        </div>

        {data?.recentDocuments?.length ? (
          data.recentDocuments.map((doc) => (
            <div
              key={doc._id}
              className="group flex items-center gap-4 border-b border-ink/5 px-6 py-3.5 transition-colors last:border-b-0 hover:bg-vault-light/50"
            >
              <FileBadge type={doc.fileType} />
              <button
                onClick={() => navigate(`/documents/view/${doc._id}`)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-semibold text-ink group-hover:text-vault-dark">{doc.name}</span>
                <span className="block text-xs text-slate">
                  {formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}
                </span>
              </button>
              <button onClick={() => navigate(`/documents/view/${doc._id}`)} className="btn-soft btn-sm">
                <Icon name="eye" className="h-4 w-4" />
                View
              </button>
            </div>
          ))
        ) : (
          <div className="px-6 py-14 text-center">
            <p className="text-sm text-slate">Nothing uploaded yet — your recent documents will show up here.</p>
          </div>
        )}
      </section>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} folderId={null} onUploaded={load} />
    </div>
  );
}

function useCountUp(target, duration = 800) {
  const [display, setDisplay] = useState(typeof target === 'number' ? 0 : target);

  useEffect(() => {
    if (typeof target !== 'number') {
      setDisplay(target);
      return undefined;
    }
    let raf;
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setDisplay(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => raf && cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

function StatCard({ label, value, icon, tone, progress }) {
  const display = useCountUp(value);
  return (
    <div className="card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-slate">{label}</p>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md ${tone}`}>
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="font-serif text-4xl text-ink tabular-nums">{display}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
          <div className={`h-full rounded-full ${tone} transition-all duration-700`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
