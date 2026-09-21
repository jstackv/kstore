import React, { useEffect, useState } from 'react';
import Icon from '../Icon';
import { useToast } from '../../context/ToastContext';
import { copyText } from '../../utils/clipboard';

// "Share this folder" dialog: link + copy, a scannable QR code (handy for
// opening the folder on a phone) and the native share sheet where supported.
export default function SharePanel({ url, title, onClose }) {
  const { showToast } = useToast();
  const [qr, setQr] = useState('');
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    let cancelled = false;
    import('qrcode')
      .then((mod) => {
        const QR = mod.default || mod;
        return QR.toDataURL(url, {
          width: 480,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#12122B', light: '#FFFFFF' },
        });
      })
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleCopy = async () => {
    const ok = await copyText(url);
    showToast(ok ? 'Link copied to clipboard' : "Couldn't copy - select the link and copy it manually", ok ? 'success' : 'error');
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text: `${title} - shared with KStore`, url });
    } catch {
      /* dismissed */
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-night-900/70 p-4 backdrop-blur-sm animate-fade-in sm:items-center"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share this folder"
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-surface shadow-modal ring-1 ring-ink/10 animate-scale-in"
      >
        <div className="relative overflow-hidden bg-night-900 px-6 pb-16 pt-5 text-white">
          <div className="aurora -right-10 -top-16 h-44 w-44 bg-vault" />
          <div className="aurora -bottom-20 left-0 h-40 w-40 bg-vault-glow" style={{ animationDelay: '-8s' }} />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">Share folder</p>
              <h2 className="mt-1 truncate font-serif text-xl" title={title}>
                {title}
              </h2>
            </div>
            <button onClick={onClose} className="vbtn -mr-1.5 -mt-1 h-8 w-8 !px-0" aria-label="Close">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative z-10 -mt-11 px-6 pb-6">
          <div className="mx-auto w-fit rounded-2xl bg-white p-2.5 shadow-lift ring-1 ring-ink/10">
            {qr ? (
              <img src={qr} alt="QR code for this shared folder" className="h-44 w-44 animate-pop" />
            ) : (
              <div className="page-shimmer h-44 w-44 rounded-lg" />
            )}
          </div>
          <p className="mt-3 text-center text-xs text-slate">Scan with a phone camera to open this folder on another device.</p>

          <div className="mt-5 flex items-center gap-2 rounded-xl bg-paper p-1.5 ring-1 ring-ink/10">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="min-w-0 flex-1 bg-transparent px-2.5 text-xs text-ink outline-none"
              aria-label="Share link"
            />
            <button onClick={handleCopy} className="btn-primary btn-sm shrink-0">
              <Icon name="copy" className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>

          {canNativeShare && (
            <button onClick={handleNativeShare} className="btn-soft mt-3 w-full">
              <Icon name="share" className="h-4 w-4" />
              Share via…
            </button>
          )}

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate">
            <Icon name="shield" className="mt-px h-3.5 w-3.5 shrink-0 text-vault" />
            Anyone with this link can view and download these documents. Only the person who shared it can turn it off.
          </p>
        </div>
      </div>
    </div>
  );
}
