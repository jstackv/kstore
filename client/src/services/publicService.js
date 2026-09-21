import axios from 'axios';
import { API_ROOT } from './api';

// Separate from the main `api` instance deliberately: these calls hit
// unauthenticated public routes, so there's no cookie/token to send, and no
// reason to risk ever attaching one.
const publicApi = axios.create({ baseURL: `${API_ROOT}/api/public` });

// Tiny in-memory cache so hopping folder -> viewer -> next document doesn't
// re-download the listing every time. Short TTL: a revoked link stops working
// within a minute for anyone already on the page (file requests re-check the
// token on the server every time regardless).
const FOLDER_TTL = 60 * 1000;
const folderCache = new Map();

export const getSharedFolder = (token, { force = false } = {}) => {
  const hit = folderCache.get(token);
  if (!force && hit && Date.now() - hit.at < FOLDER_TTL) return Promise.resolve(hit.data);
  return publicApi.get(`/folders/${token}`).then((r) => {
    folderCache.set(token, { at: Date.now(), data: r.data });
    return r.data;
  });
};

// Plain URLs - for <a href> downloads, <img> thumbnails and the hosted Office viewer.
export const sharedDocumentViewUrl = (token, id) => `${API_ROOT}/api/public/documents/${token}/${id}/file`;
export const sharedDocumentDownloadUrl = (token, id) => `${API_ROOT}/api/public/documents/${token}/${id}/download`;

// Fetches the file bytes so the viewer can render them itself (PDF.js,
// docx-preview, an <img> from a blob). Rendering from bytes rather than
// pointing an <iframe> at the API means it works whatever framing headers the
// API sends, and on phones whose browsers can't show PDFs inline at all.
export const fetchSharedFile = (token, id, { onProgress, signal } = {}) =>
  publicApi
    .get(`/documents/${token}/${id}/file`, {
      responseType: 'arraybuffer',
      signal,
      onDownloadProgress: (e) => onProgress?.(e.loaded, e.total),
    })
    .then((r) => r.data);

// With responseType 'arraybuffer' an error body arrives as bytes - decode it
// so people see the server's message instead of "Request failed with 502".
export const sharedFileErrorMessage = (err) => {
  try {
    const raw = err?.response?.data;
    if (raw && raw.byteLength) {
      const json = JSON.parse(new TextDecoder().decode(raw));
      if (json?.message) return json.message;
    }
  } catch {
    /* fall through */
  }
  if (err?.response?.status === 404) return 'This document is no longer available.';
  if (err?.code === 'ERR_NETWORK') return "Couldn't reach the server. Check your connection and try again.";
  return "We couldn't load this document.";
};
