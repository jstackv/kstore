import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getDocument,
  viewDocument,
  downloadDocument,
  fetchDocumentFile,
  blobErrorMessage,
} from '../services/documentService';
import { formatBytes, formatDate, viewerKind } from '../utils/format';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';
import FileBadge from '../components/FileBadge';

const OFFICE_EMBED = 'https://view.officeapps.live.com/op/embed.aspx?src=';
const MIME = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

export default function DocumentViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [doc, setDoc] = useState(null);
  const [phase, setPhase] = useState('loading'); // loading | ready | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [blobUrl, setBlobUrl] = useState(null); // pdf / image
  const [remoteUrl, setRemoteUrl] = useState(null); // hosted Office viewer
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [info, setInfo] = useState(null); // { url, previewUrl } from /view
  const [contentLoaded, setContentLoaded] = useState(false);
  const [forceServer, setForceServer] = useState(false);

  const stageRef = useRef(null);
  const docxRef = useRef(null);

  // 1) document metadata + direct delivery URLs, fetched together
  useEffect(() => {
    let cancelled = false;
    setDoc(null);
    setInfo(null);
    setForceServer(false);
    setPhase('loading');
    Promise.all([getDocument(id), viewDocument(id)])
      .then(([docRes, viewRes]) => {
        if (cancelled) return;
        setInfo(viewRes);
        setDoc(docRes.document);
      })
      .catch(() => {
        if (cancelled) return;
        showToast('Could not load document', 'error');
        navigate('/documents');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 2) show the file. PDFs and images load straight from the CDN, so the browser can
  //    render the first page while the rest is still streaming (no waiting for a full download).
  useEffect(() => {
    if (!doc || !info) return undefined;
    let cancelled = false;
    let objectUrl = null;
    const kind = viewerKind(doc.fileType);

    setPhase('loading');
    setProgress(0);
    setError('');
    setBlobUrl(null);
    setRemoteUrl(null);
    setContentLoaded(false);
    setZoom(1);

    (async () => {
      try {
        if (kind === 'office') {
          setRemoteUrl(info.url); // phase flips to 'ready' when the iframe loads
          return;
        }

        if (kind === 'image' && !forceServer) {
          setBlobUrl(info.previewUrl || info.url);
          setPhase('ready');
          return;
        }

        // Authenticated download through the API (docx rendering, or the secure fallback)
        const raw = await fetchDocumentFile(doc._id, (loaded) => {
          if (!cancelled && doc.fileSize) setProgress(Math.min(99, Math.round((loaded * 100) / doc.fileSize)));
        });
        if (cancelled) return;

        if (kind === 'docx') {
          try {
            const { renderAsync } = await import('docx-preview');
            if (cancelled || !docxRef.current) return;
            docxRef.current.innerHTML = '';
            await renderAsync(raw, docxRef.current, docxRef.current, {
              className: 'docx',
              inWrapper: true,
              breakPages: true,
              ignoreLastRenderedPageBreak: false,
            });
            if (!cancelled) setPhase('ready');
          } catch {
            if (!cancelled) setRemoteUrl(info.url); // hosted viewer fallback
          }
          return;
        }

        const blob = new Blob([raw], { type: MIME[doc.fileType] || doc.mimeType });
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
        setPhase('ready');
      } catch (err) {
        if (cancelled) return;
        setError(await blobErrorMessage(err));
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, info, attempt, forceServer]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  };

  const handleDownload = async () => {
    try {
      await downloadDocument(doc._id, doc.name);
    } catch {
      showToast('Download failed', 'error');
    }
  };

  if (!doc) {
    return (
      <div className="px-4 py-8 md:px-8">
        <div className="skeleton mb-6 h-14 w-2/3" />
        <div className="skeleton h-[70vh] w-full rounded-3xl" />
      </div>
    );
  }

  const kind = viewerKind(doc.fileType);
  const zoomable = kind === 'image' || kind === 'docx';

  return (
    <div className="flex min-h-screen flex-col px-4 py-6 md:px-8 animate-fade-in">
      {/* Top bar */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm" aria-label="Back">
          <Icon name="arrow-left" className="h-4 w-4" />
          Back
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FileBadge type={doc.fileType} />
          <div className="min-w-0">
            <h1 className="truncate font-serif text-xl text-ink md:text-2xl" title={doc.name}>
              {doc.name}
            </h1>
            <p className="text-xs text-slate">
              {formatBytes(doc.fileSize)} · Uploaded {formatDate(doc.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {zoomable && phase === 'ready' && (
            <div className="flex items-center gap-1 rounded-xl bg-surface/80 p-1 shadow-sm ring-1 ring-ink/10">
              <button className="icon-btn h-8 w-8" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Zoom out">
                <Icon name="zoom-out" className="h-4 w-4" />
              </button>
              <button className="min-w-[3.25rem] text-xs font-semibold text-ink/70 hover:text-vault-dark" onClick={() => setZoom(1)} title="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              <button className="icon-btn h-8 w-8" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Zoom in">
                <Icon name="zoom-in" className="h-4 w-4" />
              </button>
            </div>
          )}
          {blobUrl && (
            <a href={blobUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm" title="Open in a new tab">
              <Icon name="external-link" className="h-4 w-4" />
              <span className="hidden sm:inline">New tab</span>
            </a>
          )}
          <button onClick={toggleFullscreen} className="btn-ghost btn-sm" title="Fullscreen">
            <Icon name="expand" className="h-4 w-4" />
            <span className="hidden sm:inline">{fullscreen ? 'Exit' : 'Fullscreen'}</span>
          </button>
          <button onClick={handleDownload} className="btn-primary btn-sm">
            <Icon name="download" className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>

      {/* Stage */}
      <div
        ref={stageRef}
        className="relative flex-1 min-h-[70vh] overflow-hidden rounded-3xl bg-night-900 shadow-lift ring-1 ring-ink/10"
      >
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-vault/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-vault/15 blur-3xl" />

        {kind === 'pdf' && blobUrl && (
          <iframe
            title={doc.name}
            src={`${blobUrl}#view=FitH`}
            onLoad={() => setContentLoaded(true)}
            className="relative h-full min-h-[78vh] w-full bg-white"
          />
        )}

        {kind === 'image' && blobUrl && (
          <div className="relative flex h-full max-h-[calc(100vh-9rem)] min-h-[70vh] items-center justify-center overflow-auto p-4 md:p-8">
            <img
              src={blobUrl}
              alt={doc.name}
              onLoad={() => setContentLoaded(true)}
              className={`rounded-xl shadow-modal ${zoom === 1 ? 'max-h-[75vh] max-w-full object-contain' : 'max-w-none'}`}
              style={zoom === 1 ? undefined : { width: `${zoom * 100}%` }}
            />
          </div>
        )}

        {kind === 'docx' && (
          <div className="relative h-full max-h-[calc(100vh-9rem)] min-h-[70vh] overflow-auto p-2 md:p-6">
            <div ref={docxRef} style={{ zoom }} className="docx-host mx-auto" />
          </div>
        )}

        {kind === 'office' && remoteUrl && (
          <iframe
            title={doc.name}
            src={`${OFFICE_EMBED}${encodeURIComponent(remoteUrl)}`}
            onLoad={() => setPhase('ready')}
            className="relative h-full min-h-[78vh] w-full bg-white"
          />
        )}

        {!contentLoaded && phase === 'ready' && (kind === 'pdf' || kind === 'image') && (
          <div className="absolute inset-x-0 top-0 z-20 h-1 overflow-hidden bg-white/10">
            <div className="h-full w-1/3 rounded-full bg-vault animate-indeterminate" />
          </div>
        )}

        {phase === 'loading' && <LoadingOverlay doc={doc} progress={progress} />}
        {phase === 'error' && (
          <ErrorOverlay message={error} onRetry={() => setAttempt((a) => a + 1)} onDownload={handleDownload} />
        )}
      </div>

      {kind === 'image' && !forceServer && (
        <p className="mt-3 text-center text-xs text-slate">
          Image not displaying?{' '}
          <button onClick={() => setForceServer(true)} className="font-semibold text-vault-dark hover:underline">
            Load through the secure server
          </button>
        </p>
      )}

      {kind === 'office' && phase === 'ready' && (
        <p className="mt-3 text-center text-xs text-slate">
          Previewed with the Microsoft Office viewer. Formatting may differ slightly from the original.
        </p>
      )}
    </div>
  );
}

function LoadingOverlay({ doc, progress }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-night-900/70 backdrop-blur-md">
      <div className="w-72 rounded-3xl bg-surface p-6 text-center shadow-modal animate-scale-in">
        <div className="mx-auto mb-4 w-fit animate-float">
          <FileBadge type={doc.fileType} size="lg" />
        </div>
        <p className="font-serif text-lg text-ink">Opening document</p>
        <p className="mt-0.5 truncate text-xs text-slate">{doc.name}</p>
        <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-ink/10">
          {progress > 0 ? (
            <div className="h-full rounded-full bg-vault transition-all duration-300" style={{ width: `${progress}%` }} />
          ) : (
            <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-vault animate-indeterminate" />
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorOverlay({ message, onRetry, onDownload }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-night-900/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl bg-surface p-6 text-center shadow-modal animate-scale-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rust/10 text-rust">
          <Icon name="alert" className="h-6 w-6" />
        </div>
        <p className="font-serif text-lg text-ink">Couldn't open this document</p>
        <p className="mt-1 text-sm text-slate">{message}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button onClick={onRetry} className="btn-soft btn-sm">
            <Icon name="refresh" className="h-4 w-4" />
            Try again
          </button>
          <button onClick={onDownload} className="btn-ghost btn-sm">
            <Icon name="download" className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
