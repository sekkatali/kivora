'use client';
import { useState } from 'react';

const FEATS: [string, string, [string, string][]][] = [
  ['Pour les marques', 'Chaque vidéo validée donne une licence publicitaire à vie, sur tous vos canaux.', [
    ['Catalogue filtrable', 'Ville, langue, niche, prix : le catalogue se resserre à chaque filtre.'],
    ['Grilles de tarifs publiques', 'Chaque créateur affiche ses prix. Pas de devis à attendre.'],
    ['Total exact avant paiement', 'Vous voyez le montant final avant de payer, sans surprise.'],
    ['Paiement retenu', 'Votre argent est bloqué jusqu’à votre validation.'],
    ['Deux révisions', 'Commentaires horodatés directement sur la vidéo.'],
    ['Droits pub à vie', 'Contrat de cession signé à chaque réservation.'],
    ['Facture avec ICE', 'Une facture conforme pour chaque réservation.']]],
  ['Kivora Pro', 'Kivora Pro relie vos comptes publicitaires et classe les créateurs selon vos ventes.', [
    ['Résultats pub par vidéo', 'Hook rate, CTR et coût par vente remontés de Meta et TikTok Ads.'],
    ['Classement selon vos ventes', 'Les créateurs qui vendent pour vous passent en tête.'],
    ['Partnership et Spark Ads', 'La vidéo tourne depuis le compte du créateur, avec son nom.'],
    ['Sous-titres darija', 'Sous-titres et formats 9:16, 4:5 et 1:1.'],
    ['Plusieurs utilisateurs', 'Votre équipe marketing partage le même espace.'],
    ['Espace agence', 'Un espace par client, validation par le client.']]],
  ['Pour les créateurs', 'Inscription gratuite. Le créateur fixe son prix et il est payé dès la validation.', [
    ['Ta grille, tes prix', 'Tu publies tes tarifs et tu les changes quand tu veux.'],
    ['Payé à la validation', 'Virement dès que la marque valide ta vidéo.'],
    ['Profil vérifié', 'Les marques réservent en confiance un profil contrôlé par l’équipe.'],
    ['Factures automatiques', 'Une facture à ton nom par marque.'],
    ['Mise en avant', 'Passe en tête de ta catégorie pendant une semaine.'],
    ['Parrainage', 'Invite d’autres créateurs avec ton lien personnel.']]],
];

export default function Feats() {
  const [on, setOn] = useState('0-0');
  const [g, i] = on.split('-').map(Number);
  return (
    <div className="ncols">
      {FEATS.map((grp, gi) => (
        <div className="ncol rv" key={grp[0]}>
          <span className="g">{grp[0]}</span>
          {grp[2].map((f, fi) => {
            const id = `${gi}-${fi}`;
            return <button key={id} className={on === id ? 'on' : ''} onMouseEnter={() => setOn(id)} onFocus={() => setOn(id)} onClick={() => setOn(id)}>{f[0]}</button>;
          })}
          <p className="sum">{grp[1]}</p>
        </div>
      ))}
      <p className="ndesc" aria-live="polite">{FEATS[g][2][i][1]}</p>
    </div>
  );
}
