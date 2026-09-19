import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { uploadDocument } from '../services/documentService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatBytes } from '../utils/format';
import Icon from './Icon';
import FileBadge from './FileBadge';

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png';
const MAX_SIZE = 25 * 1024 * 1024;

let nextId = 1;
const extOf = (name) => (name.split('.').pop() || '').toLowerCase();

export default function UploadModal({ open, onClose, folderId, onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  // [{ id, file, progress, status: 'uploading' | 'done' | 'error', error? }]
  const [queue, setQueue] = useState([]);
  const inputRef = useRef(null);
  const { showToast } = useToast();
  const { refreshUser } = useAuth();

  // Keep the latest callbacks in refs so long-running uploads never call stale versions.
  const onUploadedRef = useRef(onUploaded);
  const onCloseRef = useRef(onClose);
  onUploadedRef.current = onUploaded;
  onCloseRef.current = onClose;

  // Update one queue entry by id. (Matching by object identity was the original bug:
  // the first state update replaced the object, so later progress/done updates
  // never found their entry and the bar stayed at 0% forever.)
  const patch = (id, changes) =>
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...changes } : q)));

  const runUpload = async (id, file) => {
    patch(id, { status: 'uploading', progress: 0, error: null });
    try {
      await uploadDocument(file, folderId, (pct) => patch(id, { progress: pct }));
      patch(id, { status: 'done', progress: 100 });
      onUploadedRef.current?.();
      refreshUser?.().catch(() => {});
    } catch (err) {
      const message = err.response?.data?.message || err.message || `Failed to upload ${file.name}`;
      patch(id, { status: 'error', error: message });
      showToast(message, 'error');
    }
  };

  const addFiles = (fileList) => {
    const entries = [];
    Array.from(fileList).forEach((file) => {
      const id = nextId++;
      if (file.size > MAX_SIZE) {
        entries.push({ id, file, progress: 0, status: 'error', error: 'File is larger than 25MB' });
      } else {
        entries.push({ id, file, progress: 0, status: 'uploading' });
      }
    });
    setQueue((prev) => [...prev, ...entries]);
    entries.filter((e) => e.status === 'uploading').forEach((e) => runUpload(e.id, e.file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleClose = () => {
    setQueue([]);
    setDragOver(false);
    onCloseRef.current?.();
  };

  const retry = (entry) => runUpload(entry.id, entry.file);

  // Close automatically shortly after every file has finished successfully.
  useEffect(() => {
    if (!open || queue.length === 0) return undefined;
    if (queue.every((q) => q.status === 'done')) {
      const t = setTimeout(() => {
        setQueue([]);
        onCloseRef.current?.();
      }, 1100);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [queue, open]);

  // Escape closes the dialog
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && handleClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const busy = queue.some((q) => q.status === 'uploading');
  const allDone = queue.length > 0 && queue.every((q) => q.status === 'done');

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="modal max-w-lg overflow-hidden">
        <div className="relative bg-night-900 px-7 pt-6 pb-8 text-white">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-vault opacity-30 blur-3xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <h3 className="font-serif text-2xl">Upload documents</h3>
              <p className="mt-1 text-sm text-white/60">Drop files in and they're safely stored in seconds.</p>
            </div>
            <button
              onClick={handleClose}
              className="-mr-2 -mt-1 inline-flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <Icon name="x" />
            </button>
          </div>
        </div>

        <div className="-mt-4 rounded-t-3xl bg-surface px-7 pb-7 pt-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`group cursor-pointer rounded-2xl border-2 border-dashed px-4 py-9 text-center transition-all ${
              dragOver
                ? 'scale-[1.01] border-vault bg-vault-light'
                : 'border-ink/15 bg-paper/60 hover:border-vault/60 hover:bg-vault-light/60'
            }`}
          >
            <div
              className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-vault text-white shadow-glow transition-transform ${
                dragOver ? '-translate-y-1' : 'group-hover:-translate-y-1'
              }`}
            >
              <Icon name="upload" className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-ink">Drag files here, or click to browse</p>
            <p className="mt-1 text-xs text-slate">PDF, DOC(X), XLS(X), PPT(X), JPG, PNG — up to 25MB each</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = ''; // allow re-selecting the same file
              }}
            />
          </div>

          {queue.length > 0 && (
            <div className="mt-5 max-h-64 space-y-3 overflow-y-auto pr-1">
              {queue.map((q) => (
                <UploadRow key={q.id} entry={q} onRetry={() => retry(q)} />
              ))}
            </div>
          )}

          {queue.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-slate">
                {allDone ? 'All done — closing…' : busy ? 'Uploading, please keep this tab open…' : 'Finished with some errors'}
              </p>
              <button onClick={handleClose} className={allDone ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}>
                {busy ? 'Hide' : 'Done'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function UploadRow({ entry, onRetry }) {
  const { file, progress, status, error } = entry;
  const sent = status === 'uploading' && progress >= 100; // bytes sent, server still storing
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-surface p-3 shadow-sm animate-slide-up">
      <FileBadge type={extOf(file.name)} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-ink">{file.name}</span>
          <span
            className={`shrink-0 text-xs font-semibold ${
              status === 'error' ? 'text-rust' : status === 'done' ? 'text-aqua' : 'text-vault-dark'
            }`}
          >
            {status === 'error' ? 'Failed' : status === 'done' ? 'Done' : sent ? 'Finalizing…' : `${progress}%`}
          </span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
          {sent ? (
            <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-vault animate-indeterminate" />
          ) : (
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                status === 'error' ? 'bg-rust' : status === 'done' ? 'bg-aqua' : 'bg-vault'
              }`}
              style={{ width: `${status === 'error' ? 100 : progress}%` }}
            />
          )}
        </div>
        <p className="mt-1 text-[11px] text-slate">
          {status === 'error' ? error : formatBytes(file.size)}
        </p>
      </div>
      {status === 'done' && (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aqua text-white animate-pop">
          <Icon name="check" className="h-4 w-4" strokeWidth={2.6} />
        </span>
      )}
      {status === 'error' && file.size <= MAX_SIZE && (
        <button onClick={onRetry} className="icon-btn shrink-0" title="Retry" aria-label="Retry upload">
          <Icon name="refresh" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
