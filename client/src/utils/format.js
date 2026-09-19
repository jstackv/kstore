export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const fileIconLabel = (fileType) => (fileType || '').toUpperCase();

export const STORAGE_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB display ceiling

// How each file type is shown in the in-browser viewer
export const viewerKind = (fileType) => {
  if (fileType === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png'].includes(fileType)) return 'image';
  if (fileType === 'docx') return 'docx';
  return 'office'; // doc, xls, xlsx, ppt, pptx -> hosted Office viewer
};
