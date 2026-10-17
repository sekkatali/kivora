import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="band on-black foot">
      <div className="wm" aria-hidden="true">KIVORA</div>
      <div className="rowf">
        <div className="places">{['Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Agadir'].map((c) => <span key={c}>{c}</span>)}</div>
        <div className="lk">
          <div><b>Marques</b><Link href="/marques">Accès anticipé</Link><Link href="/#comment">Comment ça marche</Link></div>
          <div><b>Créateurs</b><Link href="/inscription">Préinscription</Link><Link href="/connexion">Mon espace</Link></div>
          <div><b>Kivora</b><Link href="/#questions">Questions</Link><Link href="/confidentialite">Confidentialité</Link></div>
        </div>
      </div>
      <div className="legal"><span>© {new Date().getFullYear()} Kivora · Maroc</span><Link href="/confidentialite">Données personnelles</Link></div>
    </footer>
  );
}
