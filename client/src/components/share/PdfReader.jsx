import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url';
import Icon from '../Icon';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

const GAP = 18; // px between pages
const TOP = 20;
const BOTTOM = 120; // room for the floating control pill
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 4;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// One page. Only draws while it's near the viewport and frees its bitmap when
// it scrolls far away, so a 300-page PDF doesn't eat the phone's memory.
const PdfPage = memo(function PdfPage({ pdf, number, top, width, height, renderScale, root }) {
  const holder = useRef(null);
  const canvas = useRef(null);
  const [near, setNear] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!root || !holder.current) return undefined;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), {
      root,
      rootMargin: '1200px 0px 1200px 0px',
    });
    io.observe(holder.current);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return undefined;
    if (!near) {
      c.width = 1; // free the bitmap (a 0x0 canvas can paint a broken-image glyph in some browsers)
      c.height = 1;
      setDrawn(false);
      return undefined;
    }
    if (!renderScale || !pdf) return undefined;

    let cancelled = false;
    let task;
    (async () => {
      const pg = await pdf.getPage(number);
      if (cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = pg.getViewport({ scale: renderScale * dpr });
      // Draw offscreen, then copy across, so the visible canvas never flashes blank on re-render.
      const off = document.createElement('canvas');
      off.width = Math.ceil(vp.width);
      off.height = Math.ceil(vp.height);
      task = pg.render({ canvasContext: off.getContext('2d'), viewport: vp });
      await task.promise;
      if (cancelled) return;
      c.width = off.width;
      c.height = off.height;
      c.getContext('2d').drawImage(off, 0, 0);
      setDrawn(true);
    })().catch((e) => {
      if (e?.name !== 'RenderingCancelledException') console.warn('PDF page failed to render', number, e);
    });
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [near, renderScale, pdf, number]);

  return (
    <div
      ref={holder}
      data-page={number}
      className="absolute overflow-hidden rounded-[3px] bg-white shadow-[0_18px_50px_-12px_rgba(0,0,0,0.65)]"
      style={{ top, width, height, left: '50%', marginLeft: -width / 2 }}
    >
      {!drawn && <div className="page-shimmer absolute inset-0" />}
      <canvas ref={canvas} className="relative block" style={{ width, height, visibility: drawn ? 'visible' : 'hidden' }} />
    </div>
  );
});

const PdfThumb = memo(function PdfThumb({ pdf, number, pw, ph, active, onPick, root }) {
  const W = 112;
  const H = Math.round((ph * W) / pw);
  const holder = useRef(null);
  const canvas = useRef(null);
  const [near, setNear] = useState(false);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!root || !holder.current) return undefined;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { root, rootMargin: '400px 0px' });
    io.observe(holder.current);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!near || drawn || !pdf) return undefined;
    let cancelled = false;
    let task;
    (async () => {
      const pg = await pdf.getPage(number);
      if (cancelled) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = pg.getViewport({ scale: (W / pw) * dpr });
      const c = canvas.current;
      if (!c) return;
      c.width = Math.ceil(vp.width);
      c.height = Math.ceil(vp.height);
      task = pg.render({ canvasContext: c.getContext('2d'), viewport: vp });
      await task.promise;
      if (!cancelled) setDrawn(true);
    })().catch(() => {});
    return () => {
      cancelled = true;
      task?.cancel?.();
    };
  }, [near, drawn, pdf, number, pw]);

  return (
    <button
      data-thumb={number}
      onClick={() => onPick(number)}
      className="group flex shrink-0 flex-col items-center gap-1 focus:outline-none"
      aria-label={`Go to page ${number}`}
      aria-current={active ? 'true' : undefined}
    >
      <div
        ref={holder}
        className={`relative overflow-hidden rounded-md bg-white shadow-md ring-2 transition-all duration-200 ${
          active ? 'scale-[1.03] ring-vault-glow' : 'ring-transparent group-hover:ring-white/40'
        }`}
        style={{ width: W, height: H }}
      >
        {!drawn && <div className="page-shimmer absolute inset-0" />}
        <canvas ref={canvas} className="relative block" style={{ width: W, height: H, visibility: drawn ? 'visible' : 'hidden' }} />
      </div>
      <span className={`text-[11px] font-semibold ${active ? 'text-white' : 'text-white/45'}`}>{number}</span>
    </button>
  );
});

