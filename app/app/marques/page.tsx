import type { Metadata } from 'next';
import Link from 'next/link';
import BrandSignup from '@/components/BrandSignup';
import Footer from '@/components/Footer';
import { IcVideo, IcUser, IcShield } from '@/components/Icons';

export const metadata: Metadata = {
  title: 'Accès anticipé marques',
  description: 'Réservez des vidéos UGC auprès de créateurs marocains vérifiés, au prix qu’ils affichent. Demandez votre accès.',
};

export default function Marques() {
  return (
    <main>
      <section className="band on-forest" id="top">
        <div className="top">
          <Link className="wordmark" href="/" aria-label="Kivora, accueil"><span className="mono" aria-hidden="true">K</span>KIVORA</Link>
          <nav aria-label="Accès"><Link className="link hide-s" href="/inscription">Je suis créateur</Link><Link className="link" href="/connexion">Se connecter</Link></nav>
        </div>
        <div className="join">
          <div className="say join-head">
            <p className="pitch"><span className="rate"><span className="dot" aria-hidden="true" /> Accès anticipé · places limitées</span></p>
            <h1 style={{ marginTop: 18 }}>La plateforme UGC n°1<span className="wh">au Maroc.</span></h1>
            <p className="lead">Nous te mettons en relation avec les meilleurs créateurs pour que tu ne perdes plus de temps avec de l’UGC qui ne convertit pas.</p>
          </div>
          <div className="join-more">
            <ul className="proof">
              <li><span className="ic" aria-hidden="true"><IcVideo /></span>Le prix est affiché, vous réservez en un clic</li>
              <li><span className="ic" aria-hidden="true"><IcUser /></span>Créateurs vérifiés, en darija et en français</li>
              <li><span className="ic" aria-hidden="true"><IcShield /></span>Droits d’usage publicitaire à vie</li>
            </ul>
          </div>
          <div className="join-card"><BrandSignup /></div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
