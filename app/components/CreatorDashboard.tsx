'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CITIES, NICHES, LANGUAGES, frError, dh, WHATSAPP } from '@/lib/data';
import { cleanHandle, cleanPhone, phoneOk } from './CreatorSignup';
import { OPTIONS } from '@/lib/i18n';

type Creator = {
  id: string; first_name: string; last_name: string; phone: string | null; city: string | null; languages: string[]; niches: string[];
  instagram: string | null; tiktok: string | null; followers: number | null; portfolio_url: string | null; desired_rate: number | null;
  ae_status: string | null; bio: string | null; status: 'pending' | 'approved' | 'rejected'; admin_note: string | null; referral_code: string | null;
};
type Pkg = { id: string; title: string; description: string | null; price_mad: number; active: boolean; archived?: boolean; position: number; option_key: string | null };

const STATUS = {
  pending: { ic: '…', t: 'Profil en cours de vérification', d: 'L’équipe regarde ton profil. Complète-le pour passer plus vite : un lien vers tes vidéos et tes options.' },
  approved: { ic: '✓', t: 'Profil vérifié', d: 'Tu fais partie des créateurs Kivora. Ton profil sera visible des marques dès l’ouverture du catalogue.' },
  rejected: { ic: '!', t: 'Profil non retenu pour l’instant', d: 'Ajoute de nouvelles vidéos et mets ton profil à jour : on pourra le revoir.' },
};

