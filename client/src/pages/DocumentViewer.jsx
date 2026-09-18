import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getDocument, viewDocument, downloadDocument } from '../services/documentService';
import { formatBytes, formatDate } from '../utils/format';
import { useToast } from '../context/ToastContext';

const IMAGE_TYPES = new Set(['jpg', 'jpeg', 'png']);

export default function DocumentViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [doc, setDoc] = useState(null);
  const [url, setUrl] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [docRes, viewRes] = await Promise.all([getDocument(id), viewDocument(id)]);
        setDoc(docRes.document);
        setUrl(viewRes.url);
      } catch {
        showToast('Could not load document', 'error');
        navigate('/documents');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!doc) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-vault border-t-transparent animate-spin" />
      </div>
    );
  }

  const isImage = IMAGE_TYPES.has(doc.fileType);
  const isPdf = doc.fileType === 'pdf';

  return (
    <div className="px-6 md:px-10 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-xs font-medium text-slate hover:text-vault-dark mb-1">
            ← Back
          </button>
          <h1 className="font-serif text-xl text-ink truncate max-w-lg">{doc.name}</h1>
          <p className="text-xs text-slate mt-1">
            {formatBytes(doc.fileSize)} · Uploaded {formatDate(doc.createdAt)}
          </p>
        </div>
        <button
          onClick={() => downloadDocument(doc._id, doc.name)}
          className="bg-vault text-white text-sm font-medium rounded-md px-4 py-2.5 hover:bg-vault-dark transition-colors"
        >
          Download
        </button>
      </div>

      <div className="bg-white rounded-lg border border-ink/8 overflow-hidden min-h-[60vh] flex items-center justify-center">
        {isImage ? (
          <img src={url} alt={doc.name} className="max-w-full max-h-[75vh] object-contain" />
        ) : isPdf ? (
          <iframe title={doc.name} src={url} className="w-full h-[75vh]" />
        ) : (
          <div className="text-center py-20 px-6">
            <p className="text-sm text-slate mb-4">
              Preview isn't available for this file type. Download it to view it locally.
            </p>
            <button
              onClick={() => downloadDocument(doc._id, doc.name)}
              className="bg-vault text-white text-sm font-medium rounded-md px-4 py-2.5 hover:bg-vault-dark"
            >
              Download {doc.name}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
