'use client';
import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { readAttribution, track } from '@/lib/track';
import { SECTORS, BUDGETS, frError, WHATSAPP } from '@/lib/data';
import { cleanPhone, phoneOk } from './CreatorSignup';
import { Arr } from './Icons';

export default function BrandSignup() {
  const [f, setF] = useState({ company: '', contact_name: '', phone: '', website: '', sector: '', monthly_budget: '', email: '', password: '', consent: false });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | boolean>(null);
  const set = (k: keyof typeof f, v: string | boolean) => { setF((x) => ({ ...x, [k]: v })); setErr(''); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (f.company.trim().length < 2) return setErr('Indique le nom de votre marque.');
    if (f.contact_name.trim().length < 2) return setErr('Indique votre nom.');
    if (!phoneOk(f.phone)) return setErr('Numéro marocain invalide (ex. 06 12 34 56 78).');
    if (!f.sector) return setErr('Choisissez votre secteur.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setErr('Adresse e-mail invalide.');
    if (f.password.length < 8) return setErr('Mot de passe : 8 caractères minimum.');
    if (!f.consent) return setErr('Cochez la case pour accepter le traitement de vos données.');
    setBusy(true);
    const supabase = createClient();
    const attrib = readAttribution();
    const email = f.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email, password: f.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?suite=/marque`,
        data: {
          role: 'brand', company: f.company.trim(), contact_name: f.contact_name.trim(), phone: cleanPhone(f.phone),
          website: f.website.trim() || null, sector: f.sector, monthly_budget: f.monthly_budget || null, consent: true, utm: attrib.utm,
        },
      },
    });
    setBusy(false);
    if (error) return setErr(frError(error.message));
    if (data.user && data.user.identities && data.user.identities.length === 0) return setErr('Un compte existe déjà avec cette adresse. Connectez-vous.');
    track('Lead', { content_name: 'marque', content_category: f.sector }, email);
    setDone(!data.session);
  }

  if (done !== null) {
    return (
      <div className="formcard done" role="status">
        <span className="tag good" style={{ justifySelf: 'start' }}>Demande reçue</span>
        <p className="big">Merci, {f.contact_name.split(' ')[0]} !</p>
        <p>{f.company} est sur la liste d’accès anticipé. On vous recontacte sous 24 h pour la démo et l’ouverture de votre accès au catalogue.</p>
        {done ? <p className="hint">Confirmez votre adresse avec le lien envoyé à <b>{f.email}</b>.</p> : <Link className="btn ink" href="/marque">Mon espace marque <Arr /></Link>}
        {WHATSAPP ? <a className="btn quiet" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Bonjour, c’est ${f.contact_name} de ${f.company}. Je viens de demander un accès Kivora.`)}`} target="_blank" rel="noopener">Écrire sur WhatsApp</a> : null}
      </div>
    );
  }

  return (
    <form className="formcard" onSubmit={submit} noValidate>
      <h2>Demander un accès</h2>
      <p className="hint">Gratuit. Vous ne payez que les vidéos que vous réservez.</p>
      <div className="fields two">
        <label className="f"><span>Marque</span><input autoComplete="organization" value={f.company} onChange={(e) => set('company', e.target.value)} /></label>
        <label className="f"><span>Votre nom</span><input autoComplete="name" value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} /></label>
      </div>
      <div className="fields two">
        <label className="f"><span>Téléphone</span><input type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></label>
        <label className="f"><span>Site ou Instagram <em>(facultatif)</em></span><input value={f.website} onChange={(e) => set('website', e.target.value)} /></label>
      </div>
      <div className="fields two">
        <label className="f"><span>Secteur</span><select value={f.sector} onChange={(e) => set('sector', e.target.value)}><option value="">Choisir…</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="f"><span>Budget vidéo par mois <em>(facultatif)</em></span><select value={f.monthly_budget} onChange={(e) => set('monthly_budget', e.target.value)}><option value="">Choisir…</option>{BUDGETS.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <label className="f"><span>E-mail professionnel</span><input type="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
      <label className="f"><span>Mot de passe</span><input type="password" autoComplete="new-password" value={f.password} onChange={(e) => set('password', e.target.value)} /><small>8 caractères minimum.</small></label>
      <label className="check"><input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} />
        <span>J’accepte que Kivora utilise ces informations pour me recontacter, conformément à la loi 09-08. <Link className="link" href="/confidentialite" target="_blank">En savoir plus</Link></span></label>
      {err ? <p className="err" role="alert">{err}</p> : null}
      <button className="btn ink big" disabled={busy}>{busy ? 'Envoi…' : <>Demander mon accès <Arr /></>}</button>
      <p className="hint" style={{ textAlign: 'center' }}>Déjà un compte ? <Link className="link" href="/connexion">Se connecter</Link></p>
    </form>
  );
}
