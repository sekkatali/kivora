'use client';
import { useEffect, useRef, useState } from 'react';
import { initials, toneFor } from '@/lib/data';

/** Photo ronde du créateur, ou ses initiales. */
export function Avatar({ src, id, first, last, size = 44 }: { src?: string | null; id: string; first: string; last?: string | null; size?: number }) {
  return src
    ? <img className="ava img" src={src} alt="" width={size} height={size} style={{ width: size, height: size }} loading="lazy" />
    : <span className="ava" style={{ background: toneFor(id), width: size, height: size, fontSize: Math.round(size * 0.34) }}>{initials(first, last || '')}</span>;
}

/** Vidéo verticale muette. Avec une miniature, rien n'est téléchargé avant le survol ou le clic. */
export function VideoTile({ src, poster, label, onOpen, autoPlay = false, children }: { src: string; poster?: string | null; label: string; onOpen?: () => void; autoPlay?: boolean; children?: React.ReactNode }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v || !autoPlay || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }, { threshold: 0.6 });
    io.observe(v);
    return () => io.disconnect();
  }, [autoPlay]);
  const hover = (on: boolean) => { const v = ref.current; if (!v || autoPlay) return; if (on) v.play().catch(() => {}); else { v.pause(); } };
  return (
    <button type="button" className="vt" onClick={onOpen} onMouseEnter={() => hover(true)} onMouseLeave={() => hover(false)} aria-label={label}>
      {failed ? (poster ? <img src={poster} alt="" className="vt-poster" /> : <span className="vt-err">Vidéo indisponible</span>)
        : <video ref={ref} src={poster ? src : `${src}#t=0.1`} poster={poster || undefined} muted loop playsInline preload={poster ? 'none' : 'metadata'} onError={() => setFailed(true)} />}
      <span className="vt-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg></span>
      {children}
    </button>
  );
}

/** Lecteur plein écran, avec le son, flèches pour passer d'une vidéo à l'autre. */
export function VideoViewer({ srcs, start, title, onClose }: { srcs: string[]; start: number; title: string; onClose: () => void }) {
  const [i, setI] = useState(start);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setI((x) => Math.min(srcs.length - 1, x + 1));
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [srcs.length, onClose]);
  return (
    <div className="vv" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="vv-in" onClick={(e) => e.stopPropagation()}>
        <video key={srcs[i]} src={srcs[i]} controls autoPlay playsInline />
        <div className="vv-bar">
          <button type="button" onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Vidéo précédente">←</button>
          <span>{title} · {i + 1} / {srcs.length}</span>
          <button type="button" onClick={() => setI(i + 1)} disabled={i === srcs.length - 1} aria-label="Vidéo suivante">→</button>
        </div>
      </div>
      <button type="button" className="vv-x" onClick={onClose} aria-label="Fermer">×</button>
    </div>
  );
}
