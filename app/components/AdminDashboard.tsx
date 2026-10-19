'use client';
/* taste-skill-ignore-file : interface d'administration, tableaux de données */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { dh, frError } from '@/lib/data';
import { DashNav, useHashTab, type NavItem } from './DashNav';
import BookingCard from './BookingCard';
import { ALL_STATUSES, OPEN_STATUSES, PAID_STATUSES, STATUS_LABEL, type BookingRequest, type BookingReview } from '@/lib/booking';

const AE_SHORT: Record<string, string> = { oui: 'Oui', en_cours: 'En cours', non: 'Non' };

type Creator = {
  id: string; first_name: string; last_name: string; phone: string | null; city: string | null; languages: string[]; niches: string[];
  instagram: string | null; tiktok: string | null; followers: number | null; portfolio_url: string | null; desired_rate: number | null;
  ae_status: string | null; bio: string | null; status: 'pending' | 'approved' | 'rejected'; admin_note: string | null; referral_code: string | null;
  referred_by: string | null; utm: Record<string, string>; created_at: string; reviewed_at: string | null; profiles: { email: string | null };
};
type Brand = {
  id: string; company: string; contact_name: string | null; phone: string | null; website: string | null; ice: string | null; sector: string | null;
  monthly_budget: string | null; status: 'waitlist' | 'active'; utm: Record<string, string>; created_at: string; profiles: { email: string | null };
};
type Pkg = { creator_id: string; title: string; price_mad: number; active: boolean; option_key: string | null };
type Stats = Record<string, number | Record<string, number>>;
type Tab = 'apercu' | 'createurs' | 'marques' | 'demandes';
const TABS = ['apercu', 'createurs', 'marques', 'demandes'] as const;

