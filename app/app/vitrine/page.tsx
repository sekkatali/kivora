import Link from 'next/link';
import Wordmark from '@/components/Wordmark';
import Steps from '@/components/Steps';
import Feats from '@/components/Feats';
import Reveal from '@/components/Reveal';
import Footer from '@/components/Footer';
import { IcVideo, IcUser, IcShield, Arr } from '@/components/Icons';
import { publicCreatorCount } from '@/lib/supabase/public';
import { WHATSAPP } from '@/lib/data';

export const revalidate = 300;

/* Exemples de formats (aucune marque ni créateur réel). */
const WALL: [string, string, string, string][] = [
  ['Beauté', 'Témoignage', 'Je l’applique le soir…', '#e0527a'],
  ['Télécoms', 'Publicité Meta', '3 raisons de changer d’offre', '#3d63c9'],
  ['Bébé', 'Unboxing', 'On ouvre le coffret ensemble', '#3f8f5a'],
  ['Livraison', 'Accroches', 'Livré en 30 min, vraiment ?', '#c98a1a'],
  ['Mode', 'Essayage', 'Trois tenues, une pièce', '#b8434b'],
  ['Skincare', 'Avant / après', '14 jours, sans filtre', '#c2557a'],
  ['Fitness', 'Voix off', 'Ma bouteille du matin', '#1f8a8a'],
  ['Voyage', 'Séquences brutes', 'Arrivée à 7 h', '#2e7fa8'],
  ['Maison', 'Témoignage', 'Monté en 12 minutes', '#7f8a2e'],
  ['Cheveux', 'Publicité TikTok', 'Ce que personne ne dit', '#a8456b'],
  ['Food', 'Dégustation', 'Le vrai prix du plat', '#b0702a'],
];
const TICK: [string, string][] = [
  ['Témoignage', 'la preuve qui rassure'], ['Unboxing', 'le produit en main'], ['Avant / après', 'le résultat visible'],
  ['Accroches', '3 débuts pour tester'], ['Essayage', 'la taille, en vrai'], ['Voix off', 'votre script, sa voix'],
  ['Partnership Ads', 'depuis le compte du créateur'], ['Darija', 'parlé comme vos clients'],
];
const FAQ: [string, string][] = [
  ['Qui fixe le prix d’une vidéo ?', 'Le créateur. Il affiche un prix unique et ses options (rushes, accroches en plus, diffusion depuis son compte). Vous voyez le total exact avant de payer.'],
  ['Faut-il un abonnement ?', 'Non. Vous payez seulement quand vous réservez. Kivora Pro est une option pour mesurer les résultats publicitaires de vos vidéos.'],
  ['Quand le créateur est-il payé ?', 'Après votre validation de la vidéo. Jamais avant.'],
  ['Et si la vidéo ne convient pas ?', 'Deux révisions sont incluses. Si la vidéo ne respecte toujours pas le tarif réservé, vous êtes remboursé.'],
  ['Puis-je diffuser la vidéo en publicité ?', 'Oui, sans limite de durée, sur tous vos canaux. Pour la diffuser depuis le compte du créateur, choisissez le tarif qui l’inclut.'],
  ['Quand ouvre le catalogue ?', 'Les premières marques sont invitées par vagues. Demandez votre accès : on vous recontacte pour la démo.'],
];

export const metadata = { title: 'Vitrine marques', robots: { index: false } };

