import api from './api';

export const listDocuments = (params) => api.get('/documents', { params }).then((r) => r.data);

export const uploadDocument = (file, folderId, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);

  return api
    .post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (onProgress && evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
      },
    })
    .then((r) => r.data);
};

export const getDocument = (id) => api.get(`/documents/${id}`).then((r) => r.data);
export const viewDocument = (id) => api.get(`/documents/${id}/view`).then((r) => r.data);

// Fetch the raw file (authenticated) as a Blob so it can be shown inline without downloading.
export const fetchDocumentFile = (id, onProgress) =>
  api
    .get(`/documents/${id}/file`, {
      responseType: 'blob',
      onDownloadProgress: (evt) => onProgress?.(evt.loaded),
    })
    .then((r) => r.data);

// Blob error bodies are JSON hidden inside a Blob - pull out the message if we can.
export const blobErrorMessage = async (err) => {
  try {
    const data = err.response?.data;
    if (data instanceof Blob) return JSON.parse(await data.text()).message;
  } catch {
    /* ignore */
  }
  return err.response?.data?.message || err.message || 'Could not load document';
};

export const updateDocument = (id, payload) => api.put(`/documents/${id}`, payload).then((r) => r.data);
export const deleteDocument = (id) => api.delete(`/documents/${id}`).then((r) => r.data);

export const downloadDocument = async (id, filename) => {
  const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Ask the server to cache a file in the background so opening it is instant.
const warmed = new Set();
export const warmDocument = (id) => {
  if (warmed.has(id)) return;
  warmed.add(id);
  api.post(`/documents/${id}/warm`).catch(() => warmed.delete(id));
};
