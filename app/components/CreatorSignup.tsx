'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { readAttribution, track } from '@/lib/track';
import { CITIES, NICHES, LANGUAGES, RATE_HINTS, frError } from '@/lib/data';
import { T, OPTIONS, label, money, type Lang } from '@/lib/i18n';
import { Arr } from './Icons';

type Opt = { on: boolean; price: string };
type F = {
  first_name: string; last_name: string; city: string; phone: string;
  niches: string[]; languages: string[]; instagram: string; tiktok: string; followers: string; portfolio_url: string;
  desired_rate: string; options: Record<string, Opt>; ae_status: string; email: string; password: string; consent: boolean;
};
const freshOptions = () => Object.fromEntries(OPTIONS.map((o) => [o.key, { on: false, price: String(o.suggest) }])) as Record<string, Opt>;
const EMPTY: F = {
  first_name: '', last_name: '', city: '', phone: '', niches: [], languages: [], instagram: '', tiktok: '', followers: '',
  portfolio_url: '', desired_rate: '', options: freshOptions(), ae_status: '', email: '', password: '', consent: false,
};
const DRAFT = 'kivora-draft-creator';

export const cleanHandle = (v: string) =>
  v.trim().replace(/^https?:\/\/(www\.)?(instagram\.com|tiktok\.com)\/@?/i, '').replace(/^@/, '').replace(/[/?].*$/, '').slice(0, 60);
export const cleanPhone = (v: string) => v.replace(/[\s.\-()]/g, '');
export const phoneOk = (v: string) => /^(?:\+212|00212|0)[5-7]\d{8}$/.test(cleanPhone(v));
const priceOk = (v: string) => { const n = Number(v); return Number.isFinite(n) && n >= 50 && n <= 100000; };

/** Aperçu en direct : la fiche que les marques verront. */
function Preview({ f, step, lang }: { f: F; step: number; lang: Lang }) {
  const t = T[lang].pv;
  const name = f.first_name.trim() || t.name;
  const ini = ((f.first_name.trim()[0] || 'K') + (f.last_name.trim()[0] || '')).toUpperCase();
  const rate = Number(f.desired_rate) || 0;
  const handle = cleanHandle(f.instagram) || cleanHandle(f.tiktok);
  const opts = OPTIONS.filter((o) => f.options[o.key]?.on && priceOk(f.options[o.key].price));
  return (
    <aside className="pv" aria-label={t.cap}>
      <p className="pv-cap">{t.cap}</p>
      <div className="pv-card">
        <div className="pv-reel" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className={`pv-clip c${i}`}><i /></span>)}</div>
        <div className="pv-hd">
          <span className="ava pv-ava">{ini}</span>
          <span className="pv-id">
            <b className={f.first_name ? '' : 'ph'}><bdi>{name}{f.last_name.trim() ? ` ${f.last_name.trim()[0].toUpperCase()}.` : ''}</bdi></b>
            <span className={f.city ? '' : 'ph'}>{f.city ? label('city', f.city, lang) : t.city}{f.languages.length ? ` · ${f.languages.map((l) => label('lang', l, lang)).join('، ')}` : ''}</span>
          </span>
          <span className={`pv-from${rate ? '' : ' ph'}`}>{rate ? money(rate, lang) : t.price}</span>
        </div>
        <div className="pv-chips">
          {(f.niches.length ? f.niches : [t.niche]).map((n) => <span key={n} className={f.niches.length ? '' : 'ph'}>{f.niches.length ? label('niche', n, lang) : n}</span>)}
        </div>
        <div className="pv-rows">
          <div className={rate ? 'on' : ''}><span>{t.video}<small>{t.videoSub}</small></span><b>{rate ? money(rate, lang) : '—'}</b></div>
          {opts.length ? opts.map((o) => (
            <div key={o.key} className="opt"><span>{o[lang][0]}</span><b>+ {money(Number(f.options[o.key].price), lang)}</b></div>
          )) : <div className="opt ph"><span>{t.noOpt}</span><b /></div>}
        </div>
        <div className="pv-ft">
          <span dir="ltr">{handle ? `@${handle}` : '@'}</span>
          <span className="tag warn">{step >= 3 ? t.ready : t.wip}</span>
        </div>
      </div>
    </aside>
  );
}