/* Paliers du plan de lancement */
const P1 = { approved: 100, perNiche: 15, niches: 4, perCity: 15, cities: 3, aePct: 30, cpl: 20 };
const P2 = { brands: 20, videos: 40, validatedPct: 80, reorderPct: 40, cac: 1000 };
const ST_LABEL = { pending: 'À vérifier', approved: 'Vérifié', rejected: 'Refusé' } as const;
const ST_TAG = { pending: 'warn', approved: 'good', rejected: 'bad' } as const;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const wa = (p: string | null, text?: string) => (p ? `https://wa.me/${p.replace(/^\+/, '').replace(/^00/, '').replace(/^0/, '212')}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '');
const fr1 = (n: number) => n.toFixed(1).replace('.', ',');

function csv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = Array.isArray(v) ? v.join(' | ') : v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const body = '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

function Gate({ l, v, t, txt }: { l: string; v: number; t: number; txt: string }) {
  const ok = v >= t;
  return (
    <div className="gate"><div className="l"><b>{l}</b><span>{txt}{ok ? ' ✓' : ''}</span></div>
      <div className="meter" title={txt}><i style={{ width: `${Math.min(100, t ? (v / t) * 100 : 0)}%`, background: ok ? 'var(--good)' : undefined }} /></div></div>
  );
}

export default function AdminDashboard({ stats, creators, brands, packages, requests = [], requestsReady = true, error, userId = '', reviewOn: reviewOn0 = true, reviewReady = true, reviews = [] }: {
  stats: Stats; creators: Creator[]; brands: Brand[]; packages: Pkg[]; requests?: BookingRequest[]; requestsReady?: boolean; error: string; userId?: string;
  reviewOn?: boolean; reviewReady?: boolean; reviews?: BookingReview[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [tab, setTab] = useHashTab<Tab>(TABS, 'apercu');
  const [cr, setCr] = useState(creators);
  const [br, setBr] = useState(brands);
  const [rq, setRq] = useState(requests);
  const [cFilter, setCFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [bFilter, setBFilter] = useState<'all' | 'waitlist' | 'active'>('all');
  const [rFilter, setRFilter] = useState<'ouvertes' | 'toutes' | string>('ouvertes');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState(error ? `Erreur : ${error}` : '');
  const [spend, setSpend] = useState('');
  const [spendB, setSpendB] = useState('');
  const [reviewOn, setReviewOn] = useState(reviewOn0);
  const [swBusy, setSwBusy] = useState(false);
  const reviewBy = useMemo(() => Object.fromEntries(reviews.map((v) => [v.booking_id, v])), [reviews]);

  useEffect(() => { try { setSpend(localStorage.getItem('kivora-spend') || ''); setSpendB(localStorage.getItem('kivora-spend-brands') || ''); } catch { /* rien */ } }, []);
  useEffect(() => { try { localStorage.setItem('kivora-spend', spend); localStorage.setItem('kivora-spend-brands', spendB); } catch { /* rien */ } }, [spend, spendB]);
  useEffect(() => { setQ(''); setOpen(null); }, [tab]);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const pkBy = useMemo(() => {
    const m: Record<string, Pkg[]> = {};
    packages.forEach((p) => { (m[p.creator_id] ||= []).push(p); });
    return m;
  }, [packages]);
  const brandById = useMemo(() => Object.fromEntries(br.map((b) => [b.id, b])), [br]);
  const creatorById = useMemo(() => Object.fromEntries(cr.map((c) => [c.id, c])), [cr]);

  /* ---------- indicateurs palier 1 ---------- */
  const approved = cr.filter((c) => c.status === 'approved');
  const pending = cr.filter((c) => c.status === 'pending').length;
  const count = (list: Creator[], key: 'niches' | 'city') => {
    const m: Record<string, number> = {};
    list.forEach((c) => { (key === 'niches' ? c.niches : [c.city || 'Non renseignée']).forEach((v) => { m[v] = (m[v] || 0) + 1; }); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const nicheA = count(approved, 'niches');
  const cityA = count(approved, 'city');
  const aePct = approved.length ? Math.round((approved.filter((c) => c.ae_status === 'oui' || c.ae_status === 'en_cours').length / approved.length) * 100) : 0;
  const complete = cr.filter((c) => c.portfolio_url && c.desired_rate).length;
  const fromMeta = cr.filter((c) => /meta|facebook|instagram|fb|ig/i.test(c.utm?.utm_source || '')).length;
  const cpl = Number(spend) > 0 && fromMeta ? Number(spend) / fromMeta : null;
  const p1 = [
    { l: 'Créateurs vérifiés', v: approved.length, t: P1.approved, txt: `${approved.length} / ${P1.approved}` },
    { l: `Niches à ${P1.perNiche}+ vérifiés`, v: nicheA.filter((x) => x[1] >= P1.perNiche).length, t: P1.niches, txt: `${nicheA.filter((x) => x[1] >= P1.perNiche).length} / ${P1.niches}` },
    { l: `Villes à ${P1.perCity}+ vérifiés`, v: cityA.filter((x) => x[1] >= P1.perCity).length, t: P1.cities, txt: `${cityA.filter((x) => x[1] >= P1.perCity).length} / ${P1.cities}` },
    { l: 'Vérifiés auto-entrepreneurs ou en cours', v: aePct, t: P1.aePct, txt: `${aePct} % (objectif ${P1.aePct} %)` },
  ];
  const p1ok = p1.every((g) => g.v >= g.t) && cpl != null && cpl < P1.cpl;

  /* ---------- indicateurs palier 2 ---------- */
  const paidReq = rq.filter((r) => PAID_STATUSES.includes(r.status));
  const payingBrands = new Set(paidReq.map((r) => r.brand_id));
  const delivered = rq.filter((r) => ['livree', 'revision', 'validee'].includes(r.status));
  const validated = rq.filter((r) => r.status === 'validee');
  const validatedPct = delivered.length ? Math.round((validated.length / delivered.length) * 100) : 0;
  const perBrand: Record<string, number> = {};
  paidReq.forEach((r) => { perBrand[r.brand_id] = (perBrand[r.brand_id] || 0) + 1; });
  const reorderPct = payingBrands.size ? Math.round((Object.values(perBrand).filter((n) => n >= 2).length / payingBrands.size) * 100) : 0;
  const cac = Number(spendB) > 0 && payingBrands.size ? Number(spendB) / payingBrands.size : null;
  const p2 = [
    { l: 'Marques payantes', v: payingBrands.size, t: P2.brands, txt: `${payingBrands.size} / ${P2.brands}` },
    { l: 'Vidéos livrées', v: delivered.length, t: P2.videos, txt: `${delivered.length} / ${P2.videos}` },
    { l: 'Vidéos validées (sur livrées)', v: validatedPct, t: P2.validatedPct, txt: `${validatedPct} % (objectif ${P2.validatedPct} %)` },
    { l: 'Marques qui recommandent', v: reorderPct, t: P2.reorderPct, txt: `${reorderPct} % (objectif ${P2.reorderPct} %)` },
  ];
  const gmv = paidReq.reduce((a, r) => a + (r.total_mad || 0), 0);
  const openReq = rq.filter((r) => OPEN_STATUSES.includes(r.status));
  const toCash = rq.filter((r) => r.status === 'acceptee').length;
  const toReview = rq.filter((r) => r.status === 'controle').length;
  const stale = rq.filter((r) => r.status === 'envoyee' && Date.now() - new Date(r.created_at).getTime() > 2 * 864e5).length;

  /* ---------- graphiques ---------- */
  const byDay = (stats.by_day || {}) as Record<string, number>;
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * 864e5); const k = d.toLocaleDateString('sv-SE', { timeZone: 'Africa/Casablanca' }); return [k, byDay[k] || 0] as const; });
  const dayMax = Math.max(1, ...days.map((d) => d[1]));
  const last7 = days.slice(-7).reduce((a, d) => a + d[1], 0);
  const sources = Object.entries((stats.by_source || {}) as Record<string, number>).sort((a, b) => b[1] - a[1]);
  const langs: Record<string, number> = {};
  cr.forEach((c) => { const l = c.utm?.lang === 'dr' ? 'Darija' : 'Français'; langs[l] = (langs[l] || 0) + 1; });

  /* ---------- actions ---------- */
  async function setCreator(c: Creator, status: Creator['status']) {
    const { error: e } = await supabase.from('creators').update({ status, admin_note: note.trim() || null }).eq('id', c.id);
    if (e) return say(frError(e.message));
    setCr((l) => l.map((x) => (x.id === c.id ? { ...x, status, admin_note: note.trim() || null, reviewed_at: new Date().toISOString() } : x)));
    say(status === 'approved' ? `${c.first_name} vérifié` : status === 'rejected' ? `${c.first_name} refusé` : 'Remis en attente');
    setOpen(null); router.refresh();
  }
  /** Interrupteur « Validation des contenus par Kivora ». En le coupant, les vidéos en attente partent aux marques. */
  async function toggleReview() {
    const next = !reviewOn;
    const waiting = rq.filter((r) => r.status === 'controle').length;
    if (!next && waiting && !confirm(`${waiting} vidéo${waiting > 1 ? 's attendent' : ' attend'} ton contrôle. En coupant la validation, ${waiting > 1 ? 'elles partent' : 'elle part'} tout de suite chez la marque. Continuer ?`)) return;
    setSwBusy(true);
    const { data, error: e } = await supabase.rpc('set_content_review', { p_on: next });
    setSwBusy(false);
    if (e) return say(frError(e.message));
    setReviewOn(next);
    if (!next && Number(data) > 0) { router.refresh(); setRq((l) => l.map((r) => (r.status === 'controle' ? { ...r, status: 'livree' } : r))); }
    say(next ? 'Validation activée : les vidéos passent par toi avant la marque' : `Validation coupée : les vidéos vont directement aux marques${Number(data) > 0 ? ` (${data} envoyée${Number(data) > 1 ? 's' : ''})` : ''}`);
  }
  async function setBrand(b: Brand, status: Brand['status']) {
    const { error: e } = await supabase.from('brands').update({ status }).eq('id', b.id);
    if (e) return say(frError(e.message));
    setBr((l) => l.map((x) => (x.id === b.id ? { ...x, status } : x)));
    say(status === 'active' ? `${b.company} a accès au catalogue` : `${b.company} remis en liste d’attente`);
  }


  const ql = q.trim().toLowerCase();
  const cRows = cr.filter((c) => (cFilter === 'all' || c.status === cFilter) && (!ql || `${c.first_name} ${c.last_name} ${c.city} ${c.profiles?.email} ${c.instagram} ${c.tiktok} ${c.niches.join(' ')}`.toLowerCase().includes(ql)));
  const bRows = br.filter((b) => (bFilter === 'all' || b.status === bFilter) && (!ql || `${b.company} ${b.contact_name} ${b.profiles?.email} ${b.sector}`.toLowerCase().includes(ql)));
  const rRows = rq.filter((r) => (rFilter === 'toutes' || (rFilter === 'ouvertes' ? OPEN_STATUSES.includes(r.status) : r.status === rFilter))
    && (!ql || `${r.brand_company} ${r.creator_label} ${r.brief}`.toLowerCase().includes(ql)));
  const reqCount = (bid: string) => rq.filter((r) => r.brand_id === bid).length;

  const exportCreators = () => csv(cr.map((c) => ({
    prenom: c.first_name, nom: c.last_name, email: c.profiles?.email, whatsapp: c.phone, ville: c.city, niches: c.niches, langues: c.languages,
    instagram: c.instagram, tiktok: c.tiktok, abonnes: c.followers, portfolio: c.portfolio_url, prix: c.desired_rate,
    options: (pkBy[c.id] || []).filter((p) => p.option_key && p.active).map((p) => `${p.title} +${p.price_mad}`),
    auto_entrepreneur: c.ae_status, statut: c.status, parrain: c.referred_by, code: c.referral_code,
    source: c.utm?.utm_source, campagne: c.utm?.utm_campaign, annonce: c.utm?.utm_content, langue: c.utm?.lang || 'fr', inscrit_le: c.created_at,
  })), 'kivora-createurs');
  const exportBrands = () => csv(br.map((b) => ({
    marque: b.company, contact: b.contact_name, email: b.profiles?.email, telephone: b.phone, site: b.website, ice: b.ice, secteur: b.sector,
    budget: b.monthly_budget, statut: b.status, demandes: reqCount(b.id), source: b.utm?.utm_source, campagne: b.utm?.utm_campaign, inscrit_le: b.created_at,
  })), 'kivora-marques');
  const exportRequests = () => csv(rq.map((r) => ({
    date: r.created_at, marque: r.brand_company, createur: r.creator_label, prix_createur: r.base_price, options: (r.options || []).map((o) => `${o.title} +${o.price_mad}`),
    total_createur: r.total_mad, statut: STATUS_LABEL[r.status], revisions: r.revisions, livraison: r.delivery_url, payee_le: r.paid_at, livree_le: r.delivered_at, validee_le: r.validated_at, brief: r.brief, note_kivora: r.admin_note,
  })), 'kivora-demandes');

  const nav: NavItem<Tab>[] = [
    { id: 'apercu', label: 'Vue d’ensemble', icon: 'chart' },
    { id: 'createurs', label: 'Créateurs', icon: 'users', badge: pending || undefined },
    { id: 'marques', label: 'Marques', icon: 'building', badge: br.filter((b) => b.status === 'waitlist').length || undefined },
    { id: 'demandes', label: 'Réservations', icon: 'inbox', badge: toCash + toReview || undefined },
  ];

  return (
    <div className="cd">
      <DashNav items={nav} tab={tab} onChange={setTab} label="Administration" />
      <main className="cd-main" id="cd-panel" role="tabpanel">

        {tab === 'apercu' && (<>
          <div className="apphead"><h1>Vue d’ensemble</h1><p>Où en sont les paliers, et ce qui attend une action.</p></div>
          {(pending > 0 || toCash > 0 || toReview > 0 || stale > 0) ? (
            <div className="todo">
              {pending > 0 ? <button onClick={() => { setCFilter('pending'); setTab('createurs'); }}><i aria-hidden="true" /><span><b>{pending}</b> créateur{pending > 1 ? 's' : ''} à vérifier</span><em>Ouvrir →</em></button> : null}
              {toReview > 0 ? <button onClick={() => { setRFilter('controle'); setTab('demandes'); }}><i aria-hidden="true" /><span><b>{toReview}</b> vidéo{toReview > 1 ? 's' : ''} à contrôler avant envoi à la marque</span><em>Ouvrir →</em></button> : null}
              {toCash > 0 ? <button onClick={() => { setRFilter('acceptee'); setTab('demandes'); }}><i aria-hidden="true" /><span><b>{toCash}</b> réservation{toCash > 1 ? 's' : ''} acceptée{toCash > 1 ? 's' : ''} : paiement à encaisser</span><em>Ouvrir →</em></button> : null}
              {stale > 0 ? <button onClick={() => { setRFilter('envoyee'); setTab('demandes'); }}><i aria-hidden="true" /><span><b>{stale}</b> demande{stale > 1 ? 's' : ''} sans réponse du créateur depuis 48 h</span><em>Voir →</em></button> : null}
            </div>
          ) : null}
          <div className="tiles">
            <div className="hi"><b>{cr.length}</b><span>préinscrits · {last7} cette semaine</span></div>
            <div><b>{approved.length}</b><span>vérifiés · {complete} profils complets</span></div>
            <div><b>{br.length}</b><span>marques · {br.filter((b) => b.status === 'active').length} actives</span></div>
            <div><b>{dh(gmv)}</b><span>réservé (prix créateurs)</span></div>
          </div>
          <div className="cols">
            <section className="panel" aria-labelledby="h-p1">
              <div className="ph"><h2 id="h-p1">Palier 1 : créateurs</h2><span className={`tag ${p1ok ? 'good' : 'warn'}`}>{p1ok ? '✓ Atteint' : 'En cours'}</span></div>
              <div className="gates">
                {p1.map((g) => <Gate key={g.l} {...g} />)}
                <div className="gate"><div className="l"><b>Coût par préinscrit Meta</b><span>{cpl == null ? '—' : `${fr1(cpl)} DH${cpl < P1.cpl ? ' ✓' : ''}`} (objectif &lt; {P1.cpl} DH)</span></div>
                  <label className="toolbar small">Dépense pub créateurs <input style={{ width: 110, background: 'var(--ui-surface)' }} type="number" inputMode="numeric" value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="DH" /> · {fromMeta} venus de Meta</label></div>
              </div>
            </section>
            <section className="panel" aria-labelledby="h-p2">
              <div className="ph"><h2 id="h-p2">Palier 2 : marques en conciergerie</h2><span className={`tag ${p2.every((g) => g.v >= g.t) ? 'good' : 'warn'}`}>{p2.every((g) => g.v >= g.t) ? '✓ Atteint' : requestsReady ? 'En cours' : 'Table à créer'}</span></div>
              <div className="gates">
                {p2.map((g) => <Gate key={g.l} {...g} />)}
                <div className="gate"><div className="l"><b>Coût d’acquisition par marque payante</b><span>{cac == null ? '—' : `${dh(cac)}${cac < P2.cac ? ' ✓' : ''}`} (objectif &lt; {dh(P2.cac)})</span></div>
                  <label className="toolbar small">Dépense pub marques <input style={{ width: 110, background: 'var(--ui-surface)' }} type="number" inputMode="numeric" value={spendB} onChange={(e) => setSpendB(e.target.value)} placeholder="DH" /></label></div>
              </div>
            </section>
          </div>
          <div className="cols">
            <section className="panel" aria-labelledby="h-day">
              <h2 id="h-day">Préinscriptions, 30 derniers jours</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30,1fr)', gap: 2, alignItems: 'end', height: 120 }} role="img" aria-label="Préinscriptions par jour">
                {days.map(([d, v]) => <span key={d} title={`${fmtDate(d)} : ${v}`} style={{ display: 'block', height: `${Math.max(v ? 6 : 2, (v / dayMax) * 120)}px`, background: v ? 'var(--forest)' : 'var(--ui-surface)', borderRadius: '4px 4px 0 0' }} />)}
              </div>
              <div className="small muted" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{fmtDate(days[0][0])}</span><span>max {dayMax} par jour</span><span>aujourd’hui</span></div>
            </section>
            <section className="panel" aria-labelledby="h-src">
              <h2 id="h-src">Sources et langue</h2>
              <div className="dist">{sources.length ? sources.slice(0, 5).map(([s, v]) => (
                <div key={s}><span>{s}</span><span className="meter"><i style={{ width: `${(v / Math.max(1, cr.length)) * 100}%` }} /></span><span>{v}</span></div>
              )) : <p className="small muted">Aucune préinscription pour l’instant.</p>}</div>
              {cr.length ? <div className="dist">{Object.entries(langs).map(([l, v]) => <div key={l}><span>{l}</span><span className="meter"><i style={{ width: `${(v / cr.length) * 100}%` }} /></span><span>{v}</span></div>)}</div> : null}
            </section>
          </div>
          <div className="cols">
            <section className="panel" aria-labelledby="h-n"><h2 id="h-n">Vérifiés par niche</h2>
              <div className="dist">{nicheA.length ? nicheA.slice(0, 8).map(([n, v]) => <div key={n}><span>{n}</span><span className="meter"><i className={v >= P1.perNiche ? 'ok' : ''} style={{ width: `${Math.min(100, (v / P1.perNiche) * 100)}%` }} /></span><span>{v}</span></div>) : <p className="small muted">Aucun créateur vérifié.</p>}</div></section>
            <section className="panel" aria-labelledby="h-c"><h2 id="h-c">Vérifiés par ville</h2>
              <div className="dist">{cityA.length ? cityA.slice(0, 8).map(([n, v]) => <div key={n}><span>{n}</span><span className="meter"><i className={v >= P1.perCity ? 'ok' : ''} style={{ width: `${Math.min(100, (v / P1.perCity) * 100)}%` }} /></span><span>{v}</span></div>) : <p className="small muted">Aucun créateur vérifié.</p>}</div></section>
          </div>
        </>)}

        {tab === 'createurs' && (<>
          <div className="apphead"><h1>Créateurs</h1><p>Examine chaque profil : vidéos, réseaux, prix. Le message que tu écris s’affiche dans son espace.</p></div>
          <div className="toolbar">
            <div className="seg" role="group" aria-label="Statut">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => <button key={s} aria-pressed={cFilter === s} onClick={() => setCFilter(s)}>{s === 'all' ? `Tous (${cr.length})` : `${ST_LABEL[s]} (${cr.filter((c) => c.status === s).length})`}</button>)}
            </div>
            <input type="search" placeholder="Nom, ville, niche, e-mail…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn sm quiet" onClick={exportCreators}>Exporter en CSV</button>
          </div>
          {cRows.length === 0 ? <p className="empty">{cr.length === 0 ? 'Aucune préinscription pour l’instant. Dès qu’un créateur s’inscrit, il apparaît ici avec le statut « À vérifier ».' : 'Aucun créateur dans cette liste.'}</p> : (
            <div className="tbl"><table>
              <thead><tr><th>Créateur</th><th>Ville</th><th>Niches</th><th>Réseaux</th><th>Prix</th><th>Auto-entr.</th><th>Statut</th><th>Inscrit</th><th /></tr></thead>
              <tbody>{cRows.map((c) => {
                const isOpen = open === c.id;
                const toggle = () => { setOpen(isOpen ? null : c.id); setNote(c.admin_note || ''); };
                return [
                  <tr key={c.id} className={isOpen ? 'open' : ''}>
                    <td><button className="rowbtn" onClick={toggle} aria-expanded={isOpen}>{c.first_name} {c.last_name}</button><span className="sub">{c.profiles?.email}</span></td>
                    <td>{c.city}</td>
                    <td>{c.niches.join(', ')}</td>
                    <td>{c.instagram ? <a className="link" href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener nofollow">IG</a> : null} {c.tiktok ? <a className="link" href={`https://tiktok.com/@${c.tiktok}`} target="_blank" rel="noopener nofollow">TT</a> : null}<span className="sub">{c.followers ? `${c.followers.toLocaleString('fr-FR')} abonnés` : ''}</span></td>
                    <td>{dh(c.desired_rate)}<span className="sub">{(pkBy[c.id] || []).filter((p) => p.option_key && p.active).length} option(s)</span></td>
                    <td>{c.ae_status ? AE_SHORT[c.ae_status] : '—'}</td>
                    <td><span className={`tag ${ST_TAG[c.status]}`}>{ST_LABEL[c.status]}</span></td>
                    <td>{fmtDate(c.created_at)}<span className="sub">{c.utm?.utm_source || 'direct'}{c.utm?.lang === 'dr' ? ' · darija' : ''}</span></td>
                    <td><button className={`btn sm ${isOpen ? 'quiet' : 'ink'}`} onClick={toggle}>{isOpen ? 'Fermer' : c.status === 'pending' ? 'Examiner' : 'Modifier'}</button></td>
                  </tr>,
                  isOpen ? (
                    <tr key={c.id + '-d'} className="open"><td colSpan={9}>
                      <dl className="detail">
                        <div><dt>WhatsApp</dt><dd>{c.phone ? <a className="link" href={wa(c.phone)} target="_blank" rel="noopener">{c.phone}</a> : '—'}</dd></div>
                        <div><dt>Langues</dt><dd>{c.languages.join(', ') || '—'}</dd></div>
                        <div><dt>Vidéos</dt><dd>{c.portfolio_url ? <a className="link" href={c.portfolio_url} target="_blank" rel="noopener nofollow">Ouvrir le lien</a> : 'Pas de lien'}</dd></div>
                        <div><dt>Options</dt><dd>{(pkBy[c.id] || []).filter((p) => p.option_key && p.active).map((p) => `${p.title} +${dh(p.price_mad)}`).join(' · ') || 'Aucune'}</dd></div>
                        <div><dt>Parrainé par</dt><dd>{c.referred_by || '—'} · code {c.referral_code}</dd></div>
                        <div><dt>Campagne</dt><dd>{[c.utm?.utm_campaign, c.utm?.utm_content].filter(Boolean).join(' / ') || '—'}</dd></div>
                        <div className="wide"><dt>Présentation</dt><dd>{c.bio || '—'}</dd></div>
                        <label className="f wide"><span>Message au créateur <em>(visible dans son espace)</em></span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Ajoute 2 vidéos face caméra avec un meilleur son." /></label>
                        <div className="wide toolbar">
                          <button className="btn sm ink" onClick={() => setCreator(c, 'approved')}>Vérifier</button>
                          <button className="btn sm quiet" onClick={() => setCreator(c, 'rejected')}>Refuser</button>
                          {c.status !== 'pending' ? <button className="btn sm quiet" onClick={() => setCreator(c, 'pending')}>Remettre à vérifier</button> : null}
                          {c.phone ? <a className="btn sm quiet" href={wa(c.phone, `Bonjour ${c.first_name}, c’est l’équipe Kivora.`)} target="_blank" rel="noopener">Écrire sur WhatsApp</a> : null}
                        </div>
                      </dl>
                    </td></tr>
                  ) : null,
                ];
              })}</tbody>
            </table></div>
          )}
        </>)}

        {tab === 'marques' && (<>
          <div className="apphead"><h1>Marques</h1><p>Ouvre l’accès au catalogue marque par marque, après la démo.</p></div>
          <div className="toolbar">
            <div className="seg" role="group" aria-label="Accès">
              {([['all', 'Toutes'], ['waitlist', 'Liste d’attente'], ['active', 'Accès ouvert']] as const).map(([s, l]) => <button key={s} aria-pressed={bFilter === s} onClick={() => setBFilter(s)}>{l} ({s === 'all' ? br.length : br.filter((b) => b.status === s).length})</button>)}
            </div>
            <input type="search" placeholder="Marque, contact, secteur…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn sm quiet" onClick={exportBrands}>Exporter en CSV</button>
          </div>
          {bRows.length === 0 ? <p className="empty">{br.length === 0 ? 'Aucune marque pour l’instant.' : 'Aucune marque dans cette liste.'}</p> : (
            <div className="tbl"><table>
              <thead><tr><th>Marque</th><th>Contact</th><th>Secteur</th><th>Budget</th><th>Demandes</th><th>Accès</th><th>Inscrite</th><th /></tr></thead>
              <tbody>{bRows.map((b) => (
                <tr key={b.id}>
                  <td><b style={{ fontWeight: 500 }}>{b.company}</b><span className="sub">{b.website}</span><span className="sub">{b.ice ? `ICE ${b.ice}` : ''}</span></td>
                  <td>{b.contact_name}<span className="sub">{b.profiles?.email}</span><span className="sub">{b.phone ? <a className="link" href={wa(b.phone)} target="_blank" rel="noopener">{b.phone}</a> : null}</span></td>
                  <td>{b.sector}</td>
                  <td>{b.monthly_budget || '—'}</td>
                  <td>{reqCount(b.id) ? <button className="link" onClick={() => { setRFilter('toutes'); setTab('demandes'); setTimeout(() => setQ(b.company), 0); }}>{reqCount(b.id)}</button> : '0'}</td>
                  <td><span className={`tag ${b.status === 'active' ? 'good' : 'warn'}`}>{b.status === 'active' ? 'Ouvert' : 'Attente'}</span></td>
                  <td>{fmtDate(b.created_at)}<span className="sub">{b.utm?.utm_source || 'direct'}</span></td>
                  <td>{b.status === 'active'
                    ? <button className="btn sm quiet" onClick={() => setBrand(b, 'waitlist')}>Retirer l’accès</button>
                    : <button className="btn sm ink" onClick={() => setBrand(b, 'active')}>Ouvrir l’accès</button>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </>)}

        {tab === 'demandes' && (<>
          <div className="apphead"><h1>Réservations</h1><p>Les marques et les créateurs gèrent leurs réservations entre eux. Tu supervises, tu encaisses les paiements et tu interviens en cas de problème.</p></div>
          {!requestsReady ? <p className="empty">La table des réservations n’existe pas encore. Applique le script <b>supabase/migrations/09_booking_requests.sql</b> dans Supabase › SQL Editor.</p> : (<>
            {reviewReady ? (
              <div className="review-sw">
                <div>
                  <b id="sw-l">Validation des contenus par Kivora</b>
                  <span>{reviewOn
                    ? `Activée : chaque vidéo livrée passe par un admin avant d’arriver chez la marque.${toReview ? ` ${toReview} en attente.` : ''}`
                    : 'Coupée : les vidéos livrées par les créateurs arrivent directement chez la marque.'}</span>
                </div>
                <button type="button" role="switch" className="sw" aria-checked={reviewOn} aria-labelledby="sw-l" disabled={swBusy} onClick={toggleReview} />
              </div>
            ) : null}
            <div className="tiles">
              <div className="hi"><b>{openReq.length}</b><span>en cours · {toCash} à encaisser{reviewOn || toReview ? ` · ${toReview} à contrôler` : ''}</span></div>
              <div><b>{paidReq.length}</b><span>payées</span></div>
              <div><b>{delivered.length}</b><span>vidéos livrées · {validated.length} validées</span></div>
              <div><b>{dh(gmv)}</b><span>payé (prix créateurs)</span></div>
            </div>
            <div className="toolbar">
              <select aria-label="Statut" value={rFilter} onChange={(e) => setRFilter(e.target.value)}>
                <option value="ouvertes">En cours ({openReq.length})</option><option value="toutes">Toutes ({rq.length})</option>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]} ({rq.filter((r) => r.status === s).length})</option>)}
              </select>
              <input type="search" placeholder="Marque, créateur, produit…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn sm quiet" onClick={exportRequests}>Exporter en CSV</button>
            </div>
            {rRows.length === 0 ? <p className="empty">{rq.length === 0 ? 'Aucune réservation pour l’instant. Elles apparaissent quand une marque active envoie une demande à un créateur.' : 'Aucune réservation dans cette liste.'}</p>
              : [...rRows].sort((x, y) => Number(y.status === 'controle') - Number(x.status === 'controle')).map((r) => {
                const b = brandById[r.brand_id]; const c = creatorById[r.creator_id];
                return <BookingCard key={r.id} r={r} role="admin" userId={userId} supabase={supabase} say={say} review={reviewBy[r.id] || null} reviewOn={reviewOn}
                  onChange={(n) => setRq((l) => l.map((x) => (x.id === n.id ? n : x)))}
                  contacts={{ brand: b?.phone ? wa(b.phone, `Bonjour ${b.contact_name || ''}, c’est l’équipe Kivora au sujet de votre réservation avec ${r.creator_label}.`) : null,
                    creator: c?.phone ? wa(c.phone, `Bonjour ${c.first_name}, c’est l’équipe Kivora au sujet de ta réservation avec ${r.brand_company}.`) : null }} />;
              })}
          </>)}
        </>)}
      </main>
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  );
}
