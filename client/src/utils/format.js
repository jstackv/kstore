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

// "3 hours ago", "yesterday", "2 weeks ago" - falls back to a plain date after ~a month.
export const formatRelative = (dateStr) => {
  const d = new Date(dateStr);
  const seconds = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (abs < 45) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 86400 * 7) return rtf.format(Math.round(seconds / 86400), 'day');
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / (86400 * 7)), 'week');
  return formatDate(dateStr);
};

// Look and feel per file type for the share pages: tile gradient, friendly
// label, and the `group` the filter chips are keyed on.
const TYPE_META = {
  pdf: { label: 'PDF document', group: 'pdf', groupLabel: 'PDF', from: '#FB7185', to: '#E5484D' },
  doc: { label: 'Word document', group: 'word', groupLabel: 'Word', from: '#60A5FA', to: '#3B5BDB' },
  docx: { label: 'Word document', group: 'word', groupLabel: 'Word', from: '#60A5FA', to: '#3B5BDB' },
  xls: { label: 'Excel sheet', group: 'excel', groupLabel: 'Excel', from: '#34D399', to: '#0E9F7E' },
  xlsx: { label: 'Excel sheet', group: 'excel', groupLabel: 'Excel', from: '#34D399', to: '#0E9F7E' },
  ppt: { label: 'Presentation', group: 'slides', groupLabel: 'Slides', from: '#FDBA74', to: '#F26B21' },
  pptx: { label: 'Presentation', group: 'slides', groupLabel: 'Slides', from: '#FDBA74', to: '#F26B21' },
  jpg: { label: 'JPEG image', group: 'image', groupLabel: 'Images', from: '#A5B4FC', to: '#4F46E5' },
  jpeg: { label: 'JPEG image', group: 'image', groupLabel: 'Images', from: '#A5B4FC', to: '#4F46E5' },
  png: { label: 'PNG image', group: 'image', groupLabel: 'Images', from: '#A5B4FC', to: '#4F46E5' },
};

export const typeMeta = (fileType) =>
  TYPE_META[fileType] || {
    label: 'File',
    group: 'other',
    groupLabel: 'Other',
    from: '#94A3B8',
    to: '#5E6088',
  };

export const isImageType = (fileType) => ['jpg', 'jpeg', 'png'].includes(fileType);
