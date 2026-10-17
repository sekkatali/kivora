import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Connexion', robots: { index: false } };

export default function Connexion() {
  return (
    <main className="band on-forest" style={{ minHeight: '100svh' }}>
      <div className="top"><Link className="wordmark" href="/"><span className="mono" aria-hidden="true">K</span>KIVORA</Link></div>
      <div className="narrow"><Suspense><LoginForm /></Suspense></div>
    </main>
  );
}
