import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getSharedFolder, sharedDocumentDownloadUrl } from '../services/publicService';
import { formatBytes, formatDate } from '../utils/format';
import Icon from '../components/Icon';
import FileBadge from '../components/FileBadge';
import Logo from '../components/Logo';

export default function PublicFolder() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [folder, setFolder] = useState(null);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getSharedFolder(token)
      .then((res) => {
        if (cancelled) return;
        setFolder(res.folder);
        setDocuments(res.documents);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink/10 bg-surface px-5 py-4 md:px-10">
        <Link to="/login">
          <Logo dark={false} size="sm" />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        {state === 'loading' && (
          <div className="space-y-3">
            <div className="skeleton h-8 w-1/2" />
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-20 w-full" />
          </div>
        )}

        {state === 'error' && (
          <div className="card p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rust/10 text-rust">
              <Icon name="alert" className="h-6 w-6" />
            </div>
            <h1 className="mb-1.5 font-serif text-xl text-ink">This link isn't valid</h1>
            <p className="text-sm text-slate">It may have been revoked, or the folder no longer exists.</p>
          </div>
        )}

        {state === 'ready' && (
          <>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-vault/10 px-3 py-1 text-xs font-semibold text-vault-dark">
              <Icon name="link" className="h-3.5 w-3.5" />
              Shared folder
            </div>
            <h1 className="mb-1 font-serif text-3xl text-ink">{folder.name}</h1>
            <p className="mb-8 text-sm text-slate">
              {documents.length} document{documents.length === 1 ? '' : 's'} — anyone with this link can view these
              files
            </p>

            {documents.length === 0 ? (
              <div className="card p-10 text-center text-sm text-slate">This folder is empty.</div>
            ) : (
              <div className="card divide-y divide-ink/5 overflow-hidden">
                {documents.map((doc) => (
                  <div key={doc._id} className="flex items-center gap-4 p-4">
                    <FileBadge type={doc.fileType} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{doc.name}</p>
                      <p className="text-xs text-slate">
                        {formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/share/${token}/view/${doc._id}`)}
                      className="btn-soft btn-sm shrink-0"
                    >
                      <Icon name="eye" className="h-4 w-4" />
                      View
                    </button>
                    <a
                      href={sharedDocumentDownloadUrl(token, doc._id)}
                      className="icon-btn shrink-0"
                      title="Download"
                      aria-label="Download"
                    >
                      <Icon name="download" className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