// Full PDF reader drawn with PDF.js: continuous scroll, page thumbnails, zoom,
// page jump, keyboard + touch pinch. Rendering the bytes ourselves (instead of
// an <iframe>) is what makes shared PDFs work on phones and behind strict headers.
export default function PdfReader({ data, onReady, onError }) {
  const [pdf, setPdf] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [zoom, setZoom] = useState(1); // 1 = fit width
  const [renderScale, setRenderScale] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [page, setPage] = useState(1);
  const [pageText, setPageText] = useState('1');
  const [thumbsOpen, setThumbsOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [progress, setProgress] = useState(0);
  const [scroller, setScroller] = useState(null);
  const [sidebar, setSidebar] = useState(null);

  const scrollerRef = useRef(null);
  const inputRef = useRef(null);
  const anchorRef = useRef(null);
  const raf = useRef(0);
  const zoomRef = useRef(1);
  const layoutRef = useRef({ offsets: [], total: 0 });
  const cb = useRef({ onReady, onError });
  cb.current = { onReady, onError };
  zoomRef.current = zoom;

  // ---- load the document ------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const task = pdfjsLib.getDocument({ data: new Uint8Array(data.slice(0)), isEvalSupported: false });
    (async () => {
      try {
        const doc = await task.promise;
        if (cancelled) return;
        const first = await doc.getPage(1);
        const v = first.getViewport({ scale: 1 });
        const base = { w: v.width, h: v.height };
        if (cancelled) return;
        setPdf(doc);
        setSizes(Array.from({ length: doc.numPages }, () => base));
        cb.current.onReady?.(doc.numPages);

        // Real per-page sizes trickle in behind the scenes (mixed page sizes are rare but real).
        const acc = [base];
        for (let i = 2; i <= doc.numPages; i += 1) {
          const pg = await doc.getPage(i);
          if (cancelled) return;
          const vp = pg.getViewport({ scale: 1 });
          acc.push({ w: vp.width, h: vp.height });
          if (i % 20 === 0 || i === doc.numPages) {
            const snapshot = acc.slice();
            setSizes((prev) => prev.map((s, idx) => snapshot[idx] || s));
          }
        }
      } catch (err) {
        if (cancelled) return;
        cb.current.onError?.(
          err?.name === 'PasswordException'
            ? 'This PDF is password-protected. Download it to open it with your password.'
            : "This PDF couldn't be displayed. You can still download it."
        );
      }
    })();
    return () => {
      cancelled = true;
      task.destroy?.();
    };
  }, [data]);

  // ---- measure the viewport ---------------------------------------------
  const setScrollerEl = useCallback((el) => {
    scrollerRef.current = el;
    setScroller(el);
  }, []);

  useEffect(() => {
    if (!scroller) return undefined;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(scroller);
    scroller.focus({ preventScroll: true });
    return () => ro.disconnect();
  }, [scroller]);

  // ---- layout -----------------------------------------------------------
  const pad = box.w < 640 ? 10 : 28;
  const maxW = useMemo(() => (sizes.length ? Math.max(...sizes.map((s) => s.w)) : 1), [sizes]);
  const fit = box.w ? Math.max(0.1, (box.w - pad * 2) / maxW) : 1;
  const scale = fit * zoom;

  const layout = useMemo(() => {
    let y = TOP;
    const offsets = sizes.map((s) => {
      const o = y;
      y += s.h * scale + GAP;
      return o;
    });
    return { offsets, total: y + BOTTOM };
  }, [sizes, scale]);
  layoutRef.current = layout;

  // Re-draw at the new resolution only once zoom/resize settles; until then the
  // existing bitmaps are just stretched by CSS, which keeps pinch/zoom instant.
  useEffect(() => {
    if (!box.w) return undefined;
    if (renderScale === 0) {
      setRenderScale(scale);
      return undefined;
    }
    const t = setTimeout(() => setRenderScale(scale), 160);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, box.w]);

  // ---- scrolling / current page -----------------------------------------
  const onScroll = useCallback(() => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      const el = scrollerRef.current;
      const { offsets } = layoutRef.current;
      if (!el || !offsets.length) return;
      const y = el.scrollTop + el.clientHeight * 0.3;
      let lo = 0;
      let hi = offsets.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (offsets[mid] <= y) lo = mid;
        else hi = mid - 1;
      }
      setPage(lo + 1);
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? clamp(el.scrollTop / max, 0, 1) : 0);
    });
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) setPageText(String(page));
  }, [page]);

  // keep the active thumbnail in view
  useEffect(() => {
    if (!thumbsOpen || !sidebar) return;
    sidebar.querySelector(`[data-thumb="${page}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [page, thumbsOpen, sidebar]);

  const total = sizes.length;

  const goToPage = useCallback(
    (n) => {
      const target = clamp(Math.round(n) || 1, 1, Math.max(1, layoutRef.current.offsets.length));
      const el = scrollerRef.current;
      const top = layoutRef.current.offsets[target - 1];
      if (el && top !== undefined) el.scrollTo({ top: Math.max(0, top - 12), behavior: 'smooth' });
      setPage(target);
      setPageText(String(target));
    },
    []
  );

  // ---- zoom -------------------------------------------------------------
  const applyZoom = useCallback((next) => {
    const el = scrollerRef.current;
    if (el && el.scrollHeight) anchorRef.current = (el.scrollTop + el.clientHeight / 2) / el.scrollHeight;
    setZoom(clamp(+next.toFixed(3), MIN_ZOOM, MAX_ZOOM));
  }, []);
  const zoomBy = useCallback((f) => applyZoom(zoomRef.current * f), [applyZoom]);

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el || anchorRef.current == null) return;
    el.scrollTop = anchorRef.current * el.scrollHeight - el.clientHeight / 2;
    el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
    anchorRef.current = null;
  }, [zoom]);

  // Ctrl/Cmd + wheel (and trackpad pinch) zooms; two-finger touch pinch zooms too.
  useEffect(() => {
    if (!scroller) return undefined;
    const onWheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomBy(Math.exp(-e.deltaY * 0.01));
    };
    let start = null;
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e) => {
      if (e.touches.length === 2) start = { d: dist(e.touches), z: zoomRef.current };
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && start) {
        e.preventDefault();
        applyZoom(start.z * (dist(e.touches) / start.d));
      }
    };
    const onTouchEnd = () => {
      start = null;
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    scroller.addEventListener('touchstart', onTouchStart, { passive: true });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    scroller.addEventListener('touchend', onTouchEnd);
    return () => {
      scroller.removeEventListener('wheel', onWheel);
      scroller.removeEventListener('touchstart', onTouchStart);
      scroller.removeEventListener('touchmove', onTouchMove);
      scroller.removeEventListener('touchend', onTouchEnd);
    };
  }, [scroller, zoomBy, applyZoom]);

  // ---- keyboard ---------------------------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          goToPage(page + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPage(page - 1);
          break;
        case 'Home':
          e.preventDefault();
          goToPage(1);
          break;
        case 'End':
          e.preventDefault();
          goToPage(total);
          break;
        case '+':
        case '=':
          zoomBy(1.2);
          break;
        case '-':
        case '_':
          zoomBy(1 / 1.2);
          break;
        case '0':
          applyZoom(1);
          break;
        case 't':
        case 'T':
          setThumbsOpen((o) => !o);
          break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [page, total, goToPage, zoomBy, applyZoom]);

  const innerWidth = Math.max(box.w, maxW * scale + pad * 2);

  return (
    <div className="absolute inset-0 flex">
      {/* reading progress */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 bg-white/10">
        <div
          className="h-full rounded-r-full bg-gradient-to-r from-vault-glow to-aqua transition-[width] duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* thumbnails */}
      {thumbsOpen && (
        <aside
          ref={setSidebar}
          className="no-scrollbar absolute inset-y-0 left-0 z-20 flex w-[9.5rem] shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-white/10 bg-night-900/90 px-3 py-4 backdrop-blur-xl animate-fade-in md:static md:bg-night-900/60"
        >
          {pdf &&
            sizes.map((s, i) => (
              <PdfThumb
                key={i}
                pdf={pdf}
                number={i + 1}
                pw={s.w}
                ph={s.h}
                active={page === i + 1}
                onPick={goToPage}
                root={sidebar}
              />
            ))}
        </aside>
      )}

      {/* pages */}
      <div
        ref={setScrollerEl}
        tabIndex={0}
        onScroll={onScroll}
        className="relative min-w-0 flex-1 overflow-auto outline-none [touch-action:pan-x_pan-y]"
        aria-label="PDF pages"
      >
        <div className="relative" style={{ width: innerWidth, height: layout.total }}>
          {pdf &&
            sizes.map((s, i) => (
              <PdfPage
                key={i}
                pdf={pdf}
                number={i + 1}
                top={layout.offsets[i]}
                width={s.w * scale}
                height={s.h * scale}
                renderScale={renderScale}
                root={scroller}
              />
            ))}
        </div>
      </div>

      {/* floating controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-3">
        <div className="vpill pointer-events-auto max-w-full overflow-x-auto no-scrollbar">
          <button
            className={`vbtn ${thumbsOpen ? 'vbtn-on' : ''}`}
            onClick={() => setThumbsOpen((o) => !o)}
            title="Page thumbnails (T)"
            aria-label="Toggle page thumbnails"
            aria-pressed={thumbsOpen}
          >
            <Icon name="panel" className="h-4 w-4" />
          </button>
          <span className="vsep" />
          <button className="vbtn" onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page" title="Previous page (←)">
            <Icon name="chevron-left" className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1 px-1 text-xs font-semibold text-white/70">
            <input
              ref={inputRef}
              value={pageText}
              inputMode="numeric"
              aria-label="Page number"
              onChange={(e) => setPageText(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  goToPage(Number(pageText));
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') e.currentTarget.blur();
                e.stopPropagation();
              }}
              onBlur={() => setPageText(String(page))}
              onFocus={(e) => e.target.select()}
              className="h-7 w-10 rounded-lg bg-white/10 text-center text-white outline-none ring-vault-glow/50 focus:ring-2"
            />
            <span className="whitespace-nowrap">/ {total || '–'}</span>
          </div>
          <button className="vbtn" onClick={() => goToPage(page + 1)} disabled={page >= total} aria-label="Next page" title="Next page (→)">
            <Icon name="chevron" className="h-4 w-4" />
          </button>
          <span className="vsep" />
          <button className="vbtn" onClick={() => zoomBy(1 / 1.2)} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out" title="Zoom out (−)">
            <Icon name="zoom-out" className="h-4 w-4" />
          </button>
          <button className="vbtn min-w-[3.2rem] tabular-nums" onClick={() => applyZoom(1)} title="Fit to width (0)">
            {Math.round(zoom * 100)}%
          </button>
          <button className="vbtn" onClick={() => zoomBy(1.2)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" title="Zoom in (+)">
            <Icon name="zoom-in" className="h-4 w-4" />
          </button>
          <button className="vbtn" onClick={() => applyZoom(1)} aria-label="Fit to width" title="Fit to width (0)">
            <Icon name="fit" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
