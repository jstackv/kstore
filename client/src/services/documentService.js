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
