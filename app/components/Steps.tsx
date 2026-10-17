'use client';
import { useEffect, useRef, useState } from 'react';

const Row = ({ n, meta, price, tone, hot }: { n: string; meta: string; price: string; tone: string; hot?: boolean }) => (
  <div className={`row${hot ? ' hot' : ''}`}>
    <span className="ava" style={{ background: tone }}>{n.slice(0, 1)}</span>
    <div><b>{n}</b><span className="meta">{meta}</span></div>
    <div className="price">{price}<small>à partir de</small></div>
  </div>
);

const STEPS = [
  {
    tab: 'Trouvez', time: '2 min', title: 'Trouvez en 2 minutes',
    text: 'Filtrez par ville, langue, niche et budget. Chaque profil montre ses vidéos, ses tarifs et son délai de livraison.',
    pts: ['Identité vérifiée', 'Prix affichés par le créateur', 'Gratuit pour chercher'],
    ui: () => (<>
      <div className="chips"><span className="chip on">Casablanca</span><span className="chip on">Darija</span><span className="chip on">Beauté</span><span className="chip">Moins de 800 DH</span></div>
      <Row n="Créatrice beauté" meta="Casablanca · darija, français" price="650 DH" tone="#e0527a" hot />
      <Row n="Créatrice skincare" meta="Rabat · français, darija" price="750 DH" tone="#c2557a" />
      <Row n="Créatrice maison" meta="Kénitra · darija" price="480 DH" tone="#7f8a2e" />
    </>),
  },
  {
    tab: 'Réservez', time: '1 clic', title: 'Réservez au prix affiché',
    text: 'Chaque créateur affiche un prix unique pour une vidéo. Ajoutez les options dont vous avez besoin : rushes, accroches en plus, diffusion depuis son compte. Le total exact s’affiche avant de payer.',
    pts: ['Carte marocaine ou virement', 'Paiement retenu jusqu’à validation', 'Facture avec votre ICE'],
    ui: () => (<>
      <div className="grid-ui">
        <div><span>Vidéo UGC<small>jusqu’à 30 s, 2 révisions</small></span><b>650 DH</b></div>
        <div className="sel"><span>+ 3 accroches en plus<small>3 débuts différents à tester</small></span><b>150 DH</b></div>
        <div className="sel"><span>+ Diffusion depuis son compte<small>Partnership ou Spark Ads, 30 jours</small></span><b>250 DH</b></div>
        <div><span>+ Rushes bruts<small>toutes les prises</small></span><b>100 DH</b></div>
        <div className="sel"><span><b>Total</b></span><b>1 050 DH</b></div>
      </div>
    </>),
  },
  {
    tab: 'Recevez', time: '5 jours', title: 'Votre vidéo en 5 jours',
    text: 'Envoyez le produit, suivez le colis, échangez avec le créateur. Vous commentez la vidéo à la seconde près ; deux révisions sont incluses.',
    pts: ['Envoi suivi', 'Commentaires horodatés', 'Deux révisions incluses'],
    ui: () => (<>
      <div className="track-ui">
        {[['Réservée', 1], ['Produit reçu', 1], ['Tournage', 1], ['Livrée', 1], ['Validée', 0]].map(([l, d]) => (
          <div key={l as string} className={d ? 'done' : ''}><i /><b>{l}</b></div>
        ))}
      </div>
      <div className="cmts">
        <div><b>0:04</b><span>Super accroche, à garder.</span></div>
        <div><b>0:13</b><span>Montrer le flacon de face.</span></div>
        <div><b>0:24</b><span>Dire « apaise » plutôt que « soigne ».</span></div>
        <span className="tag warn">Révision 1 sur 2</span>
      </div>
    </>),
  },
  {
    tab: 'Mesurez', time: 'en continu', title: 'Gardez ceux qui vendent',
    text: 'Chaque vidéo remonte ses résultats depuis Meta et TikTok Ads. Vous voyez son coût par vente et vous réservez à nouveau les meilleurs créateurs.',
    pts: ['Hook rate, CTR, coût par vente', 'Classement selon vos ventes', 'Réserver à nouveau en un clic'],
    ui: () => (<>
      {[['Routine du soir', 54, 'good', 'Augmenter le budget'], ['Témoignage', 57, 'good', 'Augmenter le budget'], ['Essayage', 74, 'warn', 'Tester une accroche']].map(([n, v, c, t]) => (
        <div className="perf-ui" key={n as string}>
          <div><b>{n}</b><span className={`tag ${c}`}>{t}</span></div>
          <div className="bar"><i style={{ width: `${v}%` }} /><em style={{ left: '63%' }} /></div>
          <span className="meta">Coût par vente {v} DH · cible 63 DH</span>
        </div>
      ))}
    </>),
  },
];

export default function Steps() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => {
      const r = ref.current?.getBoundingClientRect();
      if (document.hidden || !r || r.bottom < 0 || r.top > innerHeight) return;
      setI((x) => (x + 1) % STEPS.length); setRun((x) => x + 1);
    }, 6000);
    return () => clearInterval(t);
  }, [paused]);

  const st = STEPS[i];
  return (
    <div ref={ref}>
      <div className="steps" role="tablist" aria-label="Étapes de réservation">
        {STEPS.map((s, j) => (
          <button key={s.tab} className={`step${j === i && !paused ? ' run' : ''}`} role="tab" aria-selected={j === i}
            aria-controls="panel-step" onClick={() => { setPaused(true); setI(j); setRun((x) => x + 1); }}>
            <span className="n">{j + 1}</span><span className="t">{s.tab}</span><span className="d">{s.time}</span>
            <span className="pg"><i key={`${run}-${j}`} /></span>
          </button>
        ))}
      </div>
      <div className="step-card swap" id="panel-step" role="tabpanel" key={`${i}-${run}`} aria-live="polite">
        <div className="sc-text"><h3>{st.title}</h3><p>{st.text}</p><ul>{st.pts.map((p) => <li key={p}>{p}</li>)}</ul></div>
        <div className="sc-ui"><p className="sc-cap">Aperçu de l’interface</p>{st.ui()}</div>
      </div>
    </div>
  );
}
