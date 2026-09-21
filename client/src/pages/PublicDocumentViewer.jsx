import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  fetchSharedFile,
  getSharedFolder,
  sharedDocumentDownloadUrl,
  sharedDocumentViewUrl,
  sharedFileErrorMessage,
} from '../services/publicService';
import { formatBytes, formatRelative, typeMeta, viewerKind } from '../utils/format';
import { copyText } from '../utils/clipboard';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';
import FileBadge from '../components/FileBadge';
import Logo from '../components/Logo';
import ImageStage from '../components/share/ImageStage';
import DocxStage from '../components/share/DocxStage';
import ShortcutsModal from '../components/share/ShortcutsModal';

// PDF.js is big, so it only downloads when someone actually opens a PDF.
const PdfReader = lazy(() => import('../components/share/PdfReader'));

const OFFICE_EMBED = 'https://view.officeapps.live.com/op/embed.aspx?src=';

export default function PublicDocumentViewer() {
  const { token, id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [meta, setMeta] = useState({ state: 'loading', folder: null, docs: [] });
  const [phase, setPhase] = useState('loading'); // loading | ready | error
  const [progress, setProgress] = useState(0);
  const [errMsg, setErrMsg] = useState('');
  const [payload, setPayload] = useState(null); // { buf } | { url }
  const [attempt, setAttempt] = useState(0);
  const [forceOffice, setForceOffice] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [strip, setStrip] = useState(true);
  const [help, setHelp] = useState(false);
  const stageRef = useRef(null);
  const stripRef = useRef(null);

  // The public folder endpoint is also how we validate that this document really
  // belongs to this share token (there is deliberately no "get one public
  // document" endpoint), and it gives us the sibling documents for prev/next.
  useEffect(() => {
    let cancelled = false;
    getSharedFolder(token)
      .then((res) => {
        if (!cancelled) setMeta({ state: 'ready', folder: res.folder, docs: res.documents });
      })
      .catch(() => {
        if (!cancelled) setMeta({ state: 'error', folder: null, docs: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const docs = meta.docs;
  const index = docs.findIndex((d) => d._id === id);
  const doc = index >= 0 ? docs[index] : null;
  const prev = index > 0 ? docs[index - 1] : null;
  const next = index >= 0 && index < docs.length - 1 ? docs[index + 1] : null;
  const kind = doc ? (forceOffice ? 'office' : viewerKind(doc.fileType)) : null;

  const folderPath = `/share/${token}`;
  const goTo = useCallback((d) => d && navigate(`${folderPath}/view/${d._id}`), [navigate, folderPath]);

  useEffect(() => {
    setForceOffice(false);
  }, [id]);

  useEffect(() => {
    if (doc) document.title = `${doc.name} · KStore`;
  }, [doc]);

  // ---- fetch the file bytes -----------------------------------------------
  useEffect(() => {
    if (!doc) return undefined;
    setPhase('loading');
    setProgress(0);
    setErrMsg('');
    setPayload(null);
    if (kind === 'office') return undefined; // the hosted viewer's iframe flips us to "ready"

    let cancelled = false;
    let objectUrl = null;
    const ctrl = new AbortController();
    fetchSharedFile(token, doc._id, {
      signal: ctrl.signal,
      onProgress: (loaded, total) => {
        const t = total || doc.fileSize || 0;
        if (!cancelled && t) setProgress(Math.min(99, Math.round((loaded * 100) / t)));
      },
    })
      .then((buf) => {
        if (cancelled) return;
        setProgress(100);
        if (kind === 'image') {
          objectUrl = URL.createObjectURL(new Blob([buf], { type: doc.mimeType }));
          setPayload({ url: objectUrl });
        } else {
          setPayload({ buf });
        }
      })
      .catch((err) => {
        if (cancelled || err?.code === 'ERR_CANCELED') return;
        setErrMsg(sharedFileErrorMessage(err));
        setPhase('error');
      });

    return () => {
      cancelled = true;
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc?._id, kind, attempt, token]);

  const markReady = useCallback(() => setPhase('ready'), []);
  const fail = useCallback((message) => {
    setErrMsg(message);
    setPhase('error');
  }, []);

  // ---- actions --------------------------------------------------------------
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stageRef.current?.requestFullscreen?.();
  }, []);

  const copyLink = useCallback(async () => {
    const ok = await copyText(window.location.href);
    showToast(ok ? 'Link to this document copied' : "Couldn't copy the link", ok ? 'success' : 'error');
  }, [showToast]);

  const download = useCallback(() => {
    if (doc) window.location.href = sharedDocumentDownloadUrl(token, doc._id);
  }, [doc, token]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || help) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case ']':
          goTo(next);
          break;
        case '[':
          goTo(prev);
          break;
        case 'ArrowRight':
          if (kind !== 'pdf') goTo(next);
          break;
        case 'ArrowLeft':
          if (kind !== 'pdf') goTo(prev);
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'd':
        case 'D':
          download();
          break;
        case 'c':
        case 'C':
          copyLink();
          break;
        case '?':
          setHelp(true);
          break;
        case 'Escape':
          if (!document.fullscreenElement) navigate(folderPath);
          break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [help, kind, next, prev, goTo, toggleFullscreen, download, copyLink, navigate, folderPath]);

  // keep the current document visible in the filmstrip
  useEffect(() => {
    stripRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [id, strip, meta.state]);

  const fileUrl = useMemo(() => (doc ? sharedDocumentViewUrl(token, doc._id) : ''), [doc, token]);

  // ---- loading / error shells ------------------------------------------------
  if (meta.state === 'loading') {
    return (
      <div className="flex h-dvh flex-col bg-night-900 p-4 md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-9 w-24 animate-pulse rounded-xl bg-white/10" />
          <div className="h-9 w-9 animate-pulse rounded-lg bg-white/10" />
          <div className="h-5 w-56 animate-pulse rounded-full bg-white/10" />
        </div>
        <div className="flex-1 animate-pulse rounded-3xl bg-white/[0.06]" />
      </div>
    );
  }

  if (meta.state === 'error' || !doc) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-night-900 px-4 text-white">
        <div className="aurora -left-24 -top-24 h-96 w-96 bg-vault" />
        <div className="relative w-full max-w-sm rounded-3xl bg-white/[0.06] p-8 text-center shadow-modal ring-1 ring-white/15 backdrop-blur-xl animate-scale-in">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rust/15 text-rose-300">
            <Icon name="alert" className="h-6 w-6" />
          </div>
          <h1 className="mb-1.5 font-serif text-lg">Couldn't open this document</h1>
          <p className="mb-5 text-sm text-white/60">This link may have been turned off, or the document was removed.</p>
          {meta.state === 'ready' ? (
            <Link to={folderPath} className="vbtn-primary">
              <Icon name="arrow-left" className="h-4 w-4" />
              Back to folder
            </Link>
          ) : (
            <Logo size="sm" />
          )}
        </div>
      </div>
    );
  }

  const tm = typeMeta(doc.fileType);
  const hasSiblings = docs.length > 1;

  return (
    <div className="flex h-dvh flex-col bg-night-900 text-white">
      {/* ------------------------------ header ------------------------------ */}
      <header className="relative z-40 flex items-center gap-2 border-b border-white/10 bg-night-900/95 px-3 py-2.5 backdrop-blur-xl md:gap-3 md:px-5">
        <Link to={folderPath} className="vbtn shrink-0 bg-white/[0.06]" title="Back to folder (Esc)">
          <Icon name="arrow-left" className="h-4 w-4" />
          <span className="hidden sm:inline">{meta.folder?.name ? <span className="max-w-[9rem] truncate">{meta.folder.name}</span> : 'Folder'}</span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <FileBadge type={doc.fileType} size="sm" />
          <div className="min-w-0">
            <h1 className="truncate font-serif text-sm font-bold leading-tight md:text-base" title={doc.name}>
              {doc.name}
            </h1>
            <p className="truncate text-[11px] text-white/50">
              {tm.label} · {formatBytes(doc.fileSize)} · {formatRelative(doc.createdAt)}
              {meta.folder?.sharedBy && <span className="hidden md:inline"> · shared by {meta.folder.sharedBy}</span>}
            </p>
          </div>
        </div>

        {hasSiblings && (
          <div className="flex shrink-0 items-center rounded-xl bg-white/[0.06] p-0.5">
            <button className="vbtn h-8 min-w-[2rem] px-1.5" disabled={!prev} onClick={() => goTo(prev)} aria-label="Previous document" title="Previous document ( [ )">
              <Icon name="chevron-left" className="h-4 w-4" />
            </button>
            <span className="px-1 text-xs font-semibold tabular-nums text-white/70">
              {index + 1}<span className="text-white/35"> / {docs.length}</span>
            </span>
            <button className="vbtn h-8 min-w-[2rem] px-1.5" disabled={!next} onClick={() => goTo(next)} aria-label="Next document" title="Next document ( ] )">
              <Icon name="chevron" className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {hasSiblings && (
            <button
              className={`vbtn hidden md:inline-flex ${strip ? 'vbtn-on' : ''}`}
              onClick={() => setStrip((s) => !s)}
              aria-pressed={strip}
              title="Show all documents"
              aria-label="Toggle document strip"
            >
              <Icon name="filmstrip" className="h-4 w-4" />
            </button>
          )}
          <button className="vbtn hidden md:inline-flex" onClick={() => setHelp(true)} title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">
            <Icon name="keyboard" className="h-4 w-4" />
          </button>
          <button className="vbtn hidden sm:inline-flex" onClick={copyLink} title="Copy link to this document (C)" aria-label="Copy link">
            <Icon name="link" className="h-4 w-4" />
          </button>
          <button className="vbtn hidden sm:inline-flex" onClick={toggleFullscreen} title="Fullscreen (F)" aria-label="Fullscreen">
            <Icon name={fullscreen ? 'minimize' : 'expand'} className="h-4 w-4" />
          </button>
          <a href={sharedDocumentDownloadUrl(token, doc._id)} className="vbtn-primary ml-1" title="Download (D)">
            <Icon name="download" className="h-4 w-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </header>

      {/* ------------------------------- stage ------------------------------ */}
      <main className="relative min-h-0 flex-1">
        <div ref={stageRef} className="dot-grid absolute inset-0 overflow-hidden bg-night-800">
          {kind === 'pdf' && payload?.buf && (
            <Suspense fallback={null}>
              <PdfReader key={`${doc._id}-${attempt}`} data={payload.buf} onReady={markReady} onError={fail} />
            </Suspense>
          )}

          {kind === 'image' && payload?.url && (
            <ImageStage key={`${doc._id}-${attempt}`} src={payload.url} alt={doc.name} onReady={markReady} onError={fail} />
          )}

          {kind === 'docx' && payload?.buf && (
            <DocxStage
              key={`${doc._id}-${attempt}`}
              data={payload.buf}
              onReady={markReady}
              onError={() => setForceOffice(true)}
            />
          )}

          {kind === 'office' && (
            <>
              <iframe
                key={`${doc._id}-${attempt}`}
                title={doc.name}
                src={`${OFFICE_EMBED}${encodeURIComponent(fileUrl)}`}
                onLoad={markReady}
                className="absolute inset-0 h-full w-full bg-white"
              />
              {phase === 'ready' && (
                <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-night-900/85 py-1.5 text-center text-[11px] text-white/60 backdrop-blur">
                  Previewed with the Microsoft Office viewer · formatting may differ from the original
                </p>
              )}
            </>
          )}

          {phase === 'loading' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-night-900/75 p-4 backdrop-blur-md animate-fade-in">
              <div className="w-72 rounded-3xl bg-white/[0.07] p-6 text-center shadow-modal ring-1 ring-white/15 backdrop-blur-xl animate-scale-in">
                <div className="mx-auto mb-4 w-fit animate-float">
                  <FileBadge type={doc.fileType} size="lg" />
                </div>
                <p className="font-serif text-lg">Opening document</p>
                <p className="mt-0.5 truncate text-xs text-white/55">{doc.name}</p>
                <div className="relative mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  {progress > 0 && progress < 100 ? (
                    <div className="h-full rounded-full bg-gradient-to-r from-vault-glow to-aqua transition-all duration-300" style={{ width: `${progress}%` }} />
                  ) : (
                    <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-vault-glow animate-indeterminate" />
                  )}
                </div>
                <p className="mt-2.5 text-[11px] font-medium tabular-nums text-white/45">
                  {progress >= 100 ? 'Rendering…' : progress > 0 ? `Downloading · ${progress}%` : 'Connecting…'}
                </p>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-night-900/80 p-4 backdrop-blur-md animate-fade-in">
              <div className="w-full max-w-sm rounded-3xl bg-white/[0.07] p-6 text-center shadow-modal ring-1 ring-white/15 backdrop-blur-xl animate-scale-in">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rust/15 text-rose-300">
                  <Icon name="alert" className="h-6 w-6" />
                </div>
                <p className="font-serif text-lg">Couldn't open this document</p>
                <p className="mt-1 text-sm text-white/60">{errMsg}</p>
                <div className="mt-5 flex justify-center gap-2">
                  <button onClick={() => setAttempt((a) => a + 1)} className="vbtn bg-white/10">
                    <Icon name="refresh" className="h-4 w-4" />
                    Try again
                  </button>
                  <a href={sharedDocumentDownloadUrl(token, doc._id)} className="vbtn-primary">
                    <Icon name="download" className="h-4 w-4" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ------------------------------ filmstrip --------------------------- */}
      {hasSiblings && strip && (
        <nav className="hidden shrink-0 border-t border-white/10 bg-night-900/95 md:block animate-slide-up" aria-label="Documents in this folder">
          <div ref={stripRef} className="no-scrollbar flex gap-2 overflow-x-auto px-5 py-3">
            {docs.map((d) => {
              const active = d._id === id;
              return (
                <Link
                  key={d._id}
                  to={`${folderPath}/view/${d._id}`}
                  aria-current={active ? 'true' : undefined}
                  title={d.name}
                  className={`flex w-52 shrink-0 items-center gap-2.5 rounded-xl p-2 text-left transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-vault-glow/40 ${
                    active ? 'bg-vault/25 ring-1 ring-vault-glow/60' : 'bg-white/[0.05] ring-1 ring-white/10 hover:bg-white/10'
                  }`}
                >
                  <FileBadge type={d.fileType} size="sm" />
                  <span className="min-w-0">
                    <span className={`block truncate text-xs font-semibold ${active ? 'text-white' : 'text-white/75'}`}>{d.name}</span>
                    <span className="block text-[10px] text-white/45">{formatBytes(d.fileSize)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {help && <ShortcutsModal kind={kind} hasSiblings={hasSiblings} onClose={() => setHelp(false)} />}
    </div>
  );
}
