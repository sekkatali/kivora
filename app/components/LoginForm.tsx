'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { frError } from '@/lib/data';
import { LAUNCH } from '@/lib/launch';
import { Arr } from './Icons';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(params.get('erreur') ? 'Le lien a expiré ou a déjà servi. Connecte-toi ou demande un nouveau lien.' : '');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setOk('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr('Adresse e-mail invalide.');
    setBusy(true);
    const supabase = createClient();
    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/callback?suite=/mot-de-passe`,
      });
      setBusy(false);
      if (error) return setErr(frError(error.message));
      return setOk('Si un compte existe avec cette adresse, un lien pour changer le mot de passe vient d’être envoyé.');
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) return setErr(frError(error.message));
    const suite = params.get('suite');
    router.replace(suite && suite.startsWith('/') && !suite.startsWith('//') ? suite : '/espace');
    router.refresh();
  }

  return (
    <form className="formcard" onSubmit={submit} noValidate>
      <h2>{mode === 'login' ? 'Connexion' : 'Mot de passe oublié'}</h2>
      <label className="f"><span>E-mail</span><input type="email" autoComplete="email" autoCapitalize="none" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus /></label>
      {mode === 'login' ? (
        <label className="f"><span>Mot de passe</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      ) : null}
      {err ? <p className="err" role="alert">{err}</p> : null}
      {ok ? <p className="okbox" role="status">{ok}</p> : null}
      <button className="btn ink big" disabled={busy}>{busy ? '…' : mode === 'login' ? <>Se connecter <Arr /></> : 'Recevoir le lien'}</button>
      <button type="button" className="link" style={{ justifySelf: 'center', fontSize: 14 }} onClick={() => { setMode(mode === 'login' ? 'reset' : 'login'); setErr(''); setOk(''); }}>
        {mode === 'login' ? 'Mot de passe oublié ?' : 'Retour à la connexion'}
      </button>
      <div className="chooser" style={LAUNCH ? { gridTemplateColumns: '1fr' } : undefined}>
        <Link href="/"><b>Pas encore inscrit ?</b><span>Préinscris-toi gratuitement</span></Link>
        {LAUNCH ? null : <Link href="/marques"><b>Marque ?</b><span>Demandez votre accès</span></Link>}
      </div>
    </form>
  );
}
