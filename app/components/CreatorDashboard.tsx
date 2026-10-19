'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CITIES, NICHES, LANGUAGES, frError, dh, initials, WHATSAPP } from '@/lib/data';
import { cleanHandle, cleanPhone, phoneOk } from './CreatorSignup';
import { OPTIONS } from '@/lib/i18n';
import BookingCard from './BookingCard';
import { STATUS_LABEL, needsAction, type BookingRequest, type BookingReview } from '@/lib/booking';

type Creator = {
  id: string; first_name: string; last_name: string; phone: string | null; city: string | null; languages: string[]; niches: string[];
  instagram: string | null; tiktok: string | null; followers: number | null; portfolio_url: string | null; desired_rate: number | null;
  ae_status: string | null; bio: string | null; status: 'pending' | 'approved' | 'rejected'; admin_note: string | null; referral_code: string | null;
  created_at?: string; reviewed_at?: string | null;
};
type Pkg = { id: string; title: string; description: string | null; price_mad: number; active: boolean; archived?: boolean; position: number; option_key: string | null };
type O = { on: boolean; price: string };
type Tab = 'accueil' | 'reservations' | 'offre' | 'profil' | 'paiement' | 'parrainage' | 'compte';

const ICON: Record<Tab, React.ReactNode> = {
  accueil: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  reservations: <><path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20" /></>,
  offre: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="8" cy="9" r="1.4" /></>,
  profil: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></>,
  paiement: <><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M3 10h18" /></>,
  parrainage: <><circle cx="8" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M14 15.2c2.6-.5 5 .8 6 3.8" /></>,
  compte: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
};
const TABS: [Tab, string][] = [['accueil', 'Accueil'], ['reservations', 'Réservations'], ['offre', 'Mon offre'], ['profil', 'Profil'], ['paiement', 'Paiement'], ['parrainage', 'Parrainage'], ['compte', 'Compte']];

const STATUS = {
  pending: { ic: '…', t: 'Profil en cours de vérification', d: 'L’équipe regarde tes vidéos et tes réseaux. Un profil complet passe plus vite.' },
  approved: { ic: '✓', t: 'Profil vérifié', d: 'Tu fais partie des créateurs Kivora. Ta fiche sera visible des marques dès l’ouverture du catalogue.' },
  rejected: { ic: '!', t: 'Profil non retenu pour l’instant', d: 'Ajoute de nouvelles vidéos et mets ton profil à jour : on pourra le revoir.' },
};
const okPrice = (v: string) => { const n = Number(v); return Number.isFinite(n) && n >= 50 && n <= 100000; };
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');

function Icon({ tab }: { tab: Tab }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[tab]}</svg>;
}

/** La fiche telle que les marques la verront. */
function Fiche({ c, price, opts }: { c: Creator; price: string; opts: Record<string, O> }) {
  const on = OPTIONS.filter((o) => opts[o.key]?.on && okPrice(opts[o.key].price));
  const handle = c.instagram || c.tiktok;
  return (
    <div className="pv-card" style={{ transform: 'none' }}>
      <div className="pv-hd">
        <span className="ava pv-ava">{initials(c.first_name, c.last_name)}</span>
        <span className="pv-id"><b>{c.first_name || 'Ton prénom'}{c.last_name ? ` ${c.last_name[0].toUpperCase()}.` : ''}</b><span>{c.city || 'Ta ville'}{c.languages.length ? ` · ${c.languages.join(', ')}` : ''}</span></span>
        <span className={`pv-from${okPrice(price) ? '' : ' ph'}`}>{okPrice(price) ? dh(Number(price)) : 'ton prix'}</span>
      </div>
      <div className="pv-chips">{(c.niches.length ? c.niches : ['Ta niche']).map((n) => <span key={n}>{n}</span>)}</div>
      {c.bio ? <p style={{ fontSize: 13, color: '#b5c0b3' }}>{c.bio.length > 140 ? c.bio.slice(0, 140) + '…' : c.bio}</p> : null}
      <div className="pv-rows">
        <div className="on"><span>Vidéo UGC<small>jusqu’à 30 s, 2 révisions</small></span><b>{okPrice(price) ? dh(Number(price)) : '—'}</b></div>
        {on.map((o) => <div key={o.key} className="opt"><span>{o.fr[0]}</span><b>+ {dh(Number(opts[o.key].price))}</b></div>)}
      </div>
      <div className="pv-ft"><span>{handle ? `@${handle}` : 'Ajoute tes réseaux'}</span><span className={`tag ${c.status === 'approved' ? 'good' : 'warn'}`}>{c.status === 'approved' ? 'Vérifié' : 'En vérification'}</span></div>
    </div>
  );
}

