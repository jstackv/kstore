import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';

// Renders a .docx in the browser with docx-preview (no Microsoft round trip),
// with zoom. If rendering fails the viewer falls back to the hosted Office viewer.
export default function DocxStage({ data, onReady, onError }) {
  const host = useRef(null);
  const [zoom, setZoom] = useState(1);
  const cb = useRef({ onReady, onError });
  cb.current = { onReady, onError };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { renderAsync } = await import('docx-preview');
        if (cancelled || !host.current) return;
        host.current.innerHTML = '';
        await renderAsync(data, host.current, host.current, {
          className: 'docx',
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
        });
        if (!cancelled) cb.current.onReady?.();
      } catch {
        if (!cancelled) cb.current.onError?.('fallback');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)));
      else if (e.key === '-' || e.key === '_') setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)));
      else if (e.key === '0') setZoom(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="absolute inset-0">
      <div className="dot-grid absolute inset-0 overflow-auto p-3 md:p-8">
        <div ref={host} style={{ zoom }} className="docx-stage mx-auto" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
        <div className="vpill pointer-events-auto">
          <button className="vbtn" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))} aria-label="Zoom out" title="Zoom out (−)">
            <Icon name="zoom-out" className="h-4 w-4" />
          </button>
          <button className="vbtn min-w-[3.2rem] tabular-nums" onClick={() => setZoom(1)} title="Reset zoom (0)">
            {Math.round(zoom * 100)}%
          </button>
          <button className="vbtn" onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))} aria-label="Zoom in" title="Zoom in (+)">
            <Icon name="zoom-in" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
