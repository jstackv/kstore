import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../Icon';

const MIN_Z = 0.5;
const MAX_Z = 16;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Image viewer: wheel / pinch zoom toward the cursor, drag to pan,
// double-click or double-tap to jump in and out, rotate, keyboard shortcuts.
export default function ImageStage({ src, alt, onReady, onError }) {
  const boxRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [nat, setNat] = useState(null);
  const [view, setView] = useState({ z: 1, x: 0, y: 0, r: 0 });
  const [dragging, setDragging] = useState(false);
  const [smooth, setSmooth] = useState(false);
  const pointers = useRef(new Map());
  const pan = useRef(null);
  const pinch = useRef(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rotated = view.r % 180 !== 0;
  const iw = nat ? (rotated ? nat.h : nat.w) : 1;
  const ih = nat ? (rotated ? nat.w : nat.h) : 1;
  const fit = nat && box.w ? Math.min(1, (box.w - 48) / iw, (box.h - 48) / ih) : 1;
  const scale = fit * view.z;

  // Zoom keeping the point under (cx, cy) fixed on screen.
  const zoomAt = useCallback((cx, cy, factor) => {
    const rect = boxRef.current.getBoundingClientRect();
    const px = cx - rect.left - rect.width / 2;
    const py = cy - rect.top - rect.height / 2;
    setView((v) => {
      const nz = clamp(v.z * factor, MIN_Z, MAX_Z);
      const k = nz / v.z;
      return { ...v, z: nz, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  const zoomCenter = (factor) => {
    setSmooth(true);
    const rect = boxRef.current.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    setTimeout(() => setSmooth(false), 260);
  };
  const reset = () => {
    setSmooth(true);
    setView((v) => ({ ...v, z: 1, x: 0, y: 0 }));
    setTimeout(() => setSmooth(false), 260);
  };
  const rotate = () => {
    setSmooth(true);
    setView((v) => ({ z: 1, x: 0, y: 0, r: (v.r + 90) % 360 }));
    setTimeout(() => setSmooth(false), 260);
  };

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '+' || e.key === '=') zoomCenter(1.25);
      else if (e.key === '-' || e.key === '_') zoomCenter(1 / 1.25);
      else if (e.key === '0') reset();
      else if (e.key === 'r' || e.key === 'R') rotate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleZoomAt = (cx, cy) => {
    setSmooth(true);
    if (viewRef.current.z > 1.05) reset();
    else zoomAt(cx, cy, 2.5);
    setTimeout(() => setSmooth(false), 260);
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      pan.current = { sx: e.clientX, sy: e.clientY, ox: viewRef.current.x, oy: viewRef.current.y, moved: false };
      setDragging(true);
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y) };
      pan.current = null;
    }
  };

  const onPointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch.current.d);
      pinch.current.d = d;
    } else if (pan.current) {
      const dx = e.clientX - pan.current.sx;
      const dy = e.clientY - pan.current.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) pan.current.moved = true;
      setView((v) => ({ ...v, x: pan.current.ox + dx, y: pan.current.oy + dy }));
    }
  };

  const onPointerUp = (e) => {
    const wasPan = pan.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      setDragging(false);
      pan.current = null;
      // double-tap (touch only; mouse uses onDoubleClick)
      if (e.pointerType === 'touch' && wasPan && !wasPan.moved) {
        const now = Date.now();
        const lt = lastTap.current;
        if (now - lt.t < 320 && Math.hypot(e.clientX - lt.x, e.clientY - lt.y) < 30) {
          toggleZoomAt(e.clientX, e.clientY);
          lastTap.current = { t: 0, x: 0, y: 0 };
        } else {
          lastTap.current = { t: now, x: e.clientX, y: e.clientY };
        }
      }
    }
  };

  return (
    <div
      ref={boxRef}
      className={`checker absolute inset-0 touch-none select-none overflow-hidden ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={(e) => e.nativeEvent.pointerType !== 'touch' && toggleZoomAt(e.clientX, e.clientY)}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        onLoad={(e) => {
          setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
          onReady?.();
        }}
        onError={() => onError?.("This image couldn't be displayed.")}
        className={`absolute left-1/2 top-1/2 max-w-none rounded-md shadow-[0_24px_70px_-16px_rgba(0,0,0,0.75)] will-change-transform ${
          smooth ? 'transition-transform duration-200 ease-out' : ''
        } ${nat ? '' : 'opacity-0'}`}
        style={{
          width: nat?.w,
          height: nat?.h,
          transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px)) rotate(${view.r}deg) scale(${scale})`,
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
        <div className="vpill pointer-events-auto" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <button className="vbtn" onClick={() => zoomCenter(1 / 1.25)} aria-label="Zoom out" title="Zoom out (−)">
            <Icon name="zoom-out" className="h-4 w-4" />
          </button>
          <button className="vbtn min-w-[3.4rem] tabular-nums" onClick={reset} title="Reset view (0)">
            {Math.round(scale * 100)}%
          </button>
          <button className="vbtn" onClick={() => zoomCenter(1.25)} aria-label="Zoom in" title="Zoom in (+)">
            <Icon name="zoom-in" className="h-4 w-4" />
          </button>
          <span className="vsep" />
          <button className="vbtn" onClick={reset} aria-label="Fit to screen" title="Fit to screen (0)">
            <Icon name="fit" className="h-4 w-4" />
          </button>
          <button className="vbtn" onClick={rotate} aria-label="Rotate" title="Rotate (R)">
            <Icon name="rotate" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