export default async function Vitrine() {
  const count = await publicCreatorCount();

  const demo = WHATSAPP
    ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour Kivora, je voudrais une démo pour ma marque.')}`
    : '/marques';
  const wall = WALL.map((w, i) => (
    <figure className="vc" key={i}>
      <figcaption className="vc-top"><b>{w[0]}</b><span className="lbl">{w[1]}</span></figcaption>
      <div className="vc-frame" style={{ background: w[3] }}>
        <span className="vc-play" aria-hidden="true" /><span className="vc-hook">{w[2]}</span><span className="vc-bar"><i /></span>
      </div>
    </figure>
  ));
  const tick = TICK.map((t, i) => <span key={i}><b>{t[0]}</b>{t[1]}</span>);

  return (
    <main>
      <Reveal />
      <header className="band on-forest hero">
        <div className="top">
          <Link className="mono" href="/" aria-label="Kivora, accueil">K</Link>
          <nav aria-label="Accès">
            <Link className="link hide-s" href="#comment">Comment ça marche</Link>
            <Link className="link hide-s" href="/inscription">Je suis créateur</Link>
            <Link className="link" href="/connexion">Connexion</Link>
            <Link className="btn" href="/marques">Accès marques <Arr /></Link>
          </nav>
        </div>
        <Wordmark />
        <div className="under say">
          <div className="pitch">
            <p className="rate"><span className="dot" aria-hidden="true" /> Des créateurs marocains vérifiés, sélectionnés un par un</p>
            <p className="claim">La plateforme UGC n°1 au Maroc</p>
            <p className="sub">Nous te mettons en relation avec les meilleurs créateurs pour que tu ne perdes plus de temps avec de l’UGC qui ne convertit pas.</p>
          </div>
          <div className="side-cta">
            <ul className="proof">
              <li><span className="ic" aria-hidden="true"><IcVideo /></span>Les créateurs affichent leurs prix</li>
              <li><span className="ic" aria-hidden="true"><IcUser /></span>Créateurs vérifiés dans tout le Maroc</li>
              <li><span className="ic" aria-hidden="true"><IcShield /></span>Droits d’usage publicitaire à vie</li>
            </ul>
            <div className="ctas">
              <Link className="btn" href="/marques">Trouver mon créateur <Arr /></Link>
              <a className="btn ghost" href={demo} {...(WHATSAPP ? { target: '_blank', rel: 'noopener' } : {})}>Réserver une démo</a>
            </div>
          </div>
        </div>
        <div className="wall" aria-label="Exemples de formats de vidéos"><div className="wall-track">{wall}{wall}</div></div>
      </header>

      <div className="band ticker" aria-label="Formats proposés"><div className="track">{tick}{tick}</div></div>

      <section className="band on-forest how" id="comment" aria-labelledby="h-how">
        <div className="how-head rv"><h2 id="h-how">Votre vidéo en 4 étapes</h2><p>Gratuit pour chercher. Vous ne payez qu’au moment de réserver, et le créateur n’est payé qu’une fois votre vidéo validée.</p></div>
        <Steps />
        <div className="trust rv">
          <p><b>Satisfait ou remboursé.</b> Si la vidéo ne respecte pas le tarif réservé, vous êtes remboursé.</p>
          <p><b>Payé à la validation.</b> Le créateur reçoit son argent quand vous validez, pas avant.</p>
          <p><b>Droits à vie.</b> Chaque vidéo achetée est à vous, pour toutes vos publicités.</p>
        </div>
      </section>

      <section className="band on-white forcreators" aria-labelledby="h-cr">
        <div className="rv">
          <h2 id="h-cr">Tu crées du contenu ? Fixe ton prix.</h2>
          <p>Kivora ouvre aux marques marocaines. Préinscris-toi maintenant pour faire partie des premiers créateurs vérifiés : tu fixes ton prix, les marques réservent, tu es payé à la validation.</p>
          {count >= 50 ? <p className="small">{count.toLocaleString('fr-FR')} créateurs déjà préinscrits.</p> : null}
          <Link className="btn ink big" href="/inscription">Je me préinscris <Arr /></Link>
        </div>
        <div className="ratecard rv" aria-label="Exemple de prix et d’options">
          <div className="h"><span className="ava" style={{ background: '#e0527a' }}>S</span><span><b>Ton prix</b><span>Exemple · un prix, des options</span></span></div>
          <div className="r"><span>Vidéo UGC<small>ton prix unique</small></span><b>650 DH</b></div>
          <div className="r"><span>Option : rushes bruts<small>s’ajoute au prix</small></span><b>+ 100 DH</b></div>
          <div className="r"><span>Option : diffusion depuis ton compte<small>s’ajoute au prix</small></span><b>+ 250 DH</b></div>
        </div>
      </section>

      <section className="band on-black names" aria-labelledby="h-feat">
        <h2 id="h-feat" className="rv"><span>Tout est inclus</span></h2>
        <Feats />
      </section>

      <section className="band on-forest faq" id="questions" aria-labelledby="h-faq">
        <div className="qa head"><h3 id="h-faq">Questions fréquentes</h3></div>
        {FAQ.map((q) => <div className="qa rv" key={q[0]}><h3>{q[0]}</h3><p>{q[1]}</p></div>)}
      </section>

      <section className="band on-white cta" aria-labelledby="h-cta">
        <h2 id="h-cta"><span className="l"><span>Choisissez.</span></span><span className="l"><span>Réservez.</span></span></h2>
        <div className="base"><p>Les premières marques accèdent au catalogue sur invitation. Demandez votre accès, on vous recontacte sous 24 h.</p><Link className="btn ink big" href="/marques">Demander mon accès <Arr /></Link></div>
      </section>
      <Footer />
    </main>
  );
}
