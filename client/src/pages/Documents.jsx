import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { listDocuments, downloadDocument, deleteDocument, updateDocument } from '../services/documentService';
import { listFolders, getFolder, createFolder, updateFolder, deleteFolder } from '../services/folderService';
import DocumentRow from '../components/DocumentRow';
import FolderCard from '../components/FolderCard';
import UploadModal from '../components/UploadModal';
import NewFolderModal from '../components/NewFolderModal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
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
      }
    } catch (err) {
      showToast('Could not load documents', 'error');
    }
  };

  useEffect(() => {
    load();
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

  const confirmDelete = async () => {
    try {
      if (confirm.type === 'document') {
        await deleteDocument(confirm.target._id);
        showToast('Document deleted');
      } else {
        await deleteFolder(confirm.target._id);
        showToast('Folder deleted');
      }
      setConfirm({ open: false, type: null, target: null });
      load();
    } catch {
      showToast('Delete failed', 'error');
      setConfirm({ open: false, type: null, target: null });
    }
  };

  const handleRenameFolder = (f) => setFolderModal({ open: true, mode: 'rename', target: f });
  const handleCreateFolder = () => setFolderModal({ open: true, mode: 'create', target: null });

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
    <div className="px-6 md:px-10 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate('/documents')}
            className="text-xs font-medium text-slate hover:text-vault-dark"
          >
            Documents
          </button>
          {folder && (
            <>
              <span className="text-xs text-slate mx-1">/</span>
              <span className="text-xs font-medium text-ink">{folder.name}</span>
            </>
          )}
          <h1 className="font-serif text-2xl text-ink mt-1">{folder ? folder.name : 'All documents'}</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCreateFolder}
            className="bg-white border border-ink/15 text-ink text-sm font-medium rounded-md px-4 py-2.5 hover:bg-paper transition-colors"
          >
            New folder
          </button>
          <button
            onClick={() => setUploadOpen(true)}
            className="bg-vault text-white text-sm font-medium rounded-md px-4 py-2.5 hover:bg-vault-dark transition-colors"
          >
            Upload
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents…"
          className="flex-1 min-w-[200px] border border-ink/15 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vault/40"
        />
        <select
          value={fileType}
          onChange={(e) => setFileType(e.target.value)}
          className="border border-ink/15 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vault/40"
        >
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
          className="border border-ink/15 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-vault/40"
        >
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
          <option value="name-asc">Name A–Z</option>
          <option value="name-desc">Name Z–A</option>
          <option value="fileSize-desc">Largest first</option>
          <option value="fileSize-asc">Smallest first</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-ink/8 overflow-hidden">
        {isEmpty ? (
          <EmptyState
            title="Nothing here yet"
            message="Upload a document or create a folder to get started."
          />
        ) : (
          <>
            {folders.map((f) => (
              <FolderCard
                key={f._id}
                folder={f}
                onOpen={(fl) => navigate(`/documents/folder/${fl._id}`)}
                onRename={handleRenameFolder}
                onDelete={handleDeleteFolder}
              />
            ))}
            {filteredDocsInFolder.map((doc) =>
              renaming?.id === doc._id ? (
                <div key={doc._id} className="flex items-center gap-3 px-4 py-3 border-b border-ink/8">
                  <input
                    autoFocus
                    value={renaming.name}
                    onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && submitRename()}
                    className="flex-1 border border-ink/15 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-vault/40"
                  />
                  <button onClick={submitRename} className="text-xs font-medium text-vault-dark">
                    Save
                  </button>
                  <button onClick={() => setRenaming(null)} className="text-xs font-medium text-slate">
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
                />
              )
            )}
          </>
        )}
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        folderId={folderId || null}
        onUploaded={load}
      />
      <NewFolderModal
        open={folderModal.open}
        title={folderModal.mode === 'create' ? 'New folder' : 'Rename folder'}
        initialName={folderModal.mode === 'rename' ? folderModal.target?.name : ''}
        onClose={() => setFolderModal({ open: false, mode: 'create', target: null })}
        onCreate={submitFolderModal}
      />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.type === 'folder' ? 'Delete folder?' : 'Delete document?'}
        message={
          confirm.type === 'folder'
            ? 'This will permanently delete the folder and everything inside it.'
            : 'This will permanently delete the document.'
        }
        onCancel={() => setConfirm({ open: false, type: null, target: null })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
