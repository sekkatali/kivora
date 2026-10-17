import type { Metadata } from 'next';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata: Metadata = { title: 'Données personnelles' };

/* À compléter avant la mise en ligne : raison sociale, adresse, RC, numéro de déclaration CNDP. */
export default function Confidentialite() {
  return (
    <main>
      <section className="band on-forest">
        <div className="top"><Link className="wordmark" href="/"><span className="mono" aria-hidden="true">K</span>KIVORA</Link></div>
        <article className="prose">
          <h1>Données personnelles</h1>
          <p>Kivora traite les informations que vous saisissez sur ce site conformément à la loi n° 09-08 relative à la protection des personnes physiques à l’égard du traitement des données à caractère personnel.</p>
          <h2>Responsable du traitement</h2>
          <p>[Raison sociale], [forme juridique] au capital de [montant] DH, [adresse], RC [numéro]. Contact : [adresse e-mail].</p>
          <h2>Données collectées et finalités</h2>
          <ul>
            <li>Créateurs : identité, ville, numéro WhatsApp, comptes Instagram et TikTok, liens vers des vidéos, tarifs, statut d’auto-entrepreneur. Finalité : étudier le profil, le présenter aux marques une fois vérifié, organiser les collaborations et les paiements.</li>
            <li>Marques : nom de la marque, contact, téléphone, secteur, budget indicatif, ICE. Finalité : ouvrir l’accès au catalogue, organiser les réservations et la facturation.</li>
            <li>Mesure d’audience publicitaire : source de la visite (paramètres UTM) et, si activé, pixel Meta, pour mesurer l’efficacité de nos campagnes.</li>
          </ul>
          <h2>Destinataires</h2>
          <p>L’équipe Kivora. Les marques actives voient uniquement le prénom, l’initiale du nom, la ville, les langues, les niches, les réseaux, la présentation et la grille de tarifs des créateurs vérifiés ; jamais leur téléphone ni leur e-mail. Hébergement : Supabase (Union européenne) et Vercel.</p>
          <h2>Durée de conservation</h2>
          <p>Tant que le compte est actif, puis 3 ans après le dernier contact, sauf obligation légale (facturation : 10 ans).</p>
          <h2>Vos droits</h2>
          <p>Vous pouvez accéder à vos données, les rectifier, vous opposer à leur traitement ou demander leur suppression en écrivant à [adresse e-mail]. Vous pouvez aussi saisir la CNDP (www.cndp.ma).</p>
          <p>Ce traitement a fait l’objet d’une déclaration auprès de la CNDP sous le n° [à compléter].</p>
        </article>
      </section>
      <Footer />
    </main>
  );
}
