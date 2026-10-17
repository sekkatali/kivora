'use client';
/* taste-skill-ignore-file : interface d'administration, tableaux de données */
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { dh, frError } from '@/lib/data';

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
type Pkg = { creator_id: string; title: string; price_mad: number; active: boolean };
type Stats = Record<string, number | Record<string, number>>;

/* Palier P1 du plan de lancement */
const GATE = { approved: 100, perNiche: 15, niches: 4, perCity: 15, cities: 3, aePct: 30, cpl: 20 };
const ST_LABEL = { pending: 'À vérifier', approved: 'Vérifié', rejected: 'Refusé' } as const;
const ST_TAG = { pending: 'warn', approved: 'good', rejected: 'bad' } as const;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
const wa = (p: string | null) => (p ? `https://wa.me/${p.replace(/^0/, '212').replace(/^\+/, '').replace(/^00/, '')}` : '');

function csv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = Array.isArray(v) ? v.join(' | ') : v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const body = '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' }));
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

export default function AdminDashboard({ stats, creators, brands, packages, error }: { stats: Stats; creators: Creator[]; brands: Brand[]; packages: Pkg[]; error: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [cr, setCr] = useState(creators);
  const [br, setBr] = useState(brands);
  const [tab, setTab] = useState<'creators' | 'brands'>('creators');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState(error ? `Erreur : ${error}` : '');
  const [spend, setSpend] = useState('');

  useEffect(() => { try { setSpend(localStorage.getItem('kivora-spend') || ''); } catch { /* rien */ } }, []);
  useEffect(() => { try { localStorage.setItem('kivora-spend', spend); } catch { /* rien */ } }, [spend]);
  const say = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  const pkBy = useMemo(() => {
    const m: Record<string, Pkg[]> = {};
    packages.forEach((p) => { (m[p.creator_id] ||= []).push(p); });
    return m;
  }, [packages]);

  /* Indicateurs calculés sur la liste à jour */
  const approved = cr.filter((c) => c.status === 'approved');
  const count = (list: Creator[], key: 'niches' | 'city') => {
    const m: Record<string, number> = {};
    list.forEach((c) => { const vals = key === 'niches' ? c.niches : [c.city || 'Non renseignée']; vals.forEach((v) => { m[v] = (m[v] || 0) + 1; }); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  };
  const nicheA = count(approved, 'niches');
  const cityA = count(approved, 'city');
  const aePct = approved.length ? Math.round((approved.filter((c) => c.ae_status === 'oui' || c.ae_status === 'en_cours').length / approved.length) * 100) : 0;
  const complete = cr.filter((c) => c.portfolio_url && (pkBy[c.id] || []).some((p) => p.active)).length;
  const paid = cr.filter((c) => /meta|facebook|instagram|fb|ig/i.test(c.utm?.utm_source || '')).length;
  const cpl = Number(spend) > 0 && paid ? Number(spend) / paid : null;
  const gates = [
    { l: 'Créateurs vérifiés', v: approved.length, t: GATE.approved, txt: `${approved.length} / ${GATE.approved}` },
    { l: `Niches à ${GATE.perNiche}+ vérifiés`, v: nicheA.filter((x) => x[1] >= GATE.perNiche).length, t: GATE.niches, txt: `${nicheA.filter((x) => x[1] >= GATE.perNiche).length} / ${GATE.niches}` },
    { l: `Villes à ${GATE.perCity}+ vérifiés`, v: cityA.filter((x) => x[1] >= GATE.perCity).length, t: GATE.cities, txt: `${cityA.filter((x) => x[1] >= GATE.perCity).length} / ${GATE.cities}` },
    { l: 'Vérifiés auto-entrepreneurs ou en cours', v: aePct, t: GATE.aePct, txt: `${aePct} % (objectif ${GATE.aePct} %)` },
  ];

  const byDay = (stats.by_day || {}) as Record<string, number>;
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(Date.now() - (29 - i) * 864e5); const k = d.toLocaleDateString('sv-SE', { timeZone: 'Africa/Casablanca' }); return [k, byDay[k] || 0] as const; });
  const dayMax = Math.max(1, ...days.map((d) => d[1]));
  const sources = Object.entries((stats.by_source || {}) as Record<string, number>).sort((a, b) => b[1] - a[1]);

  const ql = q.trim().toLowerCase();
  const rows = cr.filter((c) => (filter === 'all' || c.status === filter) && (!ql || `${c.first_name} ${c.last_name} ${c.city} ${c.profiles?.email} ${c.instagram} ${c.tiktok} ${c.niches.join(' ')}`.toLowerCase().includes(ql)));
  const brows = br.filter((b) => !ql || `${b.company} ${b.contact_name} ${b.profiles?.email} ${b.sector}`.toLowerCase().includes(ql));

  async function setStatus(c: Creator, status: Creator['status']) {
    const { error: e } = await supabase.from('creators').update({ status, admin_note: note.trim() || null }).eq('id', c.id);
    if (e) return say(frError(e.message));
    setCr((l) => l.map((x) => (x.id === c.id ? { ...x, status, admin_note: note.trim() || null, reviewed_at: new Date().toISOString() } : x)));
    say(status === 'approved' ? `${c.first_name} vérifié` : status === 'rejected' ? `${c.first_name} refusé` : 'Remis en attente');
    setOpen(null); router.refresh();
  }
  async function setBrand(b: Brand, status: Brand['status']) {
    const { error: e } = await supabase.from('brands').update({ status }).eq('id', b.id);
    if (e) return say(frError(e.message));
    setBr((l) => l.map((x) => (x.id === b.id ? { ...x, status } : x)));
    say(status === 'active' ? `${b.company} a accès au catalogue` : `${b.company} remis en liste d’attente`);
  }
  const exportCreators = () => csv(cr.map((c) => ({
    prenom: c.first_name, nom: c.last_name, email: c.profiles?.email, whatsapp: c.phone, ville: c.city, niches: c.niches, langues: c.languages,
    instagram: c.instagram, tiktok: c.tiktok, abonnes: c.followers, portfolio: c.portfolio_url, tarif_souhaite: c.desired_rate,
    auto_entrepreneur: c.ae_status, statut: c.status, parrain: c.referred_by, code: c.referral_code,
    source: c.utm?.utm_source, campagne: c.utm?.utm_campaign, annonce: c.utm?.utm_content, inscrit_le: c.created_at,
  })), 'kivora-createurs');
  const exportBrands = () => csv(br.map((b) => ({
    marque: b.company, contact: b.contact_name, email: b.profiles?.email, telephone: b.phone, site: b.website, ice: b.ice, secteur: b.sector,
    budget: b.monthly_budget, statut: b.status, source: b.utm?.utm_source, campagne: b.utm?.utm_campaign, inscrit_le: b.created_at,
  })), 'kivora-marques');

  const pending = cr.filter((c) => c.status === 'pending').length;
  return (
    <main className="appwrap">
      <div className="apphead"><h1>Tableau de bord</h1><p>Préinscriptions, vérification des créateurs et accès des marques.</p></div>

      <div className="tiles">
        <div className="hi"><b>{cr.length}</b><span>créateurs préinscrits</span></div>
        <div><b>{complete}</b><span>profils complets (vidéos + tarif)</span></div>
        <div><b>{approved.length}</b><span>vérifiés · {pending} à vérifier</span></div>
        <div><b>{br.length}</b><span>marques · {br.filter((b) => b.status === 'active').length} actives</span></div>
      </div>

      <div className="cols">
        <section className="panel" aria-labelledby="h-gate">
          <div className="ph"><h2 id="h-gate">Palier 1 : ouvrir aux marques</h2><span className={`tag ${gates.every((g) => g.v >= g.t) ? 'good' : 'warn'}`}>{gates.every((g) => g.v >= g.t) ? '✓ Prêt' : 'En cours'}</span></div>
          <div className="gates">
            {gates.map((g) => (
              <div className="gate" key={g.l}><div className="l"><b>{g.l}</b><span>{g.txt}{g.v >= g.t ? ' ✓' : ''}</span></div>
                <div className="meter" title={g.txt}><i style={{ width: `${Math.min(100, (g.v / g.t) * 100)}%`, background: g.v >= g.t ? 'var(--good)' : undefined }} /></div></div>
            ))}
            <div className="gate"><div className="l"><b>Coût par préinscrit Meta</b><span>{cpl == null ? '—' : `${cpl.toFixed(1).replace('.', ',')} DH${cpl < GATE.cpl ? ' ✓' : ''}`} (objectif &lt; {GATE.cpl} DH)</span></div>
              <label className="toolbar small">Dépense pub cumulée <input style={{ width: 120, background: 'var(--ui-surface)' }} type="number" inputMode="numeric" value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="DH" /> pour {paid} préinscrits venus de Meta</label></div>
          </div>
        </section>
        <section className="panel" aria-labelledby="h-day">
          <h2 id="h-day">Préinscriptions, 30 derniers jours</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30,1fr)', gap: 2, alignItems: 'end', height: 120 }} role="img" aria-label="Préinscriptions par jour">
            {days.map(([d, v]) => <span key={d} title={`${fmtDate(d)} : ${v}`} style={{ display: 'block', height: `${Math.max(v ? 6 : 2, (v / dayMax) * 120)}px`, background: v ? 'var(--forest)' : 'var(--ui-surface)', borderRadius: '4px 4px 0 0' }} />)}
          </div>
          <div className="l small" style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)' }}><span>{fmtDate(days[0][0])}</span><span>max {dayMax} / jour</span><span>aujourd’hui</span></div>
          <h2>Sources</h2>
          <div className="dist">{sources.length ? sources.slice(0, 6).map(([s, v]) => (
            <div key={s}><span>{s}</span><span className="meter"><i style={{ width: `${(v / Math.max(1, cr.length)) * 100}%` }} /></span><span>{v}</span></div>
          )) : <p className="small" style={{ color: 'var(--muted)' }}>Aucune préinscription pour l’instant.</p>}</div>
        </section>
      </div>

      <div className="cols">
        <section className="panel" aria-labelledby="h-n"><h2 id="h-n">Vérifiés par niche</h2>
          <div className="dist">{nicheA.length ? nicheA.slice(0, 8).map(([n, v]) => <div key={n}><span>{n}</span><span className="meter"><i className={v >= GATE.perNiche ? 'ok' : ''} style={{ width: `${Math.min(100, (v / GATE.perNiche) * 100)}%` }} /></span><span>{v}</span></div>) : <p className="small" style={{ color: 'var(--muted)' }}>Aucun créateur vérifié.</p>}</div></section>
        <section className="panel" aria-labelledby="h-c"><h2 id="h-c">Vérifiés par ville</h2>
          <div className="dist">{cityA.length ? cityA.slice(0, 8).map(([n, v]) => <div key={n}><span>{n}</span><span className="meter"><i className={v >= GATE.perCity ? 'ok' : ''} style={{ width: `${Math.min(100, (v / GATE.perCity) * 100)}%` }} /></span><span>{v}</span></div>) : <p className="small" style={{ color: 'var(--muted)' }}>Aucun créateur vérifié.</p>}</div></section>
      </div>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Liste">
          <button aria-pressed={tab === 'creators'} onClick={() => setTab('creators')}>Créateurs ({cr.length})</button>
          <button aria-pressed={tab === 'brands'} onClick={() => setTab('brands')}>Marques ({br.length})</button>
        </div>
        {tab === 'creators' ? (
          <div className="seg" role="group" aria-label="Statut">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((s) => <button key={s} aria-pressed={filter === s} onClick={() => setFilter(s)}>{s === 'all' ? 'Tous' : ST_LABEL[s]}</button>)}
          </div>
        ) : null}
        <input type="search" placeholder="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn sm quiet" onClick={tab === 'creators' ? exportCreators : exportBrands}>Exporter en CSV</button>
      </div>

      {tab === 'creators' ? (
        rows.length === 0 ? <p className="empty">Aucun créateur dans cette liste.</p> : (
          <div className="tbl"><table>
            <thead><tr><th>Créateur</th><th>Ville</th><th>Niches</th><th>Réseaux</th><th>Tarif</th><th>Auto-entr.</th><th>Statut</th><th>Inscrit</th></tr></thead>
            <tbody>{rows.map((c) => {
              const isOpen = open === c.id;
              return [
                <tr key={c.id} className={isOpen ? 'open' : ''}>
                  <td><button className="rowbtn" onClick={() => { setOpen(isOpen ? null : c.id); setNote(c.admin_note || ''); }} aria-expanded={isOpen}>{c.first_name} {c.last_name}</button><span className="sub">{c.profiles?.email}</span></td>
                  <td>{c.city}</td>
                  <td>{c.niches.join(', ')}</td>
                  <td>{c.instagram ? <a className="link" href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noopener nofollow">IG</a> : null} {c.tiktok ? <a className="link" href={`https://tiktok.com/@${c.tiktok}`} target="_blank" rel="noopener nofollow">TT</a> : null}<span className="sub">{c.followers ? `${c.followers.toLocaleString('fr-FR')} abonnés` : ''}</span></td>
                  <td>{dh(c.desired_rate)}</td>
                  <td>{c.ae_status ? AE_SHORT[c.ae_status] : '—'}</td>
                  <td><span className={`tag ${ST_TAG[c.status]}`}>{ST_LABEL[c.status]}</span></td>
                  <td>{fmtDate(c.created_at)}<span className="sub">{c.utm?.utm_source || 'direct'}</span></td>
                </tr>,
                isOpen ? (
                  <tr key={c.id + '-d'} className="open"><td colSpan={8}>
                    <dl className="detail">
                      <div><dt>WhatsApp</dt><dd>{c.phone ? <a className="link" href={wa(c.phone)} target="_blank" rel="noopener">{c.phone}</a> : '—'}</dd></div>
                      <div><dt>Langues</dt><dd>{c.languages.join(', ') || '—'}</dd></div>
                      <div><dt>Portfolio</dt><dd>{c.portfolio_url ? <a className="link" href={c.portfolio_url} target="_blank" rel="noopener nofollow">Ouvrir</a> : '—'}</dd></div>
                      <div><dt>Grille</dt><dd>{(pkBy[c.id] || []).map((p) => `${p.title} · ${dh(p.price_mad)}${p.active ? '' : ' (masqué)'}`).join(' — ') || '—'}</dd></div>
                      <div><dt>Parrainé par</dt><dd>{c.referred_by || '—'} · code {c.referral_code}</dd></div>
                      <div><dt>Campagne</dt><dd>{[c.utm?.utm_campaign, c.utm?.utm_content].filter(Boolean).join(' / ') || '—'}</dd></div>
                      <div className="wide"><dt>Présentation</dt><dd>{c.bio || '—'}</dd></div>
                      <label className="f wide"><span>Message au créateur <em>(visible dans son espace)</em></span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Ajoute 2 vidéos face caméra avec un meilleur son." /></label>
                      <div className="wide toolbar">
                        <button className="btn sm ink" onClick={() => setStatus(c, 'approved')}>Vérifier</button>
                        <button className="btn sm quiet" onClick={() => setStatus(c, 'rejected')}>Refuser</button>
                        {c.status !== 'pending' ? <button className="btn sm quiet" onClick={() => setStatus(c, 'pending')}>Remettre à vérifier</button> : null}
                      </div>
                    </dl>
                  </td></tr>
                ) : null,
              ];
            })}</tbody>
          </table></div>
        )
      ) : (
        brows.length === 0 ? <p className="empty">Aucune marque pour l’instant.</p> : (
          <div className="tbl"><table>
            <thead><tr><th>Marque</th><th>Contact</th><th>Secteur</th><th>Budget</th><th>Statut</th><th>Inscrite</th><th /></tr></thead>
            <tbody>{brows.map((b) => (
              <tr key={b.id}>
                <td><b style={{ fontWeight: 500 }}>{b.company}</b><span className="sub">{b.website}</span></td>
                <td>{b.contact_name}<span className="sub">{b.profiles?.email}</span><span className="sub">{b.phone ? <a className="link" href={wa(b.phone)} target="_blank" rel="noopener">{b.phone}</a> : null}</span></td>
                <td>{b.sector}</td>
                <td>{b.monthly_budget || '—'}</td>
                <td><span className={`tag ${b.status === 'active' ? 'good' : 'warn'}`}>{b.status === 'active' ? 'Accès ouvert' : 'Liste d’attente'}</span></td>
                <td>{fmtDate(b.created_at)}<span className="sub">{b.utm?.utm_source || 'direct'}</span></td>
                <td>{b.status === 'active'
                  ? <button className="btn sm quiet" onClick={() => setBrand(b, 'waitlist')}>Retirer l’accès</button>
                  : <button className="btn sm ink" onClick={() => setBrand(b, 'active')}>Ouvrir l’accès</button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )
      )}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </main>
  );
}
