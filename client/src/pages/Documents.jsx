import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listDocuments, warmDocument, downloadDocument, deleteDocument, updateDocument } from '../services/documentService';
import { listFolders, getFolder, createFolder, updateFolder, deleteFolder, createShareLink } from '../services/folderService';
import DocumentRow from '../components/DocumentRow';
import DocumentGridCard from '../components/DocumentGridCard';
import FolderCard from '../components/FolderCard';
import UploadModal from '../components/UploadModal';
import NewFolderModal from '../components/NewFolderModal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import { useToast } from '../context/ToastContext';

const FILE_TYPES = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'png'];

export default function Documents() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [folder, setFolder] = useState(null); // current folder, null at root
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');

  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderModal, setFolderModal] = useState({ open: false, mode: 'create', target: null });
  const [confirm, setConfirm] = useState({ open: false, type: null, target: null });
  const [renaming, setRenaming] = useState(null); // document being renamed inline
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(() => localStorage.getItem('kstore_doc_view') || 'list');
  const [selected, setSelected] = useState(() => new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleView = (next) => {
    setView(next);
    localStorage.setItem('kstore_doc_view', next);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const load = async () => {
    try {
      if (folderId) {
        const res = await getFolder(folderId);
        setFolder(res.folder);
        setFolders(res.subfolders);
        setDocuments(res.documents);
      } else {
        setFolder(null);
        const [foldersRes, docsRes] = await Promise.all([
          listFolders(null),
          listDocuments({ folderId: 'null', search, fileType, sortBy, order }),
        ]);
        setFolders(foldersRes.folders);
        setDocuments(docsRes.documents);
        docsRes.documents.slice(0, 3).forEach((d) => warmDocument(d._id)); // pre-cache the newest few
      }
    } catch (err) {
      showToast('Could not load documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    clearSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  useEffect(() => {
    if (!folderId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, fileType, sortBy, order]);

  const filteredDocsInFolder = useMemo(() => {
    if (!folderId) return documents;
    let list = documents;
    if (search) list = list.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
    if (fileType) list = list.filter((d) => d.fileType === fileType);
    return list;
  }, [documents, folderId, search, fileType]);

  const handleOpenDoc = (doc) => navigate(`/documents/view/${doc._id}`);

  const handleDownload = async (doc) => {
    try {
      await downloadDocument(doc._id, doc.name);
    } catch {
      showToast('Download failed', 'error');
    }
  };

  const handleRename = (doc) => setRenaming({ id: doc._id, name: doc.name });

  const submitRename = async () => {
    try {
      await updateDocument(renaming.id, { name: renaming.name });
      setRenaming(null);
      load();
    } catch {
      showToast('Rename failed', 'error');
    }
  };

  const handleDeleteDoc = (doc) => setConfirm({ open: true, type: 'document', target: doc });
  const handleDeleteFolder = (f) => setConfirm({ open: true, type: 'folder', target: f });
  const handleBulkDelete = () => setConfirm({ open: true, type: 'bulk', target: null });

  const confirmDelete = async () => {
    try {
      if (confirm.type === 'document') {
        await deleteDocument(confirm.target._id);
        showToast('Document deleted');
      } else if (confirm.type === 'bulk') {
        setBulkDeleting(true);
        const ids = Array.from(selected);
        await Promise.all(ids.map((id) => deleteDocument(id)));
        showToast(`${ids.length} document${ids.length === 1 ? '' : 's'} deleted`);
        clearSelection();
      } else {
        await deleteFolder(confirm.target._id);
        showToast('Folder deleted');
      }
      setConfirm({ open: false, type: null, target: null });
      load();
    } catch {
      showToast('Delete failed', 'error');
      setConfirm({ open: false, type: null, target: null });
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleRenameFolder = (f) => setFolderModal({ open: true, mode: 'rename', target: f });
  const handleCreateFolder = () => setFolderModal({ open: true, mode: 'create', target: null });

  const handleShareFolder = async (f) => {
    try {
      const res = await createShareLink(f._id);
      const url = `${window.location.origin}/share/${res.shareToken}`;
      await navigator.clipboard.writeText(url);
      showToast('Link copied — anyone with it can view this folder without signing in');
      load();
    } catch {
      showToast('Could not create share link', 'error');
    }
  };

  const submitFolderModal = async (name) => {
    try {
      if (folderModal.mode === 'create') {
        await createFolder(name, folderId || null);
        showToast('Folder created');
      } else {
        await updateFolder(folderModal.target._id, name);
        showToast('Folder renamed');
      }
      setFolderModal({ open: false, mode: 'create', target: null });
      load();
    } catch {
      showToast('Could not save folder', 'error');
    }
  };

  const isEmpty = folders.length === 0 && filteredDocsInFolder.length === 0;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 animate-fade-in">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
            <button onClick={() => navigate('/documents')} className="text-slate transition hover:text-vault-dark">
              Documents
            </button>
            {folder && (
              <>
                <Icon name="chevron" className="h-3.5 w-3.5 text-slate/60" />
                <span className="text-ink">{folder.name}</span>
              </>
            )}
          </div>
          <h1 className="font-serif text-4xl text-ink">{folder ? folder.name : 'All documents'}</h1>
          <p className="mt-1.5 text-sm text-slate">
            {folders.length} folder{folders.length === 1 ? '' : 's'} · {filteredDocsInFolder.length} document
            {filteredDocsInFolder.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="flex gap-2">
          {folder && (
            <button onClick={() => handleShareFolder(folder)} className="btn-ghost">
              <Icon name="link" className="h-4 w-4" />
              {folder.shareToken ? 'Copy link' : 'Share'}
            </button>
          )}
          <button onClick={handleCreateFolder} className="btn-ghost">
            <Icon name="folder-plus" className="h-4 w-4" />
            New folder
          </button>
          <button onClick={() => setUploadOpen(true)} className="btn-primary">
            <Icon name="upload" className="h-4 w-4" />
            Upload
          </button>
        </div>
      </div>

      <div className="card mb-6 flex flex-wrap gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="input pl-10"
          />
        </div>
        <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="select w-auto">
          <option value="">All types</option>
          {FILE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.toUpperCase()}
            </option>
          ))}
        </select>
        <select
          value={`${sortBy}-${order}`}
          onChange={(e) => {
            const [sb, o] = e.target.value.split('-');
            setSortBy(sb);
            setOrder(o);
          }}
          className="select w-auto"
        >
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="fileSize-desc">Largest first</option>
          <option value="fileSize-asc">Smallest first</option>
        </select>
        <div className="flex items-center gap-1 rounded-xl bg-paper p-1">
          <button
            onClick={() => toggleView('list')}
            className={`icon-btn !h-8 !w-8 ${view === 'list' ? 'bg-surface text-vault-dark shadow-sm' : ''}`}
            title="List view"
            aria-label="List view"
          >
            <Icon name="list" className="h-4 w-4" />
          </button>
          <button
            onClick={() => toggleView('grid')}
            className={`icon-btn !h-8 !w-8 ${view === 'grid' ? 'bg-surface text-vault-dark shadow-sm' : ''}`}
            title="Grid view"
            aria-label="Grid view"
          >
            <Icon name="grid" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card space-y-3 p-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-14 w-full" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="card">
          <EmptyState
            title="Nothing here yet"
            message="Upload a document or create a folder to get started."
            action={
              <button onClick={() => setUploadOpen(true)} className="btn-primary">
                <Icon name="upload" className="h-4 w-4" />
                Upload a document
              </button>
            }
          />
        </div>
      ) : (
        <>
          {folders.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate">Folders</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {folders.map((f) => (
                  <FolderCard
                    key={f._id}
                    folder={f}
                    onOpen={(fl) => navigate(`/documents/folder/${fl._id}`)}
                    onRename={handleRenameFolder}
                    onDelete={handleDeleteFolder}
                    onShare={handleShareFolder}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredDocsInFolder.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate">Files</h2>
                <button
                  onClick={() =>
                    setSelected((prev) =>
                      prev.size === filteredDocsInFolder.length
                        ? new Set()
                        : new Set(filteredDocsInFolder.map((d) => d._id))
                    )
                  }
                  className="text-xs font-semibold text-slate transition hover:text-vault-dark"
                >
                  {selected.size === filteredDocsInFolder.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              {view === 'grid' ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                  {filteredDocsInFolder.map((doc) =>
                    renaming?.id === doc._id ? (
                      <div key={doc._id} className="card col-span-2 flex items-center gap-2 p-3 sm:col-span-1">
                        <input
                          autoFocus
                          value={renaming.name}
                          onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRename();
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                          className="input flex-1"
                        />
                        <button onClick={submitRename} className="btn-primary btn-sm">
                          Save
                        </button>
                      </div>
                    ) : (
                      <DocumentGridCard
                        key={doc._id}
                        document={doc}
                        onOpen={handleOpenDoc}
                        onDownload={handleDownload}
                        onRename={handleRename}
                        onDelete={handleDeleteDoc}
                        selected={selected.has(doc._id)}
                        onToggleSelect={toggleSelect}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="card overflow-hidden">
                  <div className="hidden grid-cols-[auto_1fr_90px_120px_auto] gap-4 border-b border-ink/5 bg-paper/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate md:grid">
                    <span className="w-11" />
                    <span>Name</span>
                    <span className="text-right">Size</span>
                    <span className="text-right">Uploaded</span>
                    <span className="w-[120px]" />
                  </div>
                  {filteredDocsInFolder.map((doc) =>
                    renaming?.id === doc._id ? (
                      <div key={doc._id} className="flex items-center gap-3 border-b border-ink/5 bg-vault-light/40 px-4 py-3">
                        <input
                          autoFocus
                          value={renaming.name}
                          onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') submitRename();
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                          className="input flex-1"
                        />
                        <button onClick={submitRename} className="btn-primary btn-sm">
                          Save
                        </button>
                        <button onClick={() => setRenaming(null)} className="btn-ghost btn-sm">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <DocumentRow
                        key={doc._id}
                        document={doc}
                        onOpen={handleOpenDoc}
                        onDownload={handleDownload}
                        onRename={handleRename}
                        onDelete={handleDeleteDoc}
                        selected={selected.has(doc._id)}
                        onToggleSelect={toggleSelect}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        folderId={folderId || null}
        onUploaded={load}
      />

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 md:bottom-6">
          <div className="flex items-center gap-3 rounded-2xl bg-night-900 px-5 py-3 text-white shadow-modal ring-1 ring-white/10 animate-slide-up">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-vault text-xs font-bold">
              {selected.size}
            </span>
            <span className="text-sm font-semibold">selected</span>
            <span className="mx-1 h-5 w-px bg-white/15" />
            <button onClick={clearSelection} className="text-sm font-medium text-white/60 transition hover:text-white">
              Clear
            </button>
            <button onClick={handleBulkDelete} className="btn-danger btn-sm">
              <Icon name="trash" className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}
      <NewFolderModal
        open={folderModal.open}
        title={folderModal.mode === 'create' ? 'New folder' : 'Rename folder'}
        initialName={folderModal.mode === 'rename' ? folderModal.target?.name : ''}
        onClose={() => setFolderModal({ open: false, mode: 'create', target: null })}
        onCreate={submitFolderModal}
      />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.type === 'folder' ? 'Delete folder?' : confirm.type === 'bulk' ? `Delete ${selected.size} document${selected.size === 1 ? '' : 's'}?` : 'Delete document?'}
        message={
          confirm.type === 'folder'
            ? 'This will permanently delete the folder and everything inside it.'
            : confirm.type === 'bulk'
            ? 'This will permanently delete the selected documents. This can\'t be undone.'
            : 'This will permanently delete the document.'
        }
        confirmLabel={bulkDeleting ? 'Deleting…' : 'Delete'}
        onCancel={() => setConfirm({ open: false, type: null, target: null })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
