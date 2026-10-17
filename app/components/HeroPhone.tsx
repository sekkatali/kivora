'use client';
import { useEffect, useState } from 'react';
import { T, type Lang } from '@/lib/i18n';

const TONES = [['#e0527a', '#a8335a'], ['#3d63c9', '#253f8a'], ['#c98a1a', '#8a5c0c'], ['#1f8a8a', '#125c5c']];

/** Téléphone du héros : une vidéo UGC qui défile et des notifications qui arrivent. */
export default function HeroPhone({ lang = 'fr' }: { lang?: Lang }) {
  const p = T[lang].phone;
  const NOTIFS = p.notifs.map(([ic, t, d]) => ({ ic, t, d }));
  const CLIPS = TONES.map(([tone, tone2], i) => ({ tone, tone2, hook: p.clips[i], tag: p.tags[i] }));
  const [k, setK] = useState(0);
  const [n, setN] = useState(1);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(3); return; }
    const t = setInterval(() => {
      if (document.hidden) return;
      setK((x) => (x + 1) % TONES.length);
      setN((x) => (x >= 3 ? 1 : x + 1));
    }, 2600);
    return () => clearInterval(t);
  }, []);
  const c = CLIPS[k];
  return (
    <div className="hp" aria-hidden="true">
      <div className="hp-phone">
        <div className="hp-screen" style={{ background: `linear-gradient(160deg, ${c.tone}, ${c.tone2})` }} key={k}>
          <span className="hp-top"><i />Kivora</span>
          <span className="hp-tag">{c.tag}</span>
          <span className="hp-play" />
          <span className="hp-hook">{c.hook}</span>
          <span className="hp-bar"><i /></span>
        </div>
      </div>
      <div className="hp-notifs">
        {NOTIFS.slice(0, n).map((x, i) => (
          <div className="hp-n" key={`${x.t}-${n}-${i}`} style={{ ['--d' as string]: `${i * 80}ms` }}>
            <span className="hp-ic">{x.ic}</span><span><b>{x.t}</b><small>{x.d}</small></span>
          </div>
        ))}
      </div>
      <span className="hp-cap">{p.example}</span>
    </div>
  );
}
