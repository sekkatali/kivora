'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CITIES, NICHES, SECTORS, BUDGETS, dh, initials, toneFor, frError, WHATSAPP } from '@/lib/data';
import { track } from '@/lib/track';

type Brand = { id: string; company: string; contact_name: string | null; phone: string | null; website: string | null; ice: string | null; sector: string | null; monthly_budget: string | null; status: 'waitlist' | 'active' };
type Card = { id: string; first_name: string; last_initial: string; city: string | null; languages: string[]; niches: string[]; instagram: string | null; tiktok: string | null; followers: number | null; portfolio_url: string | null; bio: string | null; min_price: number | null; packages: { key: string; title: string; price_mad: number }[] };

export default function BrandDashboard({ brand }: { brand: Brand }) {
  const supabase = useMemo(() => createClient(), []);
  const [b, setB] = useState(brand);
  const [saved, setSaved] = useState(brand);
  const [msg, setMsg] = useState('');
  const [list, setList] = useState<Card[] | null>(null);
  const [city, setCity] = useState('');
  const [niche, setNiche] = useState('');
  const [max, setMax] = useState('');
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const pick = (id: string, key: string) => setPicked((x) => { const cur = x[id] || []; return { ...x, [id]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] }; });
  const total = (c: Card) => (c.min_price || 0) + c.packages.filter((p) => (picked[c.id] || []).includes(p.key)).reduce((a, p) => a + p.price_mad, 0);

  useEffect(() => {
    if (b.status !== 'active') return;
    supabase.rpc('get_catalog', { p_city: city || null, p_niche: niche || null }).then(({ data, error }) => {
      if (error) { setMsg(frError(error.message)); setList([]); } else setList((data as Card[]) || []);
    });
  }, [supabase, b.status, city, niche]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const patch = { company: b.company.trim(), contact_name: b.contact_name, phone: b.phone, website: b.website, ice: b.ice, sector: b.sector, monthly_budget: b.monthly_budget };
    const { error } = await supabase.from('brands').update(patch).eq('id', b.id);
    if (error) return setMsg(frError(error.message));
    setSaved(b); setMsg('Informations enregistrées');
  }
  const set = (k: keyof Brand, v: string) => { setB((x) => ({ ...x, [k]: v })); setMsg(''); };
  const ask = (c: Card) => {
    const chosen = c.packages.filter((p) => (picked[c.id] || []).includes(p.key));
    const sum = total(c);
    track('Contact', { content_name: 'reservation', value: sum, currency: 'MAD' });
    const text = `Bonjour Kivora, ${b.company} souhaite réserver une vidéo avec ${c.first_name} ${c.last_initial}. (${c.city || ''})${chosen.length ? ` Options : ${chosen.map((p) => p.title).join(', ')}.` : ''} Total affiché : ${dh(sum)}.`;
    window.open(WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}` : `mailto:?subject=${encodeURIComponent('Réservation Kivora')}&body=${encodeURIComponent(text)}`, '_blank');
  };

  const shown = (list || []).filter((c) => !max || (c.min_price ?? 0) <= Number(max));

  return (
    <main className="appwrap">
      <div className="apphead"><h1>{b.company || 'Votre marque'}</h1>
        <p>{b.status === 'active' ? 'Votre accès au catalogue est ouvert. Choisissez un créateur et un tarif : on organise la réservation avec vous.' : 'Vous êtes sur la liste d’accès anticipé. On vous recontacte pour la démo et l’ouverture de votre accès.'}</p></div>

      {b.status !== 'active' ? (
        <div className="status pending"><span className="ic" aria-hidden="true">…</span><div><b>Accès anticipé demandé</b><p>Les premières marques sont invitées par vagues, dès que le catalogue est complet dans votre secteur.</p></div></div>
      ) : (
        <section style={{ display: 'grid', gap: 16 }} aria-label="Catalogue">
          <div className="toolbar">
            <select aria-label="Ville" value={city} onChange={(e) => setCity(e.target.value)}><option value="">Toutes les villes</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
            <select aria-label="Niche" value={niche} onChange={(e) => setNiche(e.target.value)}><option value="">Toutes les niches</option>{NICHES.map((c) => <option key={c}>{c}</option>)}</select>
            <select aria-label="Budget" value={max} onChange={(e) => setMax(e.target.value)}><option value="">Tous les prix</option>{[500, 800, 1200, 2000].map((v) => <option key={v} value={v}>Jusqu’à {dh(v)}</option>)}</select>
            <span className="small" style={{ color: 'var(--muted)' }}>{list ? `${shown.length} créateur${shown.length > 1 ? 's' : ''}` : 'Chargement…'}</span>
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
                <div className="pkl">
                  <div><span>Vidéo UGC<small>jusqu’à 30 s, 2 révisions</small></span><b>{dh(c.min_price)}</b></div>
                  {c.packages.map((p) => (
                    <label key={p.key} className="optcheck" style={{ background: 'var(--ui-surface)', borderRadius: 10, padding: '9px 12px', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={(picked[c.id] || []).includes(p.key)} onChange={() => pick(c.id, p.key)} />{p.title}</span>
                      <b style={{ fontWeight: 500 }}>+ {dh(p.price_mad)}</b>
                    </label>
                  ))}
                </div>
                <button className="btn ink" onClick={() => ask(c)}>Réserver · {dh(total(c))}</button>
              </article>
            ))}
          </div>
        </section>
      )}

      <form className="panel" onSubmit={save} noValidate aria-labelledby="h-b">
        <h2 id="h-b">Informations de la marque</h2>
        <div className="fields two">
          <label className="f"><span>Marque</span><input value={b.company} onChange={(e) => set('company', e.target.value)} /></label>
          <label className="f"><span>Contact</span><input value={b.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} /></label>
          <label className="f"><span>Téléphone</span><input type="tel" value={b.phone || ''} onChange={(e) => set('phone', e.target.value)} /></label>
          <label className="f"><span>Site ou Instagram</span><input value={b.website || ''} onChange={(e) => set('website', e.target.value)} /></label>
          <label className="f"><span>ICE <em>(pour vos factures)</em></span><input inputMode="numeric" value={b.ice || ''} onChange={(e) => set('ice', e.target.value)} /></label>
          <label className="f"><span>Secteur</span><select value={b.sector || ''} onChange={(e) => set('sector', e.target.value)}><option value="">Choisir…</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label className="f"><span>Budget vidéo par mois</span><select value={b.monthly_budget || ''} onChange={(e) => set('monthly_budget', e.target.value)}><option value="">Choisir…</option>{BUDGETS.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
        {msg ? <p className={msg.includes('enregistr') ? 'okbox' : 'err'} role="status">{msg}</p> : null}
        <button className="btn ink" style={{ justifySelf: 'start' }} disabled={JSON.stringify(b) === JSON.stringify(saved)}>Enregistrer</button>
      </form>
    </main>
  );
}
