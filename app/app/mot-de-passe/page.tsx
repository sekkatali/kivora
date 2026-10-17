'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { frError } from '@/lib/data';

export default function NewPassword() {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr('8 caractères minimum.');
    setBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(frError(error.message));
    router.replace('/espace');
  }
  return (
    <main className="band on-forest" style={{ minHeight: '100svh' }}>
      <div className="top"><Link className="wordmark" href="/"><span className="mono" aria-hidden="true">K</span>KIVORA</Link></div>
      <div className="narrow">
        <form className="formcard" onSubmit={submit} noValidate>
          <h2>Nouveau mot de passe</h2>
          <label className="f"><span>Mot de passe</span><input type="password" autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} autoFocus /></label>
          {err ? <p className="err" role="alert">{err}</p> : null}
          <button className="btn ink big" disabled={busy}>{busy ? '…' : 'Enregistrer'}</button>
        </form>
      </div>
    </main>
  );
}
