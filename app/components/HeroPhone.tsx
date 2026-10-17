'use client';
import { useEffect, useState } from 'react';

const CLIPS = [
  { tone: '#e0527a', tone2: '#a8335a', hook: 'Je l’applique le soir…', tag: 'Beauté' },
  { tone: '#3d63c9', tone2: '#253f8a', hook: 'Unboxing sans coupe', tag: 'Tech' },
  { tone: '#c98a1a', tone2: '#8a5c0c', hook: 'Le vrai prix du plat', tag: 'Food' },
  { tone: '#1f8a8a', tone2: '#125c5c', hook: 'Ma bouteille du matin', tag: 'Fitness' },
];
const NOTIFS = [
  { ic: '✓', t: 'Profil vérifié', d: 'Ta fiche est visible des marques' },
  { ic: 'DH', t: 'Nouvelle réservation', d: 'Pack 3 vidéos · 1 750 DH' },
  { ic: '▶', t: 'Vidéo validée', d: 'Paiement envoyé sur ton compte' },
];

/** Téléphone du héros : une vidéo UGC qui défile et des notifications qui arrivent. */
export default function HeroPhone() {
  const [k, setK] = useState(0);
  const [n, setN] = useState(1);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(NOTIFS.length); return; }
    const t = setInterval(() => {
      if (document.hidden) return;
      setK((x) => (x + 1) % CLIPS.length);
      setN((x) => (x >= NOTIFS.length ? 1 : x + 1));
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
      <span className="hp-cap">Exemple</span>
    </div>
  );
}
