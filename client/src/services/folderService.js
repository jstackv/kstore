import api from './api';

export const listFolders = (parentFolderId) =>
  api.get('/folders', { params: { parentFolderId: parentFolderId || null } }).then((r) => r.data);

export const getFolder = (id) => api.get(`/folders/${id}`).then((r) => r.data);
export const createFolder = (name, parentFolderId) =>
  api.post('/folders', { name, parentFolderId }).then((r) => r.data);
export const updateFolder = (id, name) => api.put(`/folders/${id}`, { name }).then((r) => r.data);
export const deleteFolder = (id) => api.delete(`/folders/${id}`).then((r) => r.data);
