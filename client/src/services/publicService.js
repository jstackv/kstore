import axios from 'axios';
import { API_ROOT } from './api';

// Separate from the main `api` instance deliberately: these calls hit
// unauthenticated public routes, so there's no cookie/token to send, and no
// reason to risk ever attaching one.
const publicApi = axios.create({ baseURL: `${API_ROOT}/api/public` });

export const getSharedFolder = (token) => publicApi.get(`/folders/${token}`).then((r) => r.data);

// Used directly as an <img>/<iframe> src or a download link's href, not
// fetched through axios - so these just build the URL.
export const sharedDocumentViewUrl = (token, id) => `${API_ROOT}/api/public/documents/${token}/${id}/file`;
export const sharedDocumentDownloadUrl = (token, id) => `${API_ROOT}/api/public/documents/${token}/${id}/download`;