export default function CreatorSignup({ lang = 'fr' }: { lang?: Lang }) {
  const t = T[lang].f;
  const [f, setF] = useState<F>(EMPTY);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { confirm: boolean; code?: string }>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    try {
      const d = localStorage.getItem(DRAFT);
      if (d) { const v = JSON.parse(d); setF({ ...EMPTY, ...v, options: { ...freshOptions(), ...(v.options || {}) }, password: '' }); }
    } catch { /* rien */ }
  }, []);
  useEffect(() => {
    try { const { password: _p, ...rest } = f; localStorage.setItem(DRAFT, JSON.stringify(rest)); } catch { /* rien */ }
  }, [f]);

  const set = <K extends keyof F>(k: K, v: F[K]) => { setF((x) => ({ ...x, [k]: v })); setErr(''); };
  const toggle = (k: 'niches' | 'languages', v: string, max = 9) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : f[k].length >= max ? f[k] : [...f[k], v]);
  const setOpt = (key: string, patch: Partial<Opt>) => set('options', { ...f.options, [key]: { ...f.options[key], ...patch } });

  function check(s: number): string {
    const e = t.err;
    if (s === 0) {
      if (f.first_name.trim().length < 2) return e.first;
      if (f.last_name.trim().length < 2) return e.last;
      if (!f.city) return e.city;
      if (!phoneOk(f.phone)) return e.wa;
    }
    if (s === 1) {
      if (!f.niches.length) return e.niche;
      if (!f.languages.length) return e.lang;
      if (!cleanHandle(f.instagram) && !cleanHandle(f.tiktok)) return e.social;
      if (f.portfolio_url && !/^https?:\/\/\S+\.\S+/.test(f.portfolio_url.trim())) return e.url;
    }
    if (s === 2) {
      if (!priceOk(f.desired_rate)) return e.price;
      if (OPTIONS.some((o) => f.options[o.key]?.on && !priceOk(f.options[o.key].price))) return e.opt;
      if (!f.ae_status) return e.ae;
    }
    if (s === 3) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return e.email;
      if (f.password.length < 8) return e.pw;
      if (!f.consent) return e.consent;
    }
    return '';
  }

  const top = () => document.getElementById('preinscription')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  function next() {
    const e = check(step);
    if (e) { setErr(e); return; }
    if (step === 0) track('Lead', { content_name: 'createur_etape1', content_category: lang });
    setStep((s) => s + 1); top();
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
    const options = OPTIONS.filter((o) => f.options[o.key]?.on).map((o) => ({ key: o.key, price: String(Math.round(Number(f.options[o.key].price))) }));
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
          desired_rate: String(Math.round(Number(f.desired_rate))), options, ae_status: f.ae_status,
          consent: true, ref: attrib.ref, utm: { ...attrib.utm, lang },
        },
      },
    });
    setBusy(false);
    if (error) { setErr(frError(error.message)); return; }
    if (data.user && data.user.identities && data.user.identities.length === 0) { setErr(t.err.exists); return; }
    track('CompleteRegistration', { content_name: 'createur', content_category: lang, value: 0, currency: 'MAD' }, email);
    try { localStorage.removeItem(DRAFT); } catch { /* rien */ }
    let code: string | undefined;
    if (data.session) {
      const { data: c } = await supabase.from('creators').select('referral_code').eq('id', data.session.user.id).maybeSingle();
      code = c?.referral_code ?? undefined;
    }
    setDone({ confirm: !data.session, code });
    top();
  }

  if (done) {
    const link = done.code && origin ? `${origin}${lang === 'dr' ? '/dr' : '/'}?ref=${done.code}` : '';
    return (
      <div className="signup">
        <div className="formcard done" role="status">
          <span className="tag good" style={{ justifySelf: 'start' }}>{t.done}</span>
          <p className="big">{t.welcome(f.first_name || 'Kivora')}</p>
          <p>{done.confirm ? t.confirm(f.email) : t.review(f.phone)}</p>
          {link ? (<>
            <p className="hint">{t.refHint}</p>
            <div className="copy"><code dir="ltr">{link}</code>
              <button type="button" className="btn sm ink" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); }}>{copied ? t.copied : t.copy}</button>
            </div>
            <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(t.shareText(link))}`} target="_blank" rel="noopener">{t.share}</a>
            <Link className="btn quiet" href="/createur">{t.profile} <Arr /></Link>
          </>) : null}
        </div>
        <Preview f={f} step={4} lang={lang} />
      </div>
    );
  }

  const rate = Number(f.desired_rate) || 0;
  return (
    <div className="signup">
      <form className="formcard" onSubmit={submit} noValidate>
        <div>
          <div className="stepper" aria-hidden="true">{t.steps.map((l, i) => <i key={l} className={i <= step ? 'on' : ''} />)}</div>
          <p className="stepper-l" style={{ marginTop: 8 }}><span>{t.stepOf(step + 1)} · {t.steps[step]}</span><span>{t.minutes}</span></p>
        </div>

        {step === 0 && (<>
          <h2>{t.s0}</h2>
          <div className="fields two">
            <label className="f"><span>{t.first}</span><input autoComplete="given-name" value={f.first_name} onChange={(e) => set('first_name', e.target.value)} /></label>
            <label className="f"><span>{t.last}</span><input autoComplete="family-name" value={f.last_name} onChange={(e) => set('last_name', e.target.value)} /></label>
          </div>
          <label className="f"><span>{t.city}</span>
            <select value={f.city} onChange={(e) => set('city', e.target.value)}>
              <option value="">{t.choose}</option>{CITIES.map((c) => <option key={c} value={c}>{label('city', c, lang)}</option>)}
            </select>
          </label>
          <label className="f"><span>{t.wa}</span><input type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
            <small>{t.waHint}</small></label>
        </>)}

        {step === 1 && (<>
          <h2>{t.s1}</h2>
          <div className="f"><span>{t.niches} <em>{t.max3}</em></span>
            <div className="pills">{NICHES.map((n) => <button type="button" key={n} className="pill" aria-pressed={f.niches.includes(n)} onClick={() => toggle('niches', n, 3)}>{label('niche', n, lang)}</button>)}</div></div>
          <div className="f"><span>{t.langs}</span>
            <div className="pills">{LANGUAGES.map((n) => <button type="button" key={n} className="pill" aria-pressed={f.languages.includes(n)} onClick={() => toggle('languages', n)}>{label('lang', n, lang)}</button>)}</div></div>
          <div className="fields two">
            <label className="f"><span>{t.ig}</span><input dir="ltr" placeholder="@" autoCapitalize="none" value={f.instagram} onChange={(e) => set('instagram', e.target.value)} /></label>
            <label className="f"><span>{t.tt}</span><input dir="ltr" placeholder="@" autoCapitalize="none" value={f.tiktok} onChange={(e) => set('tiktok', e.target.value)} /></label>
          </div>
          <label className="f"><span>{t.followers} <em>{t.optional}</em></span><input type="number" inputMode="numeric" min={0} placeholder={t.followersPh} value={f.followers} onChange={(e) => set('followers', e.target.value)} /></label>
          <label className="f"><span>{t.portfolio} <em>{t.optional}</em></span><input type="url" dir="ltr" inputMode="url" placeholder="https://" value={f.portfolio_url} onChange={(e) => set('portfolio_url', e.target.value)} />
            <small>{t.portfolioHint}</small></label>
        </>)}

        {step === 2 && (<>
          <h2>{t.s2}</h2>
          <p className="hint">{t.priceHint}</p>
          <label className="f"><span className="sr">{t.priceLabel}</span>
            <span className="rate-in"><input type="number" inputMode="numeric" min={50} max={100000} placeholder="500" value={f.desired_rate} onChange={(e) => set('desired_rate', e.target.value)} /><span>{lang === 'dr' ? 'درهم' : 'DH'}</span></span></label>
          <div className="pills">{RATE_HINTS.map((r) => <button type="button" key={r} className="pill" aria-pressed={rate === r} onClick={() => set('desired_rate', String(r))}>{money(r, lang)}</button>)}</div>
          <div className="f"><span>{t.optTitle} <em>{t.optional}</em></span>
            <small style={{ marginTop: -2 }}>{t.optHint}</small>
            <div className="optlist">
              {OPTIONS.map((o) => {
                const v = f.options[o.key];
                return (
                  <div key={o.key} className={`optrow${v.on ? ' on' : ''}`}>
                    <label className="optcheck"><input type="checkbox" checked={v.on} onChange={(e) => setOpt(o.key, { on: e.target.checked })} />
                      <span><b>{o[lang][0]}</b><small>{o[lang][1]}</small></span></label>
                    {v.on ? (
                      <label className="optprice"><span aria-hidden="true">+</span>
                        <input type="number" inputMode="numeric" min={50} aria-label={`${o[lang][0]} : prix`} value={v.price} onChange={(e) => setOpt(o.key, { price: e.target.value })} />
                        <span>{lang === 'dr' ? 'درهم' : 'DH'}</span></label>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="f"><span>{t.ae}</span>
            <div className="radios">
              {t.aeOpts.map(([v, l]) => (
                <label className="radio" key={v}><input type="radio" name="ae" checked={f.ae_status === v} onChange={() => set('ae_status', v)} />{l}</label>
              ))}
            </div>
            <small>{t.aeHint}</small></div>
        </>)}

        {step === 3 && (<>
          <h2>{t.s3}</h2>
          <label className="f"><span>{t.email}</span><input type="email" dir="ltr" autoComplete="email" autoCapitalize="none" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
          <label className="f"><span>{t.pw}</span><input type="password" dir="ltr" autoComplete="new-password" minLength={8} value={f.password} onChange={(e) => set('password', e.target.value)} /><small>{t.pwHint}</small></label>
          <label className="check"><input type="checkbox" checked={f.consent} onChange={(e) => set('consent', e.target.checked)} />
            <span>{t.consent} <Link className="link" href="/confidentialite" target="_blank">{t.more}</Link></span></label>
        </>)}

        {err ? <p className="err" role="alert">{err}</p> : null}
        <div className="nav-f">
          {step > 0 ? <button type="button" className="btn quiet" style={{ flex: '0 0 auto' }} onClick={() => { setErr(''); setStep((s) => s - 1); }}>{t.back}</button> : null}
          <button className="btn ink big" disabled={busy}>{step < 3 ? <>{t.next} <Arr /></> : busy ? t.sending : <>{t.submit} <Arr /></>}</button>
        </div>
        <p className="hint" style={{ textAlign: 'center' }}>{t.has} <Link className="link" href="/connexion">{t.signin}</Link></p>
      </form>
      <Preview f={f} step={step} lang={lang} />
    </div>
  );
}