export default function CreatorDashboard({ creator, packages, referrals, email, bookings = [], reviews = [], reviewOn = false }: { creator: Creator; packages: Pkg[]; referrals: number; email?: string | null; bookings?: BookingRequest[]; reviews?: BookingReview[]; reviewOn?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTabState] = useState<Tab>('accueil');
  const [c, setC] = useState(creator);
  const [saved, setSaved] = useState(creator);
  const [pk, setPk] = useState<Pkg[]>(packages);
  const [toast, setToast] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const [pw, setPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [bk, setBk] = useState<BookingRequest[]>(bookings);
  const toDo = bk.filter((r) => needsAction(r, 'creator')).length;

  useEffect(() => {
    setOrigin(window.location.origin);
    const read = () => { const h = window.location.hash.slice(1) as Tab; if (TABS.some(([t]) => t === h)) setTabState(h); };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const setTab = (t: Tab) => {
    setTabState(t);
    window.history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  /* ---------- profil ---------- */
  const set = <K extends keyof Creator>(k: K, v: Creator[K]) => { setC((x) => ({ ...x, [k]: v })); setErr(''); };
  const toggle = (k: 'niches' | 'languages', v: string, max = 9) =>
    set(k, c[k].includes(v) ? c[k].filter((x) => x !== v) : c[k].length >= max ? c[k] : [...c[k], v]);
  const profileKeys: (keyof Creator)[] = ['first_name', 'last_name', 'phone', 'city', 'languages', 'niches', 'instagram', 'tiktok', 'followers', 'portfolio_url', 'bio'];
  const profileDirty = profileKeys.some((k) => JSON.stringify(c[k]) !== JSON.stringify(saved[k]));

  async function saveProfile(e?: React.FormEvent) {
    e?.preventDefault();
    if (c.first_name.trim().length < 2) return setErr('Indique ton prénom.');
    if (c.phone && !phoneOk(c.phone)) return setErr('Numéro WhatsApp invalide.');
    if (!c.niches.length) return setErr('Choisis au moins une niche.');
    if (!c.languages.length) return setErr('Choisis au moins une langue.');
    if (c.portfolio_url && !/^https?:\/\/\S+\.\S+/.test(c.portfolio_url.trim())) return setErr('Le lien doit commencer par https://');
    setBusy(true);
    const patch = {
      first_name: c.first_name.trim(), last_name: c.last_name.trim(), phone: c.phone ? cleanPhone(c.phone) : null, city: c.city,
      languages: c.languages, niches: c.niches, instagram: c.instagram ? cleanHandle(c.instagram) : null, tiktok: c.tiktok ? cleanHandle(c.tiktok) : null,
      followers: c.followers == null || Number.isNaN(Number(c.followers)) ? null : Math.round(Number(c.followers)),
      portfolio_url: c.portfolio_url?.trim() || null, bio: c.bio?.trim().slice(0, 600) || null,
    };
    const { error } = await supabase.from('creators').update(patch).eq('id', c.id);
    setBusy(false);
    if (error) return setErr(frError(error.message));
    const next = { ...c, ...patch } as Creator;
    setC(next); setSaved((s) => ({ ...s, ...patch } as Creator)); say('Profil enregistré');
  }

  async function saveAe(v: string) {
    const prev = c.ae_status;
    set('ae_status', v);
    const { error } = await supabase.from('creators').update({ ae_status: v }).eq('id', c.id);
    if (error) { set('ae_status', prev); return say(frError(error.message)); }
    setSaved((s) => ({ ...s, ae_status: v })); say('Statut enregistré');
  }

  /* ---------- offre ---------- */
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
    setSavedP(JSON.stringify({ price, opts })); say('Offre enregistrée');
  }

  /* ---------- compte ---------- */
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setPwMsg('8 caractères minimum.');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setPwMsg(frError(error.message));
    setPw(''); setPwMsg(''); say('Mot de passe changé');
  }

  /* ---------- indicateurs ---------- */
  const onOpts = OPTIONS.filter((o) => opts[o.key].on);
  const checks: { label: string; ok: boolean; tab: Tab }[] = [
    { label: 'Ton prix et au moins une option', ok: !!c.desired_rate && onOpts.length > 0, tab: 'offre' },
    { label: 'Un lien vers 2 ou 3 de tes vidéos', ok: !!c.portfolio_url, tab: 'profil' },
    { label: 'Tes réseaux renseignés', ok: !!(c.instagram || c.tiktok), tab: 'profil' },
    { label: 'Une présentation de 2 lignes', ok: (c.bio || '').trim().length >= 40, tab: 'profil' },
    { label: 'Ton statut auto-entrepreneur', ok: c.ae_status === 'oui' || c.ae_status === 'en_cours', tab: 'paiement' },
    { label: 'Inviter un créateur', ok: referrals > 0, tab: 'parrainage' },
  ];
  const score = Math.round((checks.filter((x) => x.ok).length / checks.length) * 100);
  const link = origin && c.referral_code ? `${origin}/?ref=${c.referral_code}` : '';
  const share = link ? `Je suis sur Kivora, la plateforme UGC au Maroc : tu fixes ton prix et les marques réservent. Préinscris-toi avec mon lien : ${link}` : '';
  const st = STATUS[c.status];
  const dirtyTab: Partial<Record<Tab, boolean>> = { offre: priceDirty, profil: profileDirty };
  const steps = [
    { t: 'Préinscription', d: fmtDate(c.created_at) || 'reçue', done: true },
    { t: 'Vérification', d: c.status === 'pending' ? 'en cours' : c.status === 'approved' ? fmtDate(c.reviewed_at) || 'faite' : 'à revoir', done: c.status === 'approved' },
    { t: 'Visible des marques', d: c.status === 'approved' ? 'à l’ouverture du catalogue' : 'après vérification', done: false },
  ];

  const statusCard = (
    <div className={`status ${c.status}`}>
      <span className="ic" aria-hidden="true">{st.ic}</span>
      <div><b>{st.t}</b><p>{st.d}</p>{c.admin_note ? <p className="note">Message de l’équipe : {c.admin_note}</p> : null}</div>
    </div>
  );
  const timeline = (
    <ol className="tl">{steps.map((s, i) => (
      <li key={s.t} className={s.done ? 'done' : i === steps.findIndex((x) => !x.done) ? 'now' : ''}><i /><b>{s.t}</b><span>{s.d}</span></li>
    ))}</ol>
  );

  return (
    <div className="cd">
      <nav className="cd-nav" role="tablist" aria-label="Espace créateur">
        {TABS.map(([t, l]) => (
          <button key={t} role="tab" aria-selected={tab === t} aria-controls="cd-panel" onClick={() => setTab(t)}>
            <Icon tab={t} /><span>{l}</span>{t === 'reservations' && toDo ? <b className="nb">{toDo}</b> : dirtyTab[t] ? <i className="dot" title="Modifications non enregistrées" /> : null}
          </button>
        ))}
      </nav>

      <main className="cd-main" id="cd-panel" role="tabpanel">
        {tab === 'accueil' && (<>
          <div className="apphead"><h1>Salut {c.first_name || 'toi'}</h1><p>Voici où en est ton profil Kivora.</p></div>
          {statusCard}
          <section className="panel">{timeline}</section>
          <div className="tiles">
            <button className="hi" onClick={() => setTab('offre')}><b>{c.desired_rate ? dh(c.desired_rate) : '—'}</b><span>ton prix · {onOpts.length} option{onOpts.length > 1 ? 's' : ''}</span></button>
            <button onClick={() => setTab('profil')}><b>{score} %</b><span>profil complet</span></button>
            <button onClick={() => setTab('parrainage')}><b>{referrals}</b><span>créateur{referrals > 1 ? 's' : ''} parrainé{referrals > 1 ? 's' : ''}</span></button>
            <button onClick={() => setTab('reservations')}><b>{bk.filter((r) => !['annulee', 'refusee'].includes(r.status)).length}</b><span>réservation{bk.length > 1 ? 's' : ''}{toDo ? ` · ${toDo} à traiter` : ''}</span></button>
          </div>
          <div className="cols">
            <section className="panel" aria-labelledby="h-todo">
              <div className="ph"><h2 id="h-todo">{score === 100 ? 'Ton profil est complet' : 'Pour passer la vérification plus vite'}</h2></div>
              <div className="meter"><i style={{ width: `${score}%` }} /></div>
              <div className="todo">{checks.map((x) => (
                <button key={x.label} className={x.ok ? 'ok' : ''} onClick={() => setTab(x.tab)} disabled={x.ok}>
                  <i aria-hidden="true" /><span>{x.label}</span>{x.ok ? null : <em>Faire →</em>}
                </button>
              ))}</div>
            </section>
            <section className="panel" aria-labelledby="h-res">
              <h2 id="h-res">Tes réservations</h2>
              {bk.length === 0 ? <p className="empty-s">Aucune réservation pour l’instant. Les marques arrivent dès que le catalogue est complet dans ta niche ; tu verras ici chaque demande à accepter.</p>
                : <div className="todo">{bk.slice(0, 3).map((r) => (
                  <button key={r.id} className={needsAction(r, 'creator') ? '' : 'ok'} onClick={() => setTab('reservations')}>
                    <i aria-hidden="true" /><span>{r.brand_company} · {STATUS_LABEL[r.status]} · {dh(r.total_mad)}</span><em>{needsAction(r, 'creator') ? 'À traiter →' : 'Voir →'}</em>
                  </button>))}</div>}
              <h2 style={{ marginTop: 6 }}>Ta fiche</h2>
              <Fiche c={c} price={price} opts={opts} />
            </section>
          </div>
        </>)}

        {tab === 'reservations' && (<>
          <div className="apphead"><h1>Réservations</h1><p>Les demandes des marques : accepte ou refuse, livre ta vidéo et échange avec la marque dans la conversation.</p></div>
          {bk.length === 0 ? <p className="empty">Aucune demande pour l’instant. Dès qu’une marque te choisit, la demande apparaît ici et on te prévient sur WhatsApp.</p>
            : [...bk].sort((x, y) => Number(needsAction(y, 'creator')) - Number(needsAction(x, 'creator'))).map((r) => (
              <BookingCard key={r.id} r={r} role="creator" userId={c.id} supabase={supabase} say={say} review={reviews.find((v) => v.booking_id === r.id) || null} reviewOn={reviewOn} onChange={(n) => setBk((l) => l.map((x) => (x.id === n.id ? n : x)))} />
            ))}
          <p className="small muted">Tu es payé par virement après la validation de la marque. Le paiement passe toujours par Kivora.</p>
        </>)}

        {tab === 'offre' && (<>
          <div className="apphead"><h1>Mon offre</h1><p>Un seul prix pour une vidéo, et les options que tu proposes. Les options s’ajoutent à ton prix quand la marque les choisit.</p></div>
          <div className="cols">
            <section className="panel" aria-labelledby="h-price">
              <div className="ph"><h2 id="h-price">Prix d’une vidéo UGC</h2>{priceDirty ? <span className="tag warn">Non enregistré</span> : <span className="tag good">Enregistré</span>}</div>
              <p className="small muted">Jusqu’à 30 secondes, deux révisions incluses.</p>
              <label className="f"><span className="sr">Prix d’une vidéo</span>
                <span className="rate-in"><input type="number" inputMode="numeric" min={50} max={100000} value={price} onChange={(e) => { setPrice(e.target.value); setPErr(''); }} /><span>DH</span></span></label>
              <div className="pills">{[300, 500, 800, 1200].map((r) => <button type="button" key={r} className="pill" aria-pressed={Number(price) === r} onClick={() => setPrice(String(r))}>{dh(r)}</button>)}</div>
              <h2 style={{ marginTop: 8 }}>Mes options</h2>
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
              {pErr ? <p className="err" role="alert">{pErr}</p> : null}
              <div className="savebar">
                <button type="button" className="btn ink" onClick={savePricing} disabled={!priceDirty || busyP}>{busyP ? 'Enregistrement…' : priceDirty ? 'Enregistrer mon offre' : 'Offre enregistrée'}</button>
                {priceDirty ? <button type="button" className="link" onClick={() => { const v = JSON.parse(savedP); setPrice(v.price); setOpts(v.opts); setPErr(''); }}>Annuler</button> : null}
              </div>
            </section>
            <aside className="sticky-col">
              <p className="small muted">Ce que voit une marque</p>
              <Fiche c={c} price={price} opts={opts} />
              <p className="small muted">Avec toutes tes options, une marque peut réserver jusqu’à <b>{dh((okPrice(price) ? Number(price) : 0) + onOpts.reduce((a, o) => a + (Number(opts[o.key].price) || 0), 0))}</b> pour une vidéo.</p>
            </aside>
          </div>
        </>)}

        {tab === 'profil' && (<>
          <div className="apphead"><h1>Profil et vérification</h1><p>Ce que l’équipe regarde pour valider ton profil, et ce que les marques verront.</p></div>
          {statusCard}
          <section className="panel">
            {timeline}
            <h2 style={{ marginTop: 8 }}>Ce qu’on vérifie</h2>
            <ul className="checklist">
              <li className={c.portfolio_url ? 'ok' : ''}><i aria-hidden="true" />Des vidéos face caméra : image nette, son propre</li>
              <li className={c.instagram || c.tiktok ? 'ok' : ''}><i aria-hidden="true" />Des réseaux actifs, même avec peu d’abonnés</li>
              <li className={(c.bio || '').trim().length >= 40 ? 'ok' : ''}><i aria-hidden="true" />Une présentation claire de ce que tu filmes</li>
              <li className={c.phone ? 'ok' : ''}><i aria-hidden="true" />Un numéro WhatsApp pour te joindre</li>
            </ul>
          </section>
          <form className="panel" onSubmit={saveProfile} noValidate aria-labelledby="h-prof">
            <div className="ph"><h2 id="h-prof">Mes informations</h2>{profileDirty ? <span className="tag warn">Non enregistré</span> : null}</div>
            <div className="fields two">
              <label className="f"><span>Prénom</span><input value={c.first_name} onChange={(e) => set('first_name', e.target.value)} /></label>
              <label className="f"><span>Nom</span><input value={c.last_name} onChange={(e) => set('last_name', e.target.value)} /></label>
              <label className="f"><span>Ville</span><select value={c.city || ''} onChange={(e) => set('city', e.target.value)}><option value="">Choisir…</option>{CITIES.map((x) => <option key={x}>{x}</option>)}</select></label>
              <label className="f"><span>WhatsApp</span><input type="tel" value={c.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
            </div>
            <div className="f"><span>Niches <em>(3 maximum)</em></span><div className="pills">{NICHES.map((n) => <button type="button" key={n} className="pill" aria-pressed={c.niches.includes(n)} onClick={() => toggle('niches', n, 3)}>{n}</button>)}</div></div>
            <div className="f"><span>Langues</span><div className="pills">{LANGUAGES.map((n) => <button type="button" key={n} className="pill" aria-pressed={c.languages.includes(n)} onClick={() => toggle('languages', n)}>{n}</button>)}</div></div>
            <h2 style={{ marginTop: 8 }}>Mes vidéos et réseaux</h2>
            <label className="f"><span>Lien vers tes vidéos</span><input type="url" placeholder="https://" value={c.portfolio_url || ''} onChange={(e) => set('portfolio_url', e.target.value)} /><small>Drive, TikTok ou Instagram : 2 ou 3 vidéos face caméra. C’est ce qui compte le plus pour la vérification.</small></label>
            <div className="fields two">
              <label className="f"><span>Instagram</span><input placeholder="@toncompte" value={c.instagram || ''} onChange={(e) => set('instagram', e.target.value)} /></label>
              <label className="f"><span>TikTok</span><input placeholder="@toncompte" value={c.tiktok || ''} onChange={(e) => set('tiktok', e.target.value)} /></label>
              <label className="f"><span>Abonnés <em>(facultatif)</em></span><input type="number" inputMode="numeric" value={c.followers ?? ''} onChange={(e) => set('followers', e.target.value === '' ? null : Number(e.target.value))} /></label>
            </div>
            <label className="f"><span>Présentation</span><textarea maxLength={600} placeholder="Ce que tu filmes le mieux, ton style, ton matériel…" value={c.bio || ''} onChange={(e) => set('bio', e.target.value)} /><small>{(c.bio || '').length} / 600</small></label>
            {err ? <p className="err" role="alert">{err}</p> : null}
            <div className="savebar">
              <button className="btn ink" disabled={!profileDirty || busy}>{busy ? 'Enregistrement…' : profileDirty ? 'Enregistrer' : 'Enregistré'}</button>
              {profileDirty ? <button type="button" className="link" onClick={() => { setC((x) => ({ ...x, ...Object.fromEntries(profileKeys.map((k) => [k, saved[k]])) })); setErr(''); }}>Annuler</button> : null}
            </div>
          </form>
        </>)}

        {tab === 'paiement' && (<>
          <div className="apphead"><h1>Paiement</h1><p>Comment tu seras payé, et ce qu’il te faut pour l’être.</p></div>
          <section className="panel" aria-labelledby="h-ae">
            <h2 id="h-ae">Ton statut</h2>
            <p className="small muted">Pour être payé, il te faut le statut d’auto-entrepreneur. Il n’est pas obligatoire pour la préinscription.</p>
            <div className="radios">
              {[['oui', 'Oui, j’ai mon statut d’auto-entrepreneur'], ['en_cours', 'Mon inscription est en cours'], ['non', 'Pas encore']].map(([v, l]) => (
                <label className="radio" key={v}><input type="radio" name="ae" checked={c.ae_status === v} onChange={() => saveAe(v)} />{l}</label>
              ))}
            </div>
          </section>
          <div className="cols">
            <section className="panel" aria-labelledby="h-how">
              <h2 id="h-how">Comment tu es payé</h2>
              <ol className="steps-s">
                <li><b>La marque réserve</b><span>ta vidéo au prix que tu as fixé, avec ses options.</span></li>
                <li><b>Tu livres la vidéo</b><span>deux révisions sont incluses si la marque demande un ajustement.</span></li>
                <li><b>La marque valide</b><span>et tu es payé par virement. Sans réponse de sa part sous 7 jours, la vidéo est validée automatiquement.</span></li>
              </ol>
              <p className="small muted">Tu ajouteras ton RIB au moment de ta première réservation.</p>
            </section>
            <section className="panel" aria-labelledby="h-get">
              <h2 id="h-get">{c.ae_status === 'oui' ? 'Ton statut est prêt' : 'Obtenir le statut'}</h2>
              {c.ae_status === 'oui' ? (
                <p className="small muted">Parfait : tu pourras être payé dès ta première réservation.</p>
              ) : (<>
                <ul className="checklist">
                  <li><i aria-hidden="true" />L’inscription se fait en ligne, gratuitement.</li>
                  <li><i aria-hidden="true" />Il te faut ta CIN, un justificatif de domicile de moins de 3 mois et une photo.</li>
                  <li><i aria-hidden="true" />Tu déclares ensuite ton chiffre d’affaires chaque trimestre.</li>
                </ul>
                <a className="btn quiet sm" style={{ justifySelf: 'start' }} href="https://www.ae.gov.ma" target="_blank" rel="noopener">Portail auto-entrepreneur</a>
                {WHATSAPP ? <a className="link small" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour Kivora, j’ai besoin d’aide pour obtenir le statut d’auto-entrepreneur.')}`} target="_blank" rel="noopener">On t’aide sur WhatsApp</a> : null}
              </>)}
            </section>
          </div>
        </>)}

        {tab === 'parrainage' && (<>
          <div className="apphead"><h1>Parrainage</h1><p>Invite des créateurs que tu connais. Les profils parrainés, et leurs parrains, passent en priorité à l’ouverture.</p></div>
          <div className="tiles two">
            <div className="hi"><b>{referrals}</b><span>créateur{referrals > 1 ? 's' : ''} inscrit{referrals > 1 ? 's' : ''} avec ton lien</span></div>
            <div><b>{c.referral_code || '—'}</b><span>ton code</span></div>
          </div>
          <section className="panel" aria-labelledby="h-link">
            <h2 id="h-link">Ton lien</h2>
            {link ? <div className="copy"><code>{link}</code><button type="button" className="btn sm ink" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); say('Lien copié'); }}>{copied ? 'Copié' : 'Copier'}</button></div> : null}
            <div className="savebar">
              {share ? <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener">Partager sur WhatsApp</a> : null}
              {share ? <button type="button" className="btn quiet" onClick={() => { navigator.clipboard?.writeText(share); say('Message copié'); }}>Copier le message</button> : null}
            </div>
            <p className="small muted">Le message : « {share || '…'} »</p>
          </section>
        </>)}

        {tab === 'compte' && (<>
          <div className="apphead"><h1>Compte</h1><p>Tes accès et tes données.</p></div>
          <section className="panel" aria-labelledby="h-acc">
            <h2 id="h-acc">Connexion</h2>
            <dl className="kv"><dt>E-mail</dt><dd>{email || '—'}</dd><dt>Inscrit le</dt><dd>{fmtDate(c.created_at) || '—'}</dd></dl>
            <form className="savebar" onSubmit={changePw} noValidate>
              <label className="f" style={{ flex: 1, minWidth: 220 }}><span>Nouveau mot de passe</span><input type="password" autoComplete="new-password" value={pw} onChange={(e) => { setPw(e.target.value); setPwMsg(''); }} /></label>
              <button className="btn ink" style={{ alignSelf: 'end' }} disabled={!pw}>Changer</button>
            </form>
            {pwMsg ? <p className="err" role="alert">{pwMsg}</p> : null}
          </section>
          <section className="panel" aria-labelledby="h-data">
            <h2 id="h-data">Tes données</h2>
            <p className="small muted">Tu peux demander à tout moment l’accès, la correction ou la suppression de tes données (loi 09-08).</p>
            <div className="savebar">
              <a className="btn quiet sm" href="/confidentialite" target="_blank">Données personnelles</a>
              {WHATSAPP ? <a className="btn quiet sm" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour Kivora, je souhaite supprimer mon compte créateur.')}`} target="_blank" rel="noopener">Demander la suppression</a> : null}
              <form action="/deconnexion" method="post"><button className="btn quiet sm">Déconnexion</button></form>
            </div>
          </section>
        </>)}
      </main>
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
