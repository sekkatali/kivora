'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CITIES, NICHES, SECTORS, BUDGETS, LANGUAGES, dh, initials, toneFor, frError, WHATSAPP } from '@/lib/data';
import { track } from '@/lib/track';
import { DashNav, useHashTab, RequestSteps, STATUS_LABEL, isMissingTable, type NavItem, type BookingRequest } from './DashNav';

type Brand = { id: string; company: string; contact_name: string | null; phone: string | null; website: string | null; ice: string | null; sector: string | null; monthly_budget: string | null; status: 'waitlist' | 'active'; created_at?: string };
type Card = { id: string; first_name: string; last_initial: string; city: string | null; languages: string[]; niches: string[]; instagram: string | null; tiktok: string | null; followers: number | null; portfolio_url: string | null; bio: string | null; min_price: number | null; packages: { key: string; title: string; price_mad: number }[] };
type Tab = 'accueil' | 'catalogue' | 'demandes' | 'marque' | 'compte';
const TABS = ['accueil', 'catalogue', 'demandes', 'marque', 'compte'] as const;
const OBJECTIFS = ['Publicité Meta ou TikTok', 'Réseaux sociaux de la marque', 'Site e-commerce ou fiche produit', 'Autre'];

export default function BrandDashboard({ brand, email, requests = [], requestsReady = true, demo }: { brand: Brand; email?: string | null; requests?: BookingRequest[]; requestsReady?: boolean; demo?: Card[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useHashTab<Tab>(TABS, 'accueil');
  const [b, setB] = useState(brand);
  const [saved, setSaved] = useState(brand);
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState('');
  const [list, setList] = useState<Card[] | null>(demo ?? null);
  const [reqs, setReqs] = useState<BookingRequest[]>(requests);
  const [f, setF] = useState({ city: '', niche: '', lang: '', max: '', q: '' });
  const [open, setOpen] = useState<Card | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [brief, setBrief] = useState({ produit: '', objectif: OBJECTIFS[0], date: '', consignes: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<BookingRequest | 'whatsapp' | null>(null);
  const [pw, setPw] = useState('');
  const active = b.status === 'active';
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  useEffect(() => {
    if (!active || demo) return;
    supabase.rpc('get_catalog', { p_city: f.city || null, p_niche: f.niche || null }).then(({ data, error }) => {
      if (error) { say(frError(error.message)); setList([]); } else setList((data as Card[]) || []);
    });
  }, [supabase, active, f.city, f.niche, demo]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const shown = (list || []).filter((c) =>
    (!f.max || (c.min_price ?? 0) <= Number(f.max)) && (!f.lang || c.languages.includes(f.lang))
    && (!f.q || `${c.first_name} ${c.bio || ''} ${c.niches.join(' ')}`.toLowerCase().includes(f.q.toLowerCase())));
  const inProgress = reqs.filter((r) => !['validee', 'annulee'].includes(r.status));
  const delivered = reqs.filter((r) => ['livree', 'validee'].includes(r.status));
  const spent = reqs.filter((r) => ['payee', 'en_tournage', 'livree', 'validee'].includes(r.status)).reduce((a, r) => a + (r.total_mad || 0), 0);

  function openCreator(c: Card) { setOpen(c); setPicked([]); setSent(null); setBrief((x) => ({ ...x, consignes: '' })); }
  const total = open ? (open.min_price || 0) + open.packages.filter((p) => picked.includes(p.key)).reduce((a, p) => a + p.price_mad, 0) : 0;

  async function sendRequest() {
    if (!open) return;
    if (brief.produit.trim().length < 2) return say('Indiquez le produit à mettre en avant.');
    const text = [`Produit : ${brief.produit.trim()}`, `Objectif : ${brief.objectif}`, brief.date ? `Date souhaitée : ${new Date(brief.date).toLocaleDateString('fr-FR')}` : '', brief.consignes.trim() ? `Consignes : ${brief.consignes.trim()}` : ''].filter(Boolean).join('\n');
    track('Contact', { content_name: 'demande_reservation', value: total, currency: 'MAD' });
    if (!requestsReady || demo) { setSent('whatsapp'); return; }
    setSending(true);
    const { data, error } = await supabase.from('booking_requests')
      .insert({ brand_id: b.id, creator_id: open.id, options: picked.map((key) => ({ key })), brief: text.slice(0, 2000) }).select().single();
    setSending(false);
    if (error) { if (isMissingTable(error.message)) { setSent('whatsapp'); return; } return say(frError(error.message)); }
    setReqs((l) => [data as BookingRequest, ...l]);
    setSent(data as BookingRequest);
  }
  const waText = open ? `Bonjour Kivora, ${b.company} souhaite réserver une vidéo avec ${open.first_name} ${open.last_initial}. (${open.city || ''}).${picked.length ? ` Options : ${open.packages.filter((p) => picked.includes(p.key)).map((p) => p.title).join(', ')}.` : ''} Produit : ${brief.produit}. Total créateur : ${dh(total)}.` : '';

  async function saveBrand(e: React.FormEvent) {
    e.preventDefault();
    if (b.company.trim().length < 2) return setMsg('Indiquez le nom de la marque.');
    const patch = { company: b.company.trim(), contact_name: b.contact_name, phone: b.phone, website: b.website, ice: b.ice, sector: b.sector, monthly_budget: b.monthly_budget };
    const { error } = await supabase.from('brands').update(patch).eq('id', b.id);
    if (error) return setMsg(frError(error.message));
    setSaved(b); setMsg(''); say('Informations enregistrées');
  }
  const set = (k: keyof Brand, v: string) => { setB((x) => ({ ...x, [k]: v })); setMsg(''); };
  const brandDirty = JSON.stringify(b) !== JSON.stringify(saved);
  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return say('Mot de passe : 8 caractères minimum.');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return say(frError(error.message));
    setPw(''); say('Mot de passe changé');
  }

  const nav: NavItem<Tab>[] = [
    { id: 'accueil', label: 'Accueil', icon: 'home' },
    { id: 'catalogue', label: 'Catalogue', icon: 'grid' },
    { id: 'demandes', label: 'Mes demandes', icon: 'inbox', badge: inProgress.length || undefined },
    { id: 'marque', label: 'Ma marque', icon: 'building', dot: brandDirty },
    { id: 'compte', label: 'Compte', icon: 'gear' },
  ];

  return (
    <div className="cd">
      <DashNav items={nav} tab={tab} onChange={setTab} label="Espace marque" />
      <main className="cd-main" id="cd-panel" role="tabpanel">

        {tab === 'accueil' && (<>
          <div className="apphead"><h1>{b.company || 'Votre marque'}</h1><p>{active ? 'Votre accès au catalogue est ouvert.' : 'Vous êtes sur la liste d’accès anticipé.'}</p></div>
          {active ? (
            <div className="status approved"><span className="ic" aria-hidden="true">✓</span><div><b>Accès au catalogue ouvert</b><p>Choisissez un créateur, ses options et décrivez votre produit : l’équipe confirme la réservation avec vous.</p></div></div>
          ) : (
            <div className="status pending"><span className="ic" aria-hidden="true">…</span><div><b>Accès anticipé demandé</b><p>Les premières marques sont invitées par vagues, dès que le catalogue est complet dans votre secteur. On vous recontacte pour une démo.</p></div></div>
          )}
          <div className="tiles">
            <button className="hi" onClick={() => setTab('catalogue')}><b>{active ? (list ? list.length : '…') : '—'}</b><span>créateurs disponibles</span></button>
            <button onClick={() => setTab('demandes')}><b>{inProgress.length}</b><span>demande{inProgress.length > 1 ? 's' : ''} en cours</span></button>
            <button onClick={() => setTab('demandes')}><b>{delivered.length}</b><span>vidéo{delivered.length > 1 ? 's' : ''} livrée{delivered.length > 1 ? 's' : ''}</span></button>
            <div><b>{dh(spent)}</b><span>réservé, prix créateurs</span></div>
          </div>
          <section aria-labelledby="h-how" style={{ display: 'grid', gap: 12 }}>
            <h2 id="h-how" style={{ fontSize: 19, fontWeight: 500 }}>Comment ça marche</h2>
            <ol className="howto">
              <li><b>Choisissez</b><span>Filtrez par ville, niche, langue et budget. Chaque créateur affiche son prix et ses options.</span></li>
              <li><b>Demandez</b><span>Cochez les options, décrivez votre produit. L’équipe confirme sous 24 h.</span></li>
              <li><b>Recevez</b><span>Envoyez le produit ; la vidéo arrive en 5 jours environ, deux révisions incluses.</span></li>
              <li><b>Validez</b><span>Le créateur est payé à la validation. La vidéo est à vous, pour toutes vos publicités.</span></li>
            </ol>
          </section>
          {active ? <button className="btn ink big" style={{ justifySelf: 'start' }} onClick={() => setTab('catalogue')}>Parcourir le catalogue →</button>
            : WHATSAPP ? <a className="btn ink" style={{ justifySelf: 'start' }} href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Bonjour Kivora, c’est ${b.contact_name || ''} de ${b.company}. Je voudrais une démo.`)}`} target="_blank" rel="noopener">Demander une démo sur WhatsApp</a> : null}
        </>)}

        {tab === 'catalogue' && (!active ? (
          <div className="locked"><h2>Le catalogue s’ouvre bientôt pour vous</h2>
            <p className="muted">Votre marque est sur la liste d’accès anticipé. Dès que votre accès est ouvert, vous voyez ici les créateurs vérifiés, leurs prix et leurs options.</p>
            <button className="btn quiet" onClick={() => setTab('marque')}>Compléter les informations de ma marque</button></div>
        ) : (<>
          <div className="apphead"><h1>Catalogue</h1><p>Des créateurs vérifiés un par un. Le prix affiché est celui du créateur ; les options s’y ajoutent.</p></div>
          <div className="toolbar">
            <input type="search" placeholder="Rechercher" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            <select aria-label="Ville" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}><option value="">Toutes les villes</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            <select aria-label="Niche" value={f.niche} onChange={(e) => setF({ ...f, niche: e.target.value })}><option value="">Toutes les niches</option>{NICHES.map((c) => <option key={c}>{c}</option>)}</select>
            <select aria-label="Langue" value={f.lang} onChange={(e) => setF({ ...f, lang: e.target.value })}><option value="">Toutes les langues</option>{LANGUAGES.map((c) => <option key={c}>{c}</option>)}</select>
            <select aria-label="Budget" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })}><option value="">Tous les prix</option>{[500, 800, 1200, 2000].map((v) => <option key={v} value={v}>Jusqu’à {dh(v)}</option>)}</select>
            <span className="small muted">{list ? `${shown.length} créateur${shown.length > 1 ? 's' : ''}` : 'Chargement…'}</span>
          </div>
          {list && shown.length === 0 ? <p className="empty">Aucun créateur ne correspond à ces filtres pour l’instant.</p> : null}
          <div className="cat">
            {shown.map((c) => (
              <article className="cc" key={c.id}>
                <div className="hd"><span className="ava" style={{ background: toneFor(c.id) }}>{initials(c.first_name, c.last_initial)}</span>
                  <span><b>{c.first_name} {c.last_initial}.</b><span>{c.city} · {c.languages.join(', ')}</span></span>
                  {c.min_price ? <span className="from">{dh(c.min_price)}</span> : null}</div>
                <div className="chips" style={{ margin: 0 }}>{c.niches.map((n) => <span className="chip" key={n} style={{ background: 'var(--ui-surface)' }}>{n}</span>)}</div>
                {c.bio ? <p className="bio">{c.bio}</p> : null}
                <div className="links">
                  {c.portfolio_url ? <a className="link" href={c.portfolio_url} target="_blank" rel="noopener nofollow">Voir ses vidéos</a> : null}
                  {c.instagram ? <a className="link" href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener nofollow">Instagram</a> : null}
                  {c.tiktok ? <a className="link" href={`https://tiktok.com/@${c.tiktok}`} target="_blank" rel="noopener nofollow">TikTok</a> : null}
                </div>
                {c.packages.length ? <p className="opts-s">Options : {c.packages.map((p) => p.title).join(' · ')}</p> : null}
                <button className="btn ink" onClick={() => openCreator(c)}>Demander une vidéo</button>
              </article>
            ))}
          </div>
        </>))}

        {tab === 'demandes' && (<>
          <div className="apphead"><h1>Mes demandes</h1><p>Le suivi de chaque vidéo, de la demande à la validation.</p></div>
          {!requestsReady ? <p className="empty">Le suivi des demandes arrive très bientôt. En attendant, vos demandes passent par WhatsApp.</p>
            : reqs.length === 0 ? (
              <div className="locked"><h2>Aucune demande pour l’instant</h2><p className="muted">{active ? 'Choisissez un créateur dans le catalogue pour lancer votre première vidéo.' : 'Vous pourrez demander vos premières vidéos dès l’ouverture de votre accès.'}</p>
                {active ? <button className="btn ink" onClick={() => setTab('catalogue')}>Parcourir le catalogue</button> : null}</div>
            ) : reqs.map((r) => (
              <article className="rq" key={r.id}>
                <div className="rq-h"><div><b>{r.creator_label || 'Créateur'}</b><span>Demandée le {new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · {STATUS_LABEL[r.status]}</span></div><span className="amt">{dh(r.total_mad)}</span></div>
                <RequestSteps status={r.status} />
                {r.options?.length ? <div className="rq-opts">{r.options.map((o) => <span key={o.key}>{o.title} +{dh(o.price_mad)}</span>)}</div> : null}
                {r.admin_note ? <p className="rq-note">{r.admin_note}</p> : null}
                {r.brief ? <details><summary className="small muted" style={{ cursor: 'pointer' }}>Votre brief</summary><p className="small" style={{ whiteSpace: 'pre-line', marginTop: 6 }}>{r.brief}</p></details> : null}
              </article>
            ))}
        </>)}

        {tab === 'marque' && (
          <form className="panel" onSubmit={saveBrand} noValidate aria-labelledby="h-b">
            <div className="ph"><h2 id="h-b">Ma marque</h2>{brandDirty ? <span className="tag warn">Non enregistré</span> : null}</div>
            <p className="small muted">Ces informations servent à préparer vos réservations et vos factures.</p>
            <div className="fields two">
              <label className="f"><span>Marque</span><input value={b.company} onChange={(e) => set('company', e.target.value)} /></label>
              <label className="f"><span>Contact</span><input value={b.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} /></label>
              <label className="f"><span>Téléphone</span><input type="tel" value={b.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
              <label className="f"><span>Site ou Instagram</span><input value={b.website || ''} onChange={(e) => set('website', e.target.value)} /></label>
              <label className="f"><span>ICE <em>(pour vos factures)</em></span><input inputMode="numeric" value={b.ice || ''} onChange={(e) => set('ice', e.target.value)} /></label>
              <label className="f"><span>Secteur</span><select value={b.sector || ''} onChange={(e) => set('sector', e.target.value)}><option value="">Choisir…</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label className="f"><span>Budget vidéo par mois</span><select value={b.monthly_budget || ''} onChange={(e) => set('monthly_budget', e.target.value)}><option value="">Choisir…</option>{BUDGETS.map((s) => <option key={s}>{s}</option>)}</select></label>
            </div>
            {msg ? <p className="err" role="alert">{msg}</p> : null}
            <div className="savebar"><button className="btn ink" disabled={!brandDirty}>{brandDirty ? 'Enregistrer' : 'Enregistré'}</button>
              {brandDirty ? <button type="button" className="link" onClick={() => { setB(saved); setMsg(''); }}>Annuler</button> : null}</div>
          </form>
        )}

        {tab === 'compte' && (<>
          <div className="apphead"><h1>Compte</h1><p>Vos accès et vos données.</p></div>
          <section className="panel">
            <dl className="kv"><dt>E-mail</dt><dd>{email || '—'}</dd><dt>Accès</dt><dd>{active ? 'Catalogue ouvert' : 'Liste d’attente'}</dd></dl>
            <form className="savebar" onSubmit={changePw} noValidate>
              <label className="f" style={{ flex: 1, minWidth: 220 }}><span>Nouveau mot de passe</span><input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
              <button className="btn ink" style={{ alignSelf: 'end' }} disabled={!pw}>Changer</button>
            </form>
          </section>
          <section className="panel">
            <h2>Vos données</h2>
            <p className="small muted">Vous pouvez demander l’accès, la correction ou la suppression de vos données à tout moment (loi 09-08).</p>
            <div className="savebar">
              <a className="btn quiet sm" href="/confidentialite" target="_blank">Données personnelles</a>
              {WHATSAPP ? <a className="btn quiet sm" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener">Contacter l’équipe</a> : null}
              <form action="/deconnexion" method="post"><button className="btn quiet sm">Déconnexion</button></form>
            </div>
          </section>
        </>)}
      </main>

      {open ? (<>
        <div className="drawer-bg" onClick={() => setOpen(null)} />
        <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Demande avec ${open.first_name}`}>
          <div className="drawer-h"><h2>{sent ? 'Demande envoyée' : 'Demander une vidéo'}</h2><button className="x" onClick={() => setOpen(null)} aria-label="Fermer">×</button></div>
          <div className="cc" style={{ padding: 14 }}>
            <div className="hd"><span className="ava" style={{ background: toneFor(open.id) }}>{initials(open.first_name, open.last_initial)}</span>
              <span><b>{open.first_name} {open.last_initial}.</b><span>{open.city} · {open.niches.join(', ')}</span></span></div>
          </div>
          {sent === 'whatsapp' ? (<>
            <p>Envoyez votre demande à l’équipe sur WhatsApp : elle confirme la disponibilité du créateur et vous envoie le devis.</p>
            {WHATSAPP ? <a className="btn ink big" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener">Envoyer sur WhatsApp</a> : <p className="err">Numéro WhatsApp de l’équipe non configuré.</p>}
          </>) : sent ? (<>
            <p className="okbox">Votre demande à {dh(sent.total_mad)} est enregistrée. L’équipe confirme la disponibilité du créateur sous 24 h et vous envoie le devis.</p>
            <button className="btn ink" onClick={() => { setOpen(null); setTab('demandes'); }}>Suivre ma demande</button>
            {WHATSAPP ? <a className="link" href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener">Prévenir l’équipe sur WhatsApp</a> : null}
          </>) : (<>
            <div className="pkl">
              <div><span>Vidéo UGC<small>jusqu’à 30 s, 2 révisions</small></span><b>{dh(open.min_price)}</b></div>
              {open.packages.map((p) => (
                <label key={p.key} className="cc-opt"><input type="checkbox" checked={picked.includes(p.key)} onChange={() => setPicked((x) => (x.includes(p.key) ? x.filter((k) => k !== p.key) : [...x, p.key]))} /><span>{p.title}</span><b>+ {dh(p.price_mad)}</b></label>
              ))}
            </div>
            <label className="f"><span>Produit à mettre en avant</span><input value={brief.produit} onChange={(e) => setBrief({ ...brief, produit: e.target.value })} placeholder="Ex. Sérum à l’argan 30 ml" /></label>
            <label className="f"><span>Où sera diffusée la vidéo ?</span><select value={brief.objectif} onChange={(e) => setBrief({ ...brief, objectif: e.target.value })}>{OBJECTIFS.map((o) => <option key={o}>{o}</option>)}</select></label>
            <label className="f"><span>Date souhaitée <em>(facultatif)</em></span><input type="date" value={brief.date} onChange={(e) => setBrief({ ...brief, date: e.target.value })} /></label>
            <label className="f"><span>Consignes <em>(facultatif)</em></span><textarea value={brief.consignes} onChange={(e) => setBrief({ ...brief, consignes: e.target.value })} placeholder="Ton, accroche, mots à éviter, points clés du produit…" /></label>
            <div className="sumbox">
              <div><span>Vidéo</span><span>{dh(open.min_price)}</span></div>
              {open.packages.filter((p) => picked.includes(p.key)).map((p) => <div key={p.key}><span>{p.title}</span><span>+ {dh(p.price_mad)}</span></div>)}
              <span className="t">{dh(total)}</span>
              <small>Prix du créateur. Les frais de service et la TVA figurent sur le devis.</small>
            </div>
            <button className="btn ink big" onClick={sendRequest} disabled={sending}>{sending ? 'Envoi…' : 'Envoyer la demande'}</button>
          </>)}
        </aside>
      </>) : null}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
