import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getSharedFolder, sharedDocumentViewUrl, sharedDocumentDownloadUrl } from '../services/publicService';
import { formatBytes, formatDate, viewerKind } from '../utils/format';
import Icon from '../components/Icon';
import FileBadge from '../components/FileBadge';
import Logo from '../components/Logo';

const OFFICE_EMBED = 'https://view.officeapps.live.com/op/embed.aspx?src=';

export default function PublicDocumentViewer() {
  const { token, id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [doc, setDoc] = useState(null);

  // The public folder endpoint is also how we validate that this document
  // really belongs to this share token, and get its metadata - there's no
  // separate "get one public document" endpoint, on purpose, so a viewer
  // can never look up a document outside the folder they were given.
  useEffect(() => {
    let cancelled = false;
    getSharedFolder(token)
      .then((res) => {
        if (cancelled) return;
        const found = res.documents.find((d) => d._id === id);
        if (!found) {
          setState('error');
          return;
        }
        setDoc(found);
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-paper px-5 py-8 md:px-10">
        <div className="skeleton mb-6 h-10 w-1/2" />
        <div className="skeleton h-[70vh] w-full rounded-3xl" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper px-4">
        <div className="card max-w-sm p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rust/10 text-rust">
            <Icon name="alert" className="h-6 w-6" />
          </div>
          <h1 className="mb-1.5 font-serif text-lg text-ink">Couldn't open this document</h1>
          <p className="mb-5 text-sm text-slate">This link may have been revoked, or the document was removed.</p>
          <button onClick={() => navigate(-1)} className="btn-ghost">
            <Icon name="arrow-left" className="h-4 w-4" />
            Back
          </button>
        </div>
      </div>
    );
  }

  const kind = viewerKind(doc.fileType);
  const fileUrl = sharedDocumentViewUrl(token, doc._id);

  return (
    <div className="flex min-h-screen flex-col bg-paper px-4 py-6 md:px-8">
      <header className="mb-5 flex flex-wrap items-center gap-4">
        <Link to={`/share/${token}`} className="btn-ghost btn-sm">
          <Icon name="arrow-left" className="h-4 w-4" />
          Back
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FileBadge type={doc.fileType} />
          <div className="min-w-0">
            <h1 className="truncate font-serif text-xl text-ink" title={doc.name}>
              {doc.name}
            </h1>
            <p className="text-xs text-slate">
              {formatBytes(doc.fileSize)} · {formatDate(doc.createdAt)}
            </p>
          </div>
        </div>
        <a href={sharedDocumentDownloadUrl(token, doc._id)} className="btn-primary btn-sm">
          <Icon name="download" className="h-4 w-4" />
          Download
        </a>
      </header>

      <div className="relative flex-1 min-h-[70vh] overflow-hidden rounded-3xl bg-night-900 shadow-lift ring-1 ring-ink/10">
        {kind === 'pdf' && (
          <iframe title={doc.name} src={`${fileUrl}#view=FitH`} className="h-full min-h-[78vh] w-full bg-white" />
        )}
        {kind === 'image' && (
          <div className="flex h-full min-h-[70vh] items-center justify-center overflow-auto p-4 md:p-8">
            <img src={fileUrl} alt={doc.name} className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-modal" />
          </div>
        )}
        {(kind === 'docx' || kind === 'office') && (
          <>
            <iframe
              title={doc.name}
              src={`${OFFICE_EMBED}${encodeURIComponent(fileUrl)}`}
              className="h-full min-h-[78vh] w-full bg-white"
            />
            <p className="absolute inset-x-0 bottom-0 bg-night-900/80 py-2 text-center text-xs text-white/70">
              Previewed with the Microsoft Office viewer
            </p>
          </>
        )}
      </div>
    </div>
  );
}
