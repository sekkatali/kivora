'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { readAttribution, track } from '@/lib/track';
import { CITIES, NICHES, LANGUAGES, RATE_HINTS, frError, dh } from '@/lib/data';
import { Arr } from './Icons';

type F = {
  first_name: string; last_name: string; city: string; phone: string;
  niches: string[]; languages: string[]; instagram: string; tiktok: string; followers: string; portfolio_url: string;
  desired_rate: string; ae_status: string; email: string; password: string; consent: boolean;
};
const EMPTY: F = {
  first_name: '', last_name: '', city: '', phone: '', niches: [], languages: [], instagram: '', tiktok: '', followers: '',
  portfolio_url: '', desired_rate: '', ae_status: '', email: '', password: '', consent: false,
};
const DRAFT = 'kivora-draft-creator';
const LABELS = ['Toi', 'Ton contenu', 'Ton prix', 'Ton compte'];

export const cleanHandle = (v: string) =>
  v.trim().replace(/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\/@?/i, '').replace(/^@/, '').replace(/[/?].*$/, '').slice(0, 60);
export const cleanPhone = (v: string) => v.replace(/[\s.\-()]/g, '');
export const phoneOk = (v: string) => /^(?:\+212|00212|0)[5-7]\d{8}$/.test(cleanPhone(v));

