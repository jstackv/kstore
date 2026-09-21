import React, { useState } from 'react';
import { typeMeta, isImageType } from '../../utils/format';

// Large preview tile for a document card. Images show their real thumbnail;
// everything else gets a gradient tile with a little "sheet of paper" glyph.
// Expects to sit inside an element with the `group` class for the hover tilt.
export default function FileTile({ doc, src, className = '' }) {
  const meta = typeMeta(doc.fileType);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showImage = isImageType(doc.fileType) && src && !failed;
  const ext = (doc.fileType || 'file').slice(0, 4).toUpperCase();

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${meta.from}, ${meta.to})` }}
    >
      {/* soft decoration */}
      <div className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-black/15 blur-2xl" />
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-70" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[5.75rem] w-[4.5rem] rounded-xl bg-white/95 shadow-[0_14px_30px_-10px_rgba(0,0,0,0.45)] transition-transform duration-500 ease-out group-hover:-rotate-3 group-hover:scale-110">
          <span className="absolute right-0 top-0 h-5 w-5 rounded-bl-xl rounded-tr-xl bg-black/10" />
          <div className="absolute inset-x-3.5 top-9 space-y-1.5">
            <div className="h-1 w-full rounded-full bg-slate/25" />
            <div className="h-1 w-4/5 rounded-full bg-slate/25" />
            <div className="h-1 w-3/5 rounded-full bg-slate/25" />
          </div>
          <span
            className="absolute inset-x-0 bottom-2 text-center text-[10px] font-extrabold tracking-wider"
            style={{ color: meta.to }}
          >
            {ext}
          </span>
        </div>
      </div>

      {showImage && (
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-105 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
}
