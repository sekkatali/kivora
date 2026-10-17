import Link from 'next/link';
import CreatorSignup from './CreatorSignup';
import HeroPhone from './HeroPhone';
import StickyCta from './StickyCta';
import LangSwitch from './LangSwitch';
import Reveal from './Reveal';
import { Arr } from './Icons';
import { publicCreatorCount } from '@/lib/supabase/public';
import { NICHES } from '@/lib/data';
import { T, label, type Lang } from '@/lib/i18n';

const WALL_TONES = ['#e0527a', '#3f8f5a', '#c2557a', '#c98a1a', '#b8434b', '#3d63c9', '#1f8a8a', '#2e7fa8', '#b0702a', '#7f8a2e'];

export default async function Preinscription({ lang = 'fr' }: { lang?: Lang }) {
  const t = T[lang];
  const count = await publicCreatorCount();
  const wall = t.wall.map((w, i) => (
    <figure className="vc" key={i}>
      <div className="vc-frame" style={{ background: WALL_TONES[i % WALL_TONES.length] }}>
        <span className="vc-play" aria-hidden="true" /><span className="vc-hook">{w[1]}</span><span className="vc-bar"><i /></span>
      </div>
      <figcaption className="vc-sub">{w[0]}</figcaption>
    </figure>
  ));
  const niches = NICHES.map((n) => <span key={n}><b>✦</b>{label('niche', n, lang)}</span>);
  const stats = t.stats.map((s, i) => (i === 2 && count >= 50 ? [t.already, count.toLocaleString('fr-FR')] : s));

  return (
    <main lang={lang === 'dr' ? 'ary' : 'fr'} dir={lang === 'dr' ? 'rtl' : 'ltr'} className={lang === 'dr' ? 'rtl' : undefined}>
      <Reveal />
      <StickyCta label={t.sticky} />

      <header className="band on-forest pi-hero" id="top">
        <div className="top">
          <Link className="wordmark" href={lang === 'dr' ? '/dr' : '/'} aria-label="Kivora" dir="ltr"><span className="mono" aria-hidden="true">K</span>KIVORA</Link>
          <nav aria-label="Accès"><LangSwitch lang={lang} /><Link className="link" href="/connexion">{t.login}</Link></nav>
        </div>
        <div className="pi-grid">
          <div className="pi-text say">
            <p className="pill-live"><span className="dot" aria-hidden="true" />{t.pill}</p>
            <h1>{t.h1a}<span>{t.h1b}</span></h1>
            <p className="lead">{t.lead}</p>
            <div className="pi-cta">
              <a className="btn big" href="#preinscription">{t.cta} <Arr /></a>
              <span>{t.ctaSub}</span>
            </div>
            <dl className="pi-stats">{stats.map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
          </div>
          <HeroPhone lang={lang} />
        </div>
        <p className="wall-l">{t.wallLabel}</p>
        <div className="wall" aria-label={t.wallLabel}><div className="wall-track">{wall}{wall}</div></div>
      </header>

      <div className="band ticker" aria-hidden="true"><div className="track">{niches}{niches}</div></div>

      <section className="band on-white pi-form" id="preinscription" aria-labelledby="h-form">
        <div className="pi-form-h rv">
          <h2 id="h-form" className="sec-h">{t.formTitle}</h2>
          <p>{t.formSub}</p>
        </div>
        <CreatorSignup lang={lang} />
      </section>

      <section className="band on-forest sec" aria-labelledby="h-how">
        <h2 id="h-how" className="sec-h rv"><span>{t.howTitle}</span></h2>
        <ol className="pi-steps rv">
          {t.how.map(([h, p], i) => <li key={h}><span className="n">0{i + 1}</span><h3>{h}</h3><p>{p}</p></li>)}
        </ol>
      </section>

      <section className="band on-black sec statement" aria-labelledby="h-st">
        <h2 id="h-st" className="rv"><span>{t.stTitle}</span></h2>
        <p className="rv"><span>{t.stText}</span></p>
        <div className="crit rv">{t.crit.map(([b, s]) => <div key={b}><b>{b}</b><span>{s}</span></div>)}</div>
      </section>

      <section className="band on-forest faq" aria-labelledby="h-faq">
        <div className="qa head"><h3 id="h-faq">{t.faqTitle}</h3></div>
        {t.faq.map((q) => <div className="qa rv" key={q[0]}><h3>{q[0]}</h3><p>{q[1]}</p></div>)}
      </section>

      <section className="band on-lime final" aria-labelledby="h-fin">
        <h2 id="h-fin">{t.finalTitle}</h2>
        <a className="btn ink big" href="#preinscription">{t.cta} <Arr /></a>
      </section>

      <footer className="band on-black foot">
        <div className="wm" aria-hidden="true" dir="ltr">KIVORA</div>
        <div className="legal"><span>© {new Date().getFullYear()} Kivora · Maroc</span><span style={{ display: 'flex', gap: 20 }}><Link href="/connexion">{t.login}</Link><Link href="/confidentialite">{t.privacy}</Link></span></div>
      </footer>
    </main>
  );
}