export default function CreatorDashboard({ creator, packages, referrals }: { creator: Creator; packages: Pkg[]; referrals: number }) {
  const supabase = useMemo(() => createClient(), []);
  const [c, setC] = useState(creator);
  const [saved, setSaved] = useState(creator);
  const [pk, setPk] = useState<Pkg[]>(packages);
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);

  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };
  const set = <K extends keyof Creator>(k: K, v: Creator[K]) => { setC((x) => ({ ...x, [k]: v })); setErr(''); };
  const toggle = (k: 'niches' | 'languages', v: string, max = 9) =>
    set(k, c[k].includes(v) ? c[k].filter((x) => x !== v) : c[k].length >= max ? c[k] : [...c[k], v]);
  const dirty = JSON.stringify(c) !== JSON.stringify(saved);


  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (c.first_name.trim().length < 2) return setErr('Indique ton prénom.');
    if (c.phone && !phoneOk(c.phone)) return setErr('Numéro WhatsApp invalide.');
    if (!c.niches.length) return setErr('Choisis au moins une niche.');
    if (c.portfolio_url && !/^https?:\/\/\S+\.\S+/.test(c.portfolio_url.trim())) return setErr('Le lien portfolio doit commencer par https://');
    setBusy(true);
    const patch = {
      first_name: c.first_name.trim(), last_name: c.last_name.trim(), phone: c.phone ? cleanPhone(c.phone) : null, city: c.city,
      languages: c.languages, niches: c.niches, instagram: c.instagram ? cleanHandle(c.instagram) : null, tiktok: c.tiktok ? cleanHandle(c.tiktok) : null,
      followers: c.followers == null || Number.isNaN(Number(c.followers)) ? null : Math.round(Number(c.followers)),
      portfolio_url: c.portfolio_url?.trim() || null, ae_status: c.ae_status, bio: c.bio?.trim().slice(0, 600) || null,
    };
    const { error } = await supabase.from('creators').update(patch).eq('id', c.id);
    setBusy(false);
    if (error) return setErr(frError(error.message));
    const next = { ...c, ...patch } as Creator;
    setC(next); setSaved(next); say('Profil enregistré');
  }

  type O = { on: boolean; price: string };
  const initOpts = () => Object.fromEntries(OPTIONS.map((o) => {
    const row = pk.find((p) => p.option_key === o.key && !p.archived);
    return [o.key, { on: !!row?.active, price: String(row?.price_mad ?? o.suggest) }];
  })) as Record<string, O>;
  const [price, setPrice] = useState(String(c.desired_rate ?? ''));
  const [opts, setOpts] = useState<Record<string, O>>(initOpts);
  const [savedP, setSavedP] = useState(() => JSON.stringify({ price: String(c.desired_rate ?? ''), opts: initOpts() }));
  const [pErr, setPErr] = useState('');
  const [busyP, setBusyP] = useState(false);
  const priceDirty = JSON.stringify({ price, opts }) !== savedP;
  const setOpt = (k: string, patch: Partial<O>) => { setOpts((x) => ({ ...x, [k]: { ...x[k], ...patch } })); setPErr(''); };
  const okPrice = (v: string) => { const n = Number(v); return Number.isFinite(n) && n >= 50 && n <= 100000; };

  async function savePricing() {
    if (!okPrice(price)) return setPErr('Prix entre 50 et 100 000 DH.');
    if (OPTIONS.some((o) => opts[o.key].on && !okPrice(opts[o.key].price))) return setPErr('Prix d’option entre 50 et 100 000 DH.');
    setBusyP(true);
    const rate = Math.round(Number(price));
    const { error } = await supabase.from('creators').update({ desired_rate: rate }).eq('id', c.id);
    if (error) { setBusyP(false); return setPErr(frError(error.message)); }
    const rows = OPTIONS.map((o, i) => ({ o, i })).filter(({ o }) => opts[o.key].on || pk.some((p) => p.option_key === o.key))
      .map(({ o, i }) => ({ creator_id: c.id, option_key: o.key, title: o.fr[0], description: o.fr[1], price_mad: okPrice(opts[o.key].price) ? Math.round(Number(opts[o.key].price)) : o.suggest, active: opts[o.key].on, archived: false, position: i }));
    if (rows.length) {
      const { data, error: e2 } = await supabase.from('creator_packages').upsert(rows, { onConflict: 'creator_id,option_key' }).select();
      if (e2) { setBusyP(false); return setPErr(frError(e2.message)); }
      setPk((l) => [...l.filter((p) => !p.option_key), ...((data as Pkg[]) || [])]);
    }
    setBusyP(false);
    setC((x) => ({ ...x, desired_rate: rate })); setSaved((x) => ({ ...x, desired_rate: rate }));
    setSavedP(JSON.stringify({ price, opts })); say('Prix enregistré');
  }

  const checks = [
    ['Tes réseaux renseignés', !!(c.instagram || c.tiktok)],
    ['Un lien vers tes vidéos', !!c.portfolio_url],
    ['Une présentation de 2 lignes', (c.bio || '').trim().length >= 40],
    ['Ton prix et au moins une option', !!c.desired_rate && Object.values(opts).some((o) => o.on)],
    ['Ton statut auto-entrepreneur', c.ae_status === 'oui' || c.ae_status === 'en_cours'],
  ] as const;
  const score = checks.filter((x) => x[1]).length;

  const link = origin && c.referral_code ? `${origin}/?ref=${c.referral_code}` : '';
  const st = STATUS[c.status];

  return (
    <main className="appwrap">
      <div className="apphead"><h1>Salut {c.first_name || 'toi'}</h1><p>Ton espace créateur : ton profil, ton prix, tes options et ton lien de parrainage.</p></div>
      <div className={`status ${c.status}`}>
        <span className="ic" aria-hidden="true">{st.ic}</span>
        <div><b>{st.t}</b><p>{st.d}</p>{c.admin_note ? <p style={{ marginTop: 6 }}><b style={{ display: 'inline', fontSize: 'inherit' }}>Message de l’équipe :</b> {c.admin_note}</p> : null}</div>
      </div>

      <div className="cols">
        <div style={{ display: 'grid', gap: 22, minWidth: 0 }}>
          <section className="panel" aria-labelledby="h-grid">
            <div className="ph"><h2 id="h-grid">Mon prix</h2>{priceDirty ? <button type="button" className="btn sm ink" onClick={savePricing} disabled={busyP}>{busyP ? 'Enregistrement…' : 'Enregistrer'}</button> : <span className="tag good">Enregistré</span>}</div>
            <p className="small" style={{ color: 'var(--muted)' }}>Un seul prix pour une vidéo UGC (jusqu’à 30 secondes, deux révisions incluses). Les options s’ajoutent à ce prix quand la marque les choisit.</p>
            <label className="f"><span className="sr">Prix d’une vidéo</span>
              <span className="rate-in"><input type="number" inputMode="numeric" min={50} max={100000} value={price} onChange={(e) => setPrice(e.target.value)} /><span>DH</span></span></label>
            <div className="f"><span>Mes options</span>
              <div className="optlist">
                {OPTIONS.map((o) => {
                  const v = opts[o.key];
                  return (
                    <div key={o.key} className={`optrow${v.on ? ' on' : ''}`}>
                      <label className="optcheck"><input type="checkbox" checked={v.on} onChange={(e) => setOpt(o.key, { on: e.target.checked })} />
                        <span><b>{o.fr[0]}</b><small>{o.fr[1]}</small></span></label>
                      {v.on ? <label className="optprice"><span aria-hidden="true">+</span><input type="number" inputMode="numeric" min={50} aria-label={`${o.fr[0]} : prix`} value={v.price} onChange={(e) => setOpt(o.key, { price: e.target.value })} /><span>DH</span></label> : null}
                    </div>
                  );
                })}
              </div>
            </div>
            {pErr ? <p className="err" role="alert">{pErr}</p> : null}
          </section>

          <form className="panel" onSubmit={saveProfile} aria-labelledby="h-prof" noValidate>
            <div className="ph"><h2 id="h-prof">Mon profil</h2></div>
            <div className="fields two">
              <label className="f"><span>Prénom</span><input value={c.first_name} onChange={(e) => set('first_name', e.target.value)} /></label>
              <label className="f"><span>Nom</span><input value={c.last_name} onChange={(e) => set('last_name', e.target.value)} /></label>
              <label className="f"><span>Ville</span><select value={c.city || ''} onChange={(e) => set('city', e.target.value)}><option value="">Choisir…</option>{CITIES.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="f"><span>WhatsApp</span><input type="tel" value={c.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
            </div>
            <div className="f"><span>Niches <em>(3 maximum)</em></span><div className="pills">{NICHES.map((n) => <button type="button" key={n} className="pill" aria-pressed={c.niches.includes(n)} onClick={() => toggle('niches', n, 3)}>{n}</button>)}</div></div>
            <div className="f"><span>Langues</span><div className="pills">{LANGUAGES.map((n) => <button type="button" key={n} className="pill" aria-pressed={c.languages.includes(n)} onClick={() => toggle('languages', n)}>{n}</button>)}</div></div>
            <div className="fields two">
              <label className="f"><span>Instagram</span><input value={c.instagram || ''} onChange={(e) => set('instagram', e.target.value)} /></label>
              <label className="f"><span>TikTok</span><input value={c.tiktok || ''} onChange={(e) => set('tiktok', e.target.value)} /></label>
              <label className="f"><span>Abonnés</span><input type="number" inputMode="numeric" value={c.followers ?? ''} onChange={(e) => set('followers', e.target.value === '' ? null : Number(e.target.value))} /></label>
              <label className="f"><span>Auto-entrepreneur</span><select value={c.ae_status || ''} onChange={(e) => set('ae_status', e.target.value || null)}>
                <option value="">Choisir…</option><option value="oui">Oui</option><option value="en_cours">En cours</option><option value="non">Pas encore</option></select></label>
            </div>
            <label className="f"><span>Lien vers tes vidéos</span><input type="url" placeholder="https://" value={c.portfolio_url || ''} onChange={(e) => set('portfolio_url', e.target.value)} /><small>Drive, TikTok ou Instagram : 2 ou 3 vidéos face caméra.</small></label>
            <label className="f"><span>Présentation</span><textarea maxLength={600} placeholder="Ce que tu filmes le mieux, ton style, ton matériel…" value={c.bio || ''} onChange={(e) => set('bio', e.target.value)} /></label>
            {err ? <p className="err" role="alert">{err}</p> : null}
            <button className="btn ink" disabled={!dirty || busy} style={{ justifySelf: 'start' }}>{busy ? 'Enregistrement…' : dirty ? 'Enregistrer' : 'Enregistré'}</button>
          </form>
        </div>

        <aside style={{ display: 'grid', gap: 22, minWidth: 0 }}>
          <section className="panel" aria-labelledby="h-chk">
            <div className="ph"><h2 id="h-chk">Profil complet à {Math.round((score / checks.length) * 100)} %</h2></div>
            <div className="meter"><i style={{ width: `${(score / checks.length) * 100}%` }} /></div>
            <ul className="checklist">{checks.map(([l, ok]) => <li key={l} className={ok ? 'ok' : ''}><i aria-hidden="true" />{l}</li>)}</ul>
          </section>
          <section className="panel" aria-labelledby="h-ref">
            <div className="ph"><h2 id="h-ref">Parrainage</h2><span className="tag good">{referrals} filleul{referrals > 1 ? 's' : ''}</span></div>
            <p className="small" style={{ color: 'var(--muted)' }}>Partage ton lien à d’autres créateurs. Les profils parrainés et leurs parrains passent en priorité à l’ouverture.</p>
            {link ? <div className="copy"><code>{link}</code><button type="button" className="btn sm ink" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); }}>{copied ? 'Copié' : 'Copier'}</button></div> : null}
          </section>
          <section className="panel" aria-labelledby="h-help">
            <h2 id="h-help">Ce que voit une marque</h2>
            <p className="small" style={{ color: 'var(--muted)' }}>Vidéo à {dh(c.desired_rate)}{Object.values(opts).some((o) => o.on) ? `, options de ${dh(Math.min(...Object.values(opts).filter((o) => o.on).map((o) => Number(o.price) || 0)))} à ${dh(Math.max(...Object.values(opts).filter((o) => o.on).map((o) => Number(o.price) || 0)))}` : ', sans option'}. Tu peux changer ton prix quand tu veux.</p>
            {WHATSAPP ? <a className="btn quiet sm" style={{ justifySelf: 'start' }} href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener">Une question ? WhatsApp</a> : null}
          </section>
        </aside>
      </div>
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </main>
  );
}
