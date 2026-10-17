import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="band on-forest" style={{ minHeight: '100svh' }}>
      <div className="top"><Link className="wordmark" href="/"><span className="mono" aria-hidden="true">K</span>KIVORA</Link></div>
      <div className="narrow" style={{ display: 'grid', gap: 20 }}>
        <h1 className="sec-h">Cette page n’existe pas.</h1>
        <Link className="btn" href="/" style={{ justifySelf: 'start' }}>Retour à l’accueil</Link>
      </div>
    </main>
  );
}
