import type { Metadata } from 'next';
import Link from 'next/link';
import CreatorSignup from '@/components/CreatorSignup';
import Reveal from '@/components/Reveal';
import Footer from '@/components/Footer';
import { IcTag, IcCash, IcShield, Arr } from '@/components/Icons';
import { publicCreatorCount } from '@/lib/supabase/public';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Préinscription créateurs',
  description: 'Créateur de contenu au Maroc ? Fixe ton prix, les marques réservent. Préinscris-toi gratuitement sur Kivora.',
};

const FAQ: [string, string][] = [
  ['Faut-il beaucoup d’abonnés ?', 'Non. En UGC, la marque achète ta vidéo et la diffuse depuis ses propres comptes. Ce qui compte : une image nette, un son propre et une façon naturelle de parler du produit.'],
  ['Combien ça coûte ?', 'Rien. L’inscription est gratuite et tu fixes toi-même tes prix.'],
  ['Faut-il être auto-entrepreneur ?', 'Pas pour te préinscrire. Pour être payé, il te faudra un statut ; on t’accompagne pour l’obtenir en ligne.'],
  ['Comment se passe la vérification ?', 'L’équipe regarde tes vidéos et tes comptes, puis valide ton profil. Tu reçois la réponse sur WhatsApp.'],
  ['Quand arrivent les marques ?', 'Les premières marques sont invitées dès que le catalogue compte assez de créateurs vérifiés dans chaque niche. Les préinscrits passent en premier.'],
];

export default async function Inscription() {
  const count = await publicCreatorCount();

  return (
    <main>
      <Reveal />
      <section className="band on-forest" id="top">
        <div className="top">
          <Link className="wordmark" href="/" aria-label="Kivora, accueil"><span className="mono" aria-hidden="true">K</span>KIVORA</Link>
          <nav aria-label="Accès"><Link className="link" href="/connexion">Se connecter</Link></nav>
        </div>
        <div className="join">
          <div className="say join-head">
            <p className="pitch"><span className="rate"><span className="dot" aria-hidden="true" /> Préinscriptions ouvertes · créateurs au Maroc</span></p>
            <h1 style={{ marginTop: 18 }}>Fixe ton prix.<span className="wh">Les marques réservent.</span></h1>
            <p className="lead">Kivora met en relation les créateurs UGC marocains et les marques qui ont besoin de vidéos qui vendent. Préinscris-toi pour faire partie des premiers profils vérifiés.</p>
          </div>
          <div className="join-more">
            <ul className="proof">
              <li><span className="ic" aria-hidden="true"><IcTag /></span>Tu publies ta grille, tu changes tes prix quand tu veux</li>
              <li><span className="ic" aria-hidden="true"><IcCash /></span>Payé dès que la marque valide ta vidéo</li>
              <li><span className="ic" aria-hidden="true"><IcShield /></span>Inscription gratuite, sans engagement</li>
            </ul>
            {count >= 50 ? <p className="count"><b>{count.toLocaleString('fr-FR')}</b> créateurs déjà préinscrits</p> : null}
          </div>
          <div className="join-card"><CreatorSignup /></div>
        </div>
      </section>

      <section className="band on-white sec" aria-labelledby="h-steps">
        <h2 id="h-steps" className="sec-h rv"><span>Comment ça marche pour toi</span></h2>
        <div className="cards3 rv">
          <div><span className="n">1</span><h3>Tu te préinscris</h3><p>Deux minutes : ta ville, tes niches, tes réseaux et ton prix pour une vidéo.</p></div>
          <div><span className="n">2</span><h3>On vérifie ton profil</h3><p>L’équipe regarde tes vidéos. Une fois validé, ton profil apparaît dans le catalogue des marques.</p></div>
          <div><span className="n">3</span><h3>Les marques réservent</h3><p>Elles choisissent un tarif de ta grille, t’envoient le produit, et tu es payé à la validation de la vidéo.</p></div>
        </div>
      </section>

      <section className="band on-forest faq" aria-labelledby="h-faq">
        <div className="qa head"><h3 id="h-faq">Tes questions</h3></div>
        {FAQ.map((q) => <div className="qa rv" key={q[0]}><h3>{q[0]}</h3><p>{q[1]}</p></div>)}
        <a className="btn big" href="#top" style={{ marginTop: 8 }}>Je me préinscris <Arr /></a>
      </section>
      <Footer />
    </main>
  );
}
