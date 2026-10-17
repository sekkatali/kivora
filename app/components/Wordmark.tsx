'use client';
import { useEffect, useState } from 'react';

const TONES = ['#e0527a', '#3d63c9', '#3f8f5a', '#c98a1a', '#1f8a8a'];

/** KIVORA en grand : le I est un cadre vidéo 9:16 qui défile. */
export default function Wordmark() {
  const [k, setK] = useState(0);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!document.hidden) setK((x) => (x + 1) % TONES.length); }, 2900);
    return () => clearInterval(t);
  }, []);
  return (
    <h1 className="name" aria-label="Kivora, créateurs UGC au Maroc">
      <span className="line">
        <span className="w" data-line style={{ ['--i' as string]: 0 }} aria-hidden="true">
          K<span className="reelI">
            {TONES.map((c, i) => (
              <span key={i} className={`clip${i === k ? ' on' : ''}`} style={{ background: c }}>
                <span className="play" /><span className="prog"><i /></span>
              </span>
            ))}
          </span>VORA
        </span>
      </span>
    </h1>
  );
}
