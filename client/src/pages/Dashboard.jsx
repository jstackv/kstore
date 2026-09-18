import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatBytes, formatDate, fileIconLabel } from '../utils/format';
import UploadModal from '../components/UploadModal';
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
      .then((res) => setData(res.data))
      .catch(() => showToast('Could not load dashboard data', 'error'));
  };

  useEffect(load, []);

  const stats = data?.stats;
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="px-6 md:px-10 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl text-ink">
            {firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
          </h1>
          <p className="text-sm text-slate mt-1">Here's what's in your vault.</p>
        </div>
        <button
          onClick={() => setUploadOpen(true)}
          className="bg-vault text-white text-sm font-medium rounded-md px-4 py-2.5 hover:bg-vault-dark transition-colors"
        >
          Upload document
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Documents" value={stats?.totalDocuments ?? '—'} />
        <StatCard label="Folders" value={stats?.totalFolders ?? '—'} />
        <StatCard label="Storage used" value={stats ? formatBytes(stats.storageUsed) : '—'} accent />
      </div>

      <div className="bg-white rounded-lg border border-ink/8">
        <div className="px-5 py-4 border-b border-ink/8 flex items-center justify-between">
          <h2 className="font-serif text-base text-ink">Recently uploaded</h2>
          <button onClick={() => navigate('/documents')} className="text-xs font-medium text-vault-dark hover:underline">
            View all
          </button>
        </div>

        {data?.recentDocuments?.length ? (
          data.recentDocuments.map((doc) => (
            <div
              key={doc._id}
              className="flex items-center gap-4 px-5 py-3 border-b border-ink/6 last:border-b-0"
            >
              <span className="text-[10px] font-semibold px-1.5 py-1 rounded w-11 text-center bg-slate/10 text-slate">
                {fileIconLabel(doc.fileType)}
              </span>
              <span className="text-sm font-medium text-ink truncate flex-1">{doc.name}</span>
              <span className="text-xs text-slate">{formatBytes(doc.fileSize)}</span>
              <span className="text-xs text-slate w-24 text-right">{formatDate(doc.createdAt)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate px-5 py-8 text-center">
            Nothing uploaded yet — your recent documents will show up here.
          </p>
        )}
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        folderId={null}
        onUploaded={load}
      />
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-lg border border-ink/8 px-5 py-4">
      <p className="text-xs text-slate mb-2">{label}</p>
      <p className={`font-serif text-2xl ${accent ? 'text-brass' : 'text-ink'}`}>{value}</p>
    </div>
  );
}
