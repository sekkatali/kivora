'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CITIES, NICHES, LANGUAGES, frError, dh, WHATSAPP } from '@/lib/data';
import { cleanHandle, cleanPhone, phoneOk } from './CreatorSignup';

type Creator = {
  id: string; first_name: string; last_name: string; phone: string | null; city: string | null; languages: string[]; niches: string[];
  instagram: string | null; tiktok: string | null; followers: number | null; portfolio_url: string | null; desired_rate: number | null;
  ae_status: string | null; bio: string | null; status: 'pending' | 'approved' | 'rejected'; admin_note: string | null; referral_code: string | null;
};
type Pkg = { id: string; title: string; description: string | null; price_mad: number; active: boolean; position: number; _dirty?: boolean };

const STATUS = {
  pending: { ic: '…', t: 'Profil en cours de vérification', d: 'L’équipe regarde ton profil. Complète-le pour passer plus vite : un lien vers tes vidéos et une grille de tarifs.' },
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

  const activePk = pk.filter((p) => p.active);
  const checks = [
    ['Tes réseaux renseignés', !!(c.instagram || c.tiktok)],
    ['Un lien vers tes vidéos', !!c.portfolio_url],
    ['Une présentation de 2 lignes', (c.bio || '').trim().length >= 40],
    ['Au moins 2 tarifs dans ta grille', activePk.length >= 2],
    ['Ton statut auto-entrepreneur', c.ae_status === 'oui' || c.ae_status === 'en_cours'],
  ] as const;
  const score = checks.filter((x) => x[1]).length;

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

  const setP = (id: string, k: keyof Pkg, v: string | number | boolean) => setPk((l) => l.map((p) => (p.id === id ? { ...p, [k]: v, _dirty: true } : p)));
  async function savePkg(p: Pkg) {
    const price = Math.round(Number(p.price_mad));
    if (p.title.trim().length < 2) return say('Donne un nom à ce tarif');
    if (!price || price < 50 || price > 100000) return say('Prix entre 50 et 100 000 DH');
    const { error } = await supabase.from('creator_packages').update({ title: p.title.trim().slice(0, 80), description: p.description?.trim() || null, price_mad: price, active: p.active }).eq('id', p.id);
    if (error) return say(frError(error.message));
    setPk((l) => l.map((x) => (x.id === p.id ? { ...x, price_mad: price, _dirty: false } : x)));
    say('Tarif enregistré');
  }
  async function toggleActive(p: Pkg) {
    const { error } = await supabase.from('creator_packages').update({ active: !p.active }).eq('id', p.id);
    if (error) return say(frError(error.message));
    setPk((l) => l.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
  }
  async function archive(p: Pkg) {
    if (!confirm(`Retirer « ${p.title} » de ta grille ?`)) return;
    const { error } = await supabase.from('creator_packages').update({ archived: true, active: false }).eq('id', p.id);
    if (error) return say(frError(error.message));
    setPk((l) => l.filter((x) => x.id !== p.id));
  }
  async function addPkg() {
    if (pk.length >= 6) return say('6 tarifs maximum');
    const base = activePk[0]?.price_mad || c.desired_rate || 500;
    const suggestion = pk.length === 0 ? { title: 'Vidéo UGC 30 s', description: '1 vidéo, 2 révisions', price_mad: base }
      : pk.length === 1 ? { title: 'Pack 3 vidéos', description: '3 accroches différentes', price_mad: Math.round(base * 2.7 / 10) * 10 }
      : { title: 'Nouveau tarif', description: '', price_mad: base };
    const { data, error } = await supabase.from('creator_packages').insert({ creator_id: c.id, ...suggestion, position: pk.length }).select().single();
    if (error) return say(frError(error.message));
    setPk((l) => [...l, data as Pkg]);
  }

  const link = origin && c.referral_code ? `${origin}/?ref=${c.referral_code}` : '';
  const st = STATUS[c.status];

  return (
    <main className="appwrap">
      <div className="apphead"><h1>Salut {c.first_name || 'toi'}</h1><p>Ton espace créateur : ton profil, ta grille de tarifs et ton lien de parrainage.</p></div>
      <div className={`status ${c.status}`}>
        <span className="ic" aria-hidden="true">{st.ic}</span>
        <div><b>{st.t}</b><p>{st.d}</p>{c.admin_note ? <p style={{ marginTop: 6 }}><b style={{ display: 'inline', fontSize: 'inherit' }}>Message de l’équipe :</b> {c.admin_note}</p> : null}</div>
      </div>

      <div className="cols">
        <div style={{ display: 'grid', gap: 22, minWidth: 0 }}>
          <section className="panel" aria-labelledby="h-grid">
            <div className="ph"><h2 id="h-grid">Ma grille de tarifs</h2><button type="button" className="btn sm ink" onClick={addPkg}>Ajouter un tarif</button></div>
            <p className="small" style={{ color: 'var(--muted)' }}>Ce sont les prix que les marques verront. Une vidéo seule, un pack, ou la diffusion depuis ton compte.</p>
            {pk.length === 0 ? <p className="empty" style={{ background: 'var(--ui-surface)' }}>Aucun tarif pour l’instant. Ajoute au moins une vidéo.</p> : null}
            {pk.map((p) => (
              <div className={`pk${p.active ? '' : ' off'}`} key={p.id}>
                <div className="t">
                  <input aria-label="Nom du tarif" value={p.title} maxLength={80} onChange={(e) => setP(p.id, 'title', e.target.value)} />
                  <input aria-label="Détail" placeholder="Détail (ex. 1 vidéo, 2 révisions)" value={p.description || ''} maxLength={120} onChange={(e) => setP(p.id, 'description', e.target.value)} />
                </div>
                <label className="pr"><input aria-label="Prix en dirhams" type="number" inputMode="numeric" min={50} value={p.price_mad} onChange={(e) => setP(p.id, 'price_mad', e.target.value)} />DH</label>
                <div className="act">
                  {p._dirty ? <button type="button" className="iconbtn" style={{ background: 'var(--forest)', color: '#fff' }} onClick={() => savePkg(p)}>Enregistrer</button> : null}
                  <button type="button" className="iconbtn" onClick={() => toggleActive(p)}>{p.active ? 'Masquer' : 'Afficher'}</button>
                  <button type="button" className="iconbtn" onClick={() => archive(p)}>Retirer</button>
                </div>
              </div>
            ))}
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
            <h2 id="h-help">Ton prix de départ</h2>
            <p className="small" style={{ color: 'var(--muted)' }}>Tu as indiqué {dh(c.desired_rate)} pour une vidéo. Tu peux l’ajuster dans ta grille à tout moment.</p>
            {WHATSAPP ? <a className="btn quiet sm" style={{ justifySelf: 'start' }} href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener">Une question ? WhatsApp</a> : null}
          </section>
        </aside>
      </div>
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </main>
  );
}
