import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSharedFolder, sharedDocumentDownloadUrl, sharedDocumentViewUrl } from '../services/publicService';
import { formatBytes, formatDate, formatRelative, typeMeta } from '../utils/format';
import { copyText } from '../utils/clipboard';
import { useToast } from '../context/ToastContext';
import Icon from '../components/Icon';
import FileBadge from '../components/FileBadge';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import FileTile from '../components/share/FileTile';
import SharePanel from '../components/share/SharePanel';

const VIEW_KEY = 'kstore_share_view';
const SORTS = [
  { key: 'new', label: 'Newest first', fn: (a, b) => new Date(b.createdAt) - new Date(a.createdAt) },
  { key: 'old', label: 'Oldest first', fn: (a, b) => new Date(a.createdAt) - new Date(b.createdAt) },
  { key: 'name', label: 'Name A–Z', fn: (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }) },
  { key: 'size', label: 'Largest first', fn: (a, b) => b.fileSize - a.fileSize },
];

const initials = (name) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export default function PublicFolder() {
  const { token } = useParams();
  const { showToast } = useToast();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [folder, setFolder] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [sort, setSort] = useState('new');
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });
  const [shareOpen, setShareOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
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

  useEffect(() => {
    document.title = folder ? `${folder.name} · Shared on KStore` : 'Shared folder · KStore';
  }, [folder]);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  // "/" jumps to search, like most modern apps
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const totalSize = useMemo(() => documents.reduce((n, d) => n + (d.fileSize || 0), 0), [documents]);

  const groups = useMemo(() => {
    const map = new Map();
    documents.forEach((d) => {
      const m = typeMeta(d.fileType);
      map.set(m.group, { key: m.group, label: m.groupLabel, count: (map.get(m.group)?.count || 0) + 1 });
    });
    return [{ key: 'all', label: 'All', count: documents.length }, ...map.values()];
  }, [documents]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorter = SORTS.find((s) => s.key === sort).fn;
    return documents
      .filter((d) => (group === 'all' || typeMeta(d.fileType).group === group) && (!q || d.name.toLowerCase().includes(q)))
      .sort(sorter);
  }, [documents, query, group, sort]);

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/share/${token}` : '';
  const viewPath = (doc) => `/share/${token}/view/${doc._id}`;

  const copyDocLink = async (doc) => {
    const ok = await copyText(`${window.location.origin}${viewPath(doc)}`);
    showToast(ok ? 'Link to this document copied' : "Couldn't copy the link", ok ? 'success' : 'error');
  };

  // ---------------------------------------------------------------- states
  if (state === 'error') {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-night-900 px-4 text-white">
        <div className="aurora -left-24 -top-24 h-96 w-96 bg-vault" />
        <div className="aurora -bottom-32 -right-24 h-96 w-96 bg-vault-glow" style={{ animationDelay: '-9s' }} />
        <div className="relative w-full max-w-md rounded-3xl bg-white/[0.06] p-10 text-center shadow-modal ring-1 ring-white/15 backdrop-blur-xl animate-scale-in">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rust/15 text-rose-300 ring-1 ring-rose-300/20">
            <Icon name="link" className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-2xl">This link isn't working</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/60">
            It may have been turned off by the person who shared it, or the folder no longer exists. Ask them for a fresh link.
          </p>
          <div className="mt-7 flex justify-center">
            <Logo size="sm" />
          </div>
        </div>
      </div>
    );
  }

  const ready = state === 'ready';

  return (
    <div className="min-h-screen bg-paper">
      {/* ============================ HERO ============================ */}
      <section className="relative isolate overflow-hidden bg-night-900 text-white">
        <div className="aurora -left-20 -top-32 h-[26rem] w-[26rem] bg-vault" />
        <div className="aurora -right-16 top-10 h-[22rem] w-[22rem] bg-vault-glow" style={{ animationDelay: '-7s', opacity: 0.4 }} />
        <div className="aurora bottom-[-8rem] left-1/3 h-72 w-72 bg-aqua" style={{ animationDelay: '-13s', opacity: 0.25 }} />
        <div className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />

        <nav className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 md:px-8">
          <Link to="/" aria-label="KStore home">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1.5">
            {ready && (
              <button onClick={() => setShareOpen(true)} className="vbtn bg-white/10 px-3.5 text-white ring-1 ring-white/10 hover:bg-white/20">
                <Icon name="qr" className="h-4 w-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
            <ThemeToggle variant="dark" />
          </div>
        </nav>

        <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-8 md:px-8 md:pb-32 md:pt-12">
          {!ready ? (
            <div className="space-y-4">
              <div className="h-6 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="h-14 w-2/3 max-w-lg animate-pulse rounded-2xl bg-white/10" />
              <div className="h-5 w-64 animate-pulse rounded-full bg-white/10" />
            </div>
          ) : (
            <div className="max-w-3xl animate-slide-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 ring-1 ring-white/15 backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aqua opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-aqua" />
                </span>
                Shared folder
              </span>

              <h1 className="mt-4 break-words bg-gradient-to-br from-white via-white to-vault-glow bg-clip-text font-serif text-4xl font-extrabold leading-[1.08] text-transparent md:text-6xl">
                {folder.name}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-white/70">
                {folder.sharedBy && (
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-vault-glow to-vault text-[11px] font-bold text-white ring-2 ring-white/20">
                      {initials(folder.sharedBy)}
                    </span>
                    <span>
                      Shared by <strong className="font-semibold text-white">{folder.sharedBy}</strong>
                    </span>
                  </span>
                )}
                {folder.createdAt && (
                  <span className="flex items-center gap-1.5">
                    <Icon name="cloud" className="h-4 w-4 text-white/45" />
                    Created {formatRelative(folder.createdAt)}
                  </span>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2.5">
                {[
                  { icon: 'files', text: `${documents.length} document${documents.length === 1 ? '' : 's'}` },
                  { icon: 'cloud', text: formatBytes(totalSize) },
                  { icon: 'shield', text: 'Secure link' },
                ].map((s) => (
                  <span
                    key={s.text}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white/85 ring-1 ring-white/10 backdrop-blur"
                  >
                    <Icon name={s.icon} className="h-4 w-4 text-vault-glow" />
                    {s.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* floating cards built from the folder's real documents */}
          {ready && documents.length > 0 && (
            <div className="pointer-events-none absolute right-8 top-1/2 hidden w-64 -translate-y-1/2 xl:block">
              {documents.slice(0, 3).map((d, i) => (
                <div
                  key={d._id}
                  style={{ '--r': ['5deg', '-4deg', '3deg'][i], top: `${(i - 1) * 5.4 - 1}rem`, animationDelay: `${i * 1.3}s` }}
                  className="absolute right-0 w-60 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur-md animate-float"
                >
                  <div className="flex items-center gap-3">
                    <FileBadge type={d.fileType} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">{d.name}</p>
                      <p className="text-[11px] text-white/50">{formatBytes(d.fileSize)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============================ BODY ============================ */}
      <main className="relative mx-auto -mt-16 max-w-6xl px-4 pb-16 md:px-8">
        {/* toolbar */}
        <div className="glass z-30 md:sticky md:top-3 flex flex-wrap items-center gap-2.5 rounded-2xl p-2.5">
          <label className="relative min-w-[11rem] flex-1 md:max-w-xs md:flex-none">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
              placeholder="Search documents"
              aria-label="Search documents"
              className="input !rounded-xl !py-2 pl-9 pr-9"
            />
            {query ? (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate hover:bg-ink/5 hover:text-ink"
                aria-label="Clear search"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="kbd-hint pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 md:inline-flex">/</span>
            )}
          </label>

          <div className="no-scrollbar order-last flex w-full items-center gap-2 overflow-x-auto md:order-none md:w-auto md:flex-1" role="tablist" aria-label="Filter by type">
            {ready &&
              groups.length > 2 &&
              groups.map((g) => (
                <button
                  key={g.key}
                  role="tab"
                  aria-selected={group === g.key}
                  onClick={() => setGroup(g.key)}
                  className={`chip ${group === g.key ? 'chip-on' : 'bg-surface/60'}`}
                >
                  {g.label}
                  <span className={`rounded-full px-1.5 text-[10px] ${group === g.key ? 'bg-white/25' : 'bg-ink/5'}`}>{g.count}</span>
                </button>
              ))}
          </div>

          <div className="relative">
            <Icon name="sort" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort documents"
              className="select !w-auto !rounded-xl !py-2 pl-9 text-xs font-semibold"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex rounded-xl bg-ink/[0.05] p-1" role="group" aria-label="Layout">
            {[
              ['grid', 'Grid view'],
              ['list', 'List view'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                aria-label={label}
                aria-pressed={view === key}
                title={label}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  view === key ? 'bg-surface text-vault shadow-sm' : 'text-slate hover:text-ink'
                }`}
              >
                <Icon name={key} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        {/* results */}
        <div className="mt-6">
          {!ready && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-ink/10">
                  <div className="skeleton h-44 !rounded-none" />
                  <div className="space-y-2 p-4">
                    <div className="skeleton h-4 w-4/5" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {ready && documents.length === 0 && (
            <div className="card p-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-vault-light text-vault">
                <Icon name="folder" className="h-7 w-7" />
              </div>
              <h2 className="font-serif text-xl text-ink">This folder is empty</h2>
              <p className="mt-1 text-sm text-slate">Documents added to it will show up here automatically.</p>
            </div>
          )}

          {ready && documents.length > 0 && visible.length === 0 && (
            <div className="card p-14 text-center animate-fade-in">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-vault-light text-vault">
                <Icon name="search" className="h-7 w-7" />
              </div>
              <h2 className="font-serif text-xl text-ink">Nothing matches</h2>
              <p className="mt-1 text-sm text-slate">Try a different search or file type.</p>
              <button
                onClick={() => {
                  setQuery('');
                  setGroup('all');
                }}
                className="btn-soft mt-5"
              >
                Clear filters
              </button>
            </div>
          )}

          {ready && visible.length > 0 && view === 'grid' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((doc, i) => (
                <article
                  key={doc._id}
                  className="group rise relative overflow-hidden rounded-2xl bg-surface shadow-card ring-1 ring-ink/10 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift hover:ring-vault/30"
                  style={{ animationDelay: `${Math.min(i, 12) * 45}ms` }}
                >
                  <Link
                    to={viewPath(doc)}
                    aria-label={`Open ${doc.name}`}
                    className="block rounded-2xl focus:outline-none focus-visible:ring-4 focus-visible:ring-vault/30"
                  >
                    <FileTile doc={doc} src={sharedDocumentViewUrl(token, doc._id)} className="h-44" />
                    <div className="p-4">
                      <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-ink" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">
                        <span className="rounded-md bg-ink/[0.06] px-1.5 py-0.5 font-bold uppercase tracking-wide text-ink/70">{doc.fileType}</span>
                        <span>{formatBytes(doc.fileSize)}</span>
                        <span className="text-ink/25">•</span>
                        <span>{formatRelative(doc.createdAt)}</span>
                      </p>
                    </div>
                  </Link>

                  <div className="absolute right-3 top-3 flex translate-y-0 gap-1.5 opacity-100 transition-all duration-200 sm:translate-y-1 sm:opacity-0 sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() => copyDocLink(doc)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-night-900/60 text-white backdrop-blur-md transition hover:bg-night-900/85"
                      title="Copy link to this document"
                      aria-label="Copy link to this document"
                    >
                      <Icon name="link" className="h-4 w-4" />
                    </button>
                    <a
                      href={sharedDocumentDownloadUrl(token, doc._id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-night-900/60 text-white backdrop-blur-md transition hover:bg-vault"
                      title="Download"
                      aria-label={`Download ${doc.name}`}
                    >
                      <Icon name="download" className="h-4 w-4" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          {ready && visible.length > 0 && view === 'list' && (
            <div className="card divide-y divide-ink/5 overflow-hidden">
              {visible.map((doc, i) => (
                <div
                  key={doc._id}
                  className="group rise flex items-center gap-3 p-3 pr-3 transition-colors hover:bg-vault-light/50 md:gap-4 md:pr-4"
                  style={{ animationDelay: `${Math.min(i, 14) * 35}ms` }}
                >
                  <Link to={viewPath(doc)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-vault/25 md:gap-4">
                    <FileBadge type={doc.fileType} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink" title={doc.name}>
                        {doc.name}
                      </p>
                      <p className="text-xs text-slate">
                        {typeMeta(doc.fileType).label} · {formatBytes(doc.fileSize)}
                        <span className="hidden sm:inline"> · {formatDate(doc.createdAt)}</span>
                      </p>
                    </div>
                  </Link>
                  <Link to={viewPath(doc)} className="btn-soft btn-sm hidden shrink-0 sm:inline-flex">
                    <Icon name="eye" className="h-4 w-4" />
                    View
                  </Link>
                  <button onClick={() => copyDocLink(doc)} className="icon-btn hidden shrink-0 md:inline-flex" title="Copy link to this document" aria-label="Copy link to this document">
                    <Icon name="link" className="h-4 w-4" />
                  </button>
                  <a href={sharedDocumentDownloadUrl(token, doc._id)} className="icon-btn shrink-0" title="Download" aria-label={`Download ${doc.name}`}>
                    <Icon name="download" className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          )}

          {ready && visible.length > 0 && (
            <p className="mt-5 text-center text-xs text-slate">
              Showing {visible.length} of {documents.length} document{documents.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <footer className="mt-14 flex flex-col items-center gap-3 border-t border-ink/10 pt-8 text-center">
          <Logo dark={false} size="sm" />
          <p className="max-w-sm text-xs leading-relaxed text-slate">
            Shared securely with KStore. Anyone with this link can view and download these documents until the owner turns the link off.
          </p>
        </footer>
      </main>

      {shareOpen && <SharePanel url={shareUrl} title={folder?.name || 'Shared folder'} onClose={() => setShareOpen(false)} />}
    </div>
  );
}
