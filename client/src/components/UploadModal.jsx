import React, { useCallback, useRef, useState } from 'react';
import { uploadDocument } from '../services/documentService';
import { useToast } from '../context/ToastContext';

const ACCEPTED = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png';

export default function UploadModal({ open, onClose, folderId, onUploaded }) {
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState([]); // [{file, progress, status}]
  const inputRef = useRef(null);
  const { showToast } = useToast();

  // All hooks must run on every render regardless of `open`, so this callback
  // (and every other hook) stays above the `if (!open) return null;` below.
  // addFiles/runUpload are only invoked later, from event handlers, by which
  // point they're fully defined - referencing them here before their own
  // declarations is safe.
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  if (!open) return null;

  const addFiles = (fileList) => {
    const files = Array.from(fileList).map((file) => ({ file, progress: 0, status: 'pending' }));
    setQueue((prev) => [...prev, ...files]);
    files.forEach((entry) => runUpload(entry));
  };

  const runUpload = async (entry) => {
    setQueue((prev) => prev.map((q) => (q === entry ? { ...q, status: 'uploading' } : q)));
    try {
      await uploadDocument(entry.file, folderId, (pct) => {
        setQueue((prev) => prev.map((q) => (q === entry ? { ...q, progress: pct } : q)));
      });
      setQueue((prev) => prev.map((q) => (q === entry ? { ...q, status: 'done', progress: 100 } : q)));
      onUploaded?.();
    } catch (err) {
      setQueue((prev) => prev.map((q) => (q === entry ? { ...q, status: 'error' } : q)));
      showToast(err.response?.data?.message || `Failed to upload ${entry.file.name}`, 'error');
    }
  };

  const handleClose = () => {
    setQueue([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg text-ink">Upload documents</h3>
          <button onClick={handleClose} className="text-slate hover:text-ink text-sm">
            Close
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-md py-10 px-4 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-vault bg-vault-light' : 'border-ink/15 hover:border-vault/50'
          }`}
        >
          <p className="text-sm font-medium text-ink mb-1">Drag files here, or click to browse</p>
          <p className="text-xs text-slate">PDF, DOC(X), XLS(X), PPT(X), JPG, PNG — up to 25MB each</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            className="hidden"
            onChange={(e) => e.target.files?.length && addFiles(e.target.files)}
          />
        </div>

        {queue.length > 0 && (
          <div className="mt-4 max-h-52 overflow-y-auto space-y-2">
            {queue.map((q, i) => (
              <div key={i} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="truncate text-ink">{q.file.name}</span>
                  <span
                    className={`text-xs ml-2 shrink-0 ${
                      q.status === 'error' ? 'text-rust' : q.status === 'done' ? 'text-vault-dark' : 'text-slate'
                    }`}
                  >
                    {q.status === 'error' ? 'Failed' : q.status === 'done' ? 'Done' : `${q.progress}%`}
                  </span>
                </div>
                <div className="h-1 w-full bg-paper rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${q.status === 'error' ? 'bg-rust' : 'bg-vault'}`}
                    style={{ width: `${q.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
