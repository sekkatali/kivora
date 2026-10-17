import Link from 'next/link';

export default function AppBar({ label, email }: { label: string; email?: string | null }) {
  return (
    <header className="appbar">
      <Link className="wordmark" href="/"><span className="mono" aria-hidden="true">K</span>KIVORA</Link>
      <span className="tag">{label}</span>
      <span className="sp" />
      {email ? <span className="who">{email}</span> : null}
      <form action="/deconnexion" method="post"><button className="btn sm quiet">Déconnexion</button></form>
    </header>
  );
}