export default function CreatorSignup() {
  const [f, setF] = useState<F>(EMPTY);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { confirm: boolean; code?: string }>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { const d = localStorage.getItem(DRAFT); if (d) setF({ ...EMPTY, ...JSON.parse(d), password: '' }); } catch { /* rien */ }
  }, []);
  useEffect(() => {
    try { const { password: _p, ...rest } = f; localStorage.setItem(DRAFT, JSON.stringify(rest)); } catch { /* rien */ }
  }, [f]);

  const set = <K extends keyof F>(k: K, v: F[K]) => { setF((x) => ({ ...x, [k]: v })); setErr(''); };
  const toggle = (k: 'niches' | 'languages', v: string, max = 9) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : f[k].length >= max ? f[k] : [...f[k], v]);

  function check(s: number): string {
    if (s === 0) {
      if (f.first_name.trim().length < 2) return 'Indique ton prénom.';
      if (f.last_name.trim().length < 2) return 'Indique ton nom.';
      if (!f.city) return 'Choisis ta ville.';
      if (!phoneOk(f.phone)) return 'Numéro WhatsApp marocain invalide (ex. 06 12 34 56 78).';
    }
    if (s === 1) {
      if (!f.niches.length) return 'Choisis au moins une niche.';
      if (!f.languages.length) return 'Choisis au moins une langue.';
      if (!cleanHandle(f.instagram) && !cleanHandle(f.tiktok)) return 'Ajoute ton Instagram ou ton TikTok.';
      if (f.portfolio_url && !/^https?:\/\/\S+\.\S+/.test(f.portfolio_url.trim())) return 'Le lien portfolio doit commencer par https://';
    }
    if (s === 2) {
      const r = Number(f.desired_rate);
      if (!r || r < 50 || r > 100000) return 'Indique ton prix pour une vidéo (entre 50 et 100 000 DH).';
      if (!f.ae_status) return 'Dis-nous si tu es auto-entrepreneur.';
    }
    if (s === 3) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return 'Adresse e-mail invalide.';
      if (f.password.length < 8) return 'Mot de passe : 8 caractères minimum.';
      if (!f.consent) return 'Coche la case pour accepter le traitement de tes données.';
    }
    return '';
  }

  function next() {
    const e = check(step);
    if (e) { setErr(e); return; }
    setStep((s) => s + 1);
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (step < 3) { next(); return; }
    const e = check(3);
    if (e) { setErr(e); return; }
    setBusy(true); setErr('');
    const supabase = createClient();
    const attrib = readAttribution();
    const email = f.email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: f.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?suite=/createur`,
        data: {
          role: 'creator',
          first_name: f.first_name.trim(), last_name: f.last_name.trim(), city: f.city,
          phone: cleanPhone(f.phone), niches: f.niches, languages: f.languages,
          instagram: cleanHandle(f.instagram) || null, tiktok: cleanHandle(f.tiktok) || null,
          followers: f.followers ? String(Math.round(Number(f.followers))) : '',
          portfolio_url: f.portfolio_url.trim() || null,
          desired_rate: String(Math.round(Number(f.desired_rate))), ae_status: f.ae_status,
          consent: true, ref: attrib.ref, utm: attrib.utm,
        },
      },
    });
    setBusy(false);
    if (error) { setErr(frError(error.message)); return; }
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setErr('Un compte existe déjà avec cette adresse. Connecte-toi.'); return;
    }
    track('CompleteRegistration', { content_name: 'createur', value: 0, currency: 'MAD' }, email);
    try { localStorage.removeItem(DRAFT); } catch { /* rien */ }
    let code: string | undefined;
    if (data.session) {
      const { data: c } = await supabase.from('creators').select('referral_code').eq('id', data.session.user.id).maybeSingle();
      code = c?.referral_code ?? undefined;
    }
    setDone({ confirm: !data.session, code });
  }

  if (done) {
    const link = done.code ? `${window.location.origin}/inscription?ref=${done.code}` : '';
    return (
      <div className="formcard done" role="status">
        <span className="tag good" style={{ justifySelf: 'start' }}>Préinscription reçue</span>
        <p className="big">Bienvenue, {f.first_name || 'créateur'} !</p>
        {done.confirm ? (
          <p>Dernière étape : clique sur le lien envoyé à <b>{f.email}</b> pour confirmer ton adresse. Pense à regarder dans les spams.</p>
        ) : (
          <p>Ton profil est en cours de vérification. On te contacte sur WhatsApp dès que les marques arrivent.</p>
        )}
        {link ? (<>
          <p className="hint">Invite d’autres créateurs avec ton lien : les profils parrainés passent en priorité.</p>
          <div className="copy"><code>{link}</code>
            <button type="button" className="btn sm ink" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); }}>{copied ? 'Copié' : 'Copier'}</button>
          </div>
          <Link className="btn" href="/createur">Compléter mon profil <Arr /></Link>
        </>) : null}
      </div>
    );
  }

  const rate = Number(f.desired_rate) || 0;
  return (
    <form className="formcard" onSubmit={submit} noValidate>
      <div>
        <div className="stepper" aria-hidden="true">{LABELS.map((l, i) => <i key={l} className={i <= step ? 'on' : ''} />)}</div>
        <p className="stepper-l" style={{ marginTop: 8 }}><span>Étape {step + 1} sur 4 · {LABELS[step]}</span><span>2 minutes</span></p>
      </div>

      {step === 0 && (<>
        <h2>On commence par toi</h2>
        <div className="fields two">
          <label className="f"><span>Prénom</span><input autoComplete="given-name" value={f.first_name} onChange={(e) => set("first_name", e.target.value)} /></label>
          <label className="f"><span>Nom</span><input autoComplete="family-name" value={f.last_name} onChange={(e) => set('last_name', e.target.value)} /></label>
        </div>
        <label className="f"><span>Ville</span>
          <select value={f.city} onChange={(e) => set('city', e.target.value)}>
            <option value="">Choisir…</option>{CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="f"><span>WhatsApp</span><input type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          <small>Pour te prévenir quand une marque te réserve.</small></label>
      </>)}

      {step === 1 && (<>
        <h2>Ton contenu</h2>
        <div className="f"><span>Tes niches <em>(3 maximum)</em></span>
          <div className="pills">{NICHES.map((n) => <button type="button" key={n} className="pill" aria-pressed={f.niches.includes(n)} onClick={() => toggle('niches', n, 3)}>{n}</button>)}</div></div>
        <div className="f"><span>Tu tournes en</span>
          <div className="pills">{LANGUAGES.map((n) => <button type="button" key={n} className="pill" aria-pressed={f.languages.includes(n)} onClick={() => toggle('languages', n)}>{n}</button>)}</div></div>
        <div className="fields two">
          <label className="f"><span>Instagram</span><input placeholder="@toncompte" autoCapitalize="none" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} /></label>
          <label className="f"><span>TikTok</span><input placeholder="@toncompte" autoCapitalize="none" value={f.tiktok} onChange={(e) => set('tiktok', e.target.value)} /></label>
        </div>
        <label className="f"><span>Abonnés <em>(facultatif)</em></span><input type="number" inputMode="numeric" min={0} placeholder="Même 300, c’est bon" value={f.followers} onChange={(e) => set('followers', e.target.value)} />
          <small>Pas besoin d’une grosse audience : les marques achètent ta vidéo, pas tes abonnés.</small></label>
        <label className="f"><span>Lien vers tes vidéos <em>(facultatif)</em></span><input type="url" inputMode="url" placeholder="https://drive.google.com/…" value={f.portfolio_url} onChange={(e) => set('portfolio_url', e.target.value)} />
          <small>2 ou 3 vidéos face caméra, même tournées au téléphone.</small></label>
      </>)}

      {step === 2 && (<>
        <h2>Ton prix pour une vidéo</h2>
        <p className="hint">Une vidéo UGC de 30 secondes, deux révisions incluses. Tu pourras ajouter des packs et changer tes prix plus tard.</p>
        <label className="f"><span className="sr">Prix en dirhams</span>
          <span className="rate-in"><input type="number" inputMode="numeric" min={50} max={100000} placeholder="500" value={f.desired_rate} onChange={(e) => set('desired_rate', e.target.value)} /><span>DH</span></span></label>
        <div className="pills">{RATE_HINTS.map((r) => <button type="button" key={r} className="pill" aria-pressed={rate === r} onClick={() => set('desired_rate', String(r))}>{dh(r)}</button>)}</div>
        <div className="f"><span>Es-tu auto-entrepreneur ?</span>
          <div className="radios">
            {[['oui', 'Oui, j’ai mon statut'], ['en_cours', 'Inscription en cours'], ['non', 'Pas encore']].map(([v, l]) => (
              <label className="radio" key={v}><input type="radio" name="ae" checked={f.ae_status === v} onChange={() => set('ae_status', v)} />{l}</label>
            ))}
          </div>
          <small>Pas obligatoire pour te préinscrire. On t’explique comment l’obtenir en ligne si besoin.</small></div>
      </>)}

      {step === 3 && (<>
        <h2>Crée ton accès</h2>
        <label className="f"><span>E-mail</span><input type="email" autoComplete="email" autoCapitalize="none" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
        <label className="f"><span>Mot de passe</span><input type="password" autoComplete="new-password" minLength={8} value={f.password} onChange={(e) => set('password', e.target.value)} /><small>8 caractères minimum.</small></label>
        <label className="check"><input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} />
          <span>J’accepte que Kivora utilise ces informations pour étudier mon profil et me contacter, conformément à la loi 09-08. <Link className="link" href="/confidentialite" target="_blank">En savoir plus</Link></span></label>
      </>)}

      {err ? <p className="err" role="alert">{err}</p> : null}
      <div className="nav-f">
        {step > 0 ? <button type="button" className="btn quiet" style={{ flex: '0 0 auto' }} onClick={() => { setErr(''); setStep((s) => s - 1); }}>Retour</button> : null}
        <button className="btn ink" disabled={busy}>{step < 3 ? <>Continuer <Arr /></> : busy ? 'Envoi…' : <>Valider ma préinscription <Arr /></>}</button>
      </div>
      <p className="hint" style={{ textAlign: 'center' }}>Déjà inscrit ? <Link className="link" href="/connexion">Se connecter</Link></p>
    </form>
  );
}
