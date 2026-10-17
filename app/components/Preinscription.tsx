import Link from 'next/link';
import CreatorSignup from './CreatorSignup';
import HeroPhone from './HeroPhone';
import StickyCta from './StickyCta';
import Reveal from './Reveal';
import { Arr } from './Icons';
import { publicCreatorCount } from '@/lib/supabase/public';
import { NICHES } from '@/lib/data';

const WALL: [string, string, string][] = [
  ['Témoignage', 'Je l’applique le soir…', '#e0527a'],
  ['Unboxing', 'On ouvre le coffret ensemble', '#3f8f5a'],
  ['Avant / après', '14 jours, sans filtre', '#c2557a'],
  ['Accroches', 'Livré en 30 min, vraiment ?', '#c98a1a'],
  ['Essayage', 'Trois tenues, une pièce', '#b8434b'],
  ['Démo produit', '3 raisons de l’acheter', '#3d63c9'],
  ['Voix off', 'Ma bouteille du matin', '#1f8a8a'],
  ['Séquences brutes', 'Arrivée à 7 h', '#2e7fa8'],
  ['Dégustation', 'Le vrai prix du plat', '#b0702a'],
  ['Témoignage', 'Monté en 12 minutes', '#7f8a2e'],
];

const FAQ: [string, string][] = [
  ['Faut-il beaucoup d’abonnés ?', 'Non. En UGC, la marque achète ta vidéo et la publie depuis ses propres comptes. Ce qui compte : une image nette, un son propre et une façon naturelle de parler du produit.'],
  ['Combien ça coûte ?', 'Rien. L’inscription est gratuite et tu fixes toi-même tes prix.'],
  ['Faut-il être auto-entrepreneur ?', 'Pas pour te préinscrire. Pour être payé, il te faudra un statut ; on t’accompagne pour l’obtenir en ligne.'],
  ['Comment se passe la vérification ?', 'L’équipe regarde tes vidéos et tes comptes, puis valide ton profil. Tu reçois la réponse sur WhatsApp.'],
  ['Quand arrivent les marques ?', 'Dès que le catalogue compte assez de créateurs vérifiés dans chaque niche. Les préinscrits sont les premiers visibles.'],
  ['Je peux refuser une marque ?', 'Oui. Tu restes libre de tes collaborations et tu changes tes prix quand tu veux.'],
];

export default async function Preinscription() {
  const count = await publicCreatorCount();
  const wall = WALL.map((w, i) => (
    <figure className="vc" key={i}>
      <div className="vc-frame" style={{ background: w[2] }}>
        <span className="vc-play" aria-hidden="true" /><span className="vc-hook">{w[1]}</span><span className="vc-bar"><i /></span>
      </div>
      <figcaption className="vc-sub">{w[0]}</figcaption>
    </figure>
  ));
  const niches = NICHES.map((n) => <span key={n}><b>✦</b>{n}</span>);

  return (
    <main>
      <Reveal />
      <StickyCta />

      <header className="band on-forest pi-hero" id="top">
        <div className="top">
          <Link className="wordmark" href="/" aria-label="Kivora, accueil"><span className="mono" aria-hidden="true">K</span>KIVORA</Link>
          <nav aria-label="Accès"><Link className="link" href="/connexion">Se connecter</Link></nav>
        </div>
        <div className="pi-grid">
          <div className="pi-text say">
            <p className="pill-live"><span className="dot" aria-hidden="true" />Préinscriptions ouvertes · créateurs au Maroc</p>
            <h1>Fixe ton prix.<span>Les marques réservent.</span></h1>
            <p className="lead">Kivora relie les créateurs UGC marocains aux marques qui ont besoin de vidéos qui vendent. Tu filmes, tu fixes tes tarifs, tu es payé à chaque vidéo validée.</p>
            <div className="pi-cta">
              <a className="btn big" href="#preinscription">Je me préinscris <Arr /></a>
              <span>2 minutes · gratuit · sans engagement</span>
            </div>
            <dl className="pi-stats">
              <div><dt>Inscription</dt><dd>0 DH</dd></div>
              <div><dt>Ton prix</dt><dd>c’est toi</dd></div>
              <div><dt>{count >= 50 ? 'Déjà inscrits' : 'Abonnés requis'}</dt><dd>{count >= 50 ? count.toLocaleString('fr-FR') : 'aucun'}</dd></div>
            </dl>
          </div>
          <HeroPhone />
        </div>
        <p className="wall-l">Ce que les marques vont te demander</p>
        <div className="wall" aria-label="Exemples de formats de vidéos"><div className="wall-track">{wall}{wall}</div></div>
      </header>

      <div className="band ticker" aria-label="Niches recherchées"><div className="track">{niches}{niches}</div></div>

      <section className="band on-white pi-form" id="preinscription" aria-labelledby="h-form">
        <div className="pi-form-h rv">
          <h2 id="h-form" className="sec-h">Ta préinscription</h2>
          <p>Quatre étapes. Ta fiche se construit à côté pendant que tu remplis.</p>
        </div>
        <CreatorSignup />
      </section>

      <section className="band on-forest sec" aria-labelledby="h-how">
        <h2 id="h-how" className="sec-h rv"><span>Comment ça marche</span></h2>
        <ol className="pi-steps rv">
          <li><span className="n">01</span><h3>Tu te préinscris</h3><p>Ta ville, tes niches, tes réseaux et ton prix pour une vidéo. Deux minutes.</p></li>
          <li><span className="n">02</span><h3>On vérifie ton profil</h3><p>L’équipe regarde tes vidéos. Une fois validé, ta fiche apparaît dans le catalogue des marques.</p></li>
          <li><span className="n">03</span><h3>Les marques réservent</h3><p>Elles choisissent un tarif de ta grille et t’envoient le produit. Tu filmes, la marque valide, tu es payé.</p></li>
        </ol>
      </section>

      <section className="band on-black sec statement" aria-labelledby="h-st">
        <h2 id="h-st" className="rv"><span>Pas besoin d’être influenceur.</span></h2>
        <p className="rv"><span>Les marques n’achètent pas tes abonnés : elles achètent une vidéo qui donne envie, qu’elles publient sur leurs propres pubs. Voici ce qu’on regarde.</span></p>
        <div className="crit rv">
          <div><b>Image nette</b><span>Un téléphone récent suffit, lumière du jour.</span></div>
          <div><b>Son propre</b><span>Pas de bruit de fond, voix claire.</span></div>
          <div><b>Naturel</b><span>Tu parles du produit comme à une amie.</span></div>
          <div><b>Sérieux</b><span>Tu livres à temps et tu réponds aux messages.</span></div>
        </div>
      </section>

      <section className="band on-forest faq" aria-labelledby="h-faq">
        <div className="qa head"><h3 id="h-faq">Tes questions</h3></div>
        {FAQ.map((q) => <div className="qa rv" key={q[0]}><h3>{q[0]}</h3><p>{q[1]}</p></div>)}
      </section>

      <section className="band on-lime final" aria-labelledby="h-fin">
        <h2 id="h-fin">Rejoins les premiers créateurs Kivora.</h2>
        <a className="btn ink big" href="#preinscription">Je me préinscris <Arr /></a>
      </section>

      <footer className="band on-black foot">
        <div className="wm" aria-hidden="true">KIVORA</div>
        <div className="legal"><span>© {new Date().getFullYear()} Kivora · Maroc</span><span style={{ display: 'flex', gap: 20 }}><Link href="/connexion">Se connecter</Link><Link href="/confidentialite">Données personnelles</Link></span></div>
      </footer>
    </main>
  );
}
