'use client';
import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { dh, frError } from '@/lib/data';
import { ALL_STATUSES, STATUS_LABEL, needsAction, type BookingMessage, type BookingRequest, type BookingReview } from '@/lib/booking';
import { RequestSteps } from './DashNav';

type Role = 'brand' | 'creator' | 'admin';
const ROLE_NAME: Record<Role, string> = { brand: 'Marque', creator: 'Créateur', admin: 'Kivora' };
const fmt = (s: string) => new Date(s).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Une réservation, avec les actions de la personne connectée et la conversation. */
export default function BookingCard({ r, role, userId, supabase, onChange, say, contacts, review = null, reviewOn = false }: {
  r: BookingRequest; role: Role; userId: string; supabase: SupabaseClient;
  onChange: (r: BookingRequest) => void; say: (m: string) => void;
  contacts?: { brand?: string | null; creator?: string | null };
  /** Vidéo en contrôle Kivora (créateur et admin seulement). */
  review?: BookingReview | null;
  /** La validation des contenus par Kivora est activée. */
  reviewOn?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(r.creator_message || '');
  const [link, setLink] = useState(r.delivery_url || '');
  const [thread, setThread] = useState<BookingMessage[] | null>(null);
  const [showThread, setShowThread] = useState(false);
  const [text, setText] = useState('');
  const [admin, setAdmin] = useState(false);
  const [aStatus, setAStatus] = useState(r.status);
  const [aNote, setANote] = useState(r.admin_note || '');
  const [rv, setRv] = useState<BookingReview | null>(review);
  const [fix, setFix] = useState('');
  const [fixing, setFixing] = useState(false);

  async function update(patch: Partial<BookingRequest>, done: string) {
    setBusy(true);
    const { data, error } = await supabase.from('booking_requests').update(patch).eq('id', r.id).select().single();
    setBusy(false);
    if (error) return say(frError(error.message));
    const n = data as BookingRequest;
    if (n.status === 'controle' && patch.delivery_url) {
      setRv({ booking_id: r.id, url: patch.delivery_url, decision: 'en_attente', note: null, submitted_at: new Date().toISOString(), decided_at: null });
      done = 'Vidéo envoyée : Kivora la vérifie avant de la transmettre à la marque';
    }
    onChange(n); say(done);
  }
  /** Admin : valider la vidéo contrôlée (elle part à la marque) ou demander une correction au créateur. */
  async function decide(ok: boolean) {
    if (!ok && !fix.trim()) return say('Explique au créateur ce qu’il doit corriger');
    setBusy(true);
    const { data, error } = await supabase.rpc('review_delivery', { p_booking: r.id, p_ok: ok, p_note: ok ? null : fix.trim() });
    setBusy(false);
    if (error) return say(frError(error.message));
    if (rv) setRv({ ...rv, decision: ok ? 'approuvee' : 'a_corriger', note: ok ? rv.note : fix.trim(), decided_at: new Date().toISOString() });
    setFix(''); setFixing(false);
    onChange(data as BookingRequest);
    say(ok ? 'Vidéo validée : la marque la reçoit' : 'Correction demandée au créateur');
  }
  async function openThread() {
    const next = !showThread; setShowThread(next);
    if (next && thread === null) {
      const { data, error } = await supabase.from('booking_messages').select('*').eq('booking_id', r.id).order('created_at');
      if (error) { say(frError(error.message)); setThread([]); } else setThread((data as BookingMessage[]) || []);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim(); if (!body) return;
    const { data, error } = await supabase.from('booking_messages').insert({ booking_id: r.id, author_id: userId, author_role: role, body: body.slice(0, 2000) }).select().single();
    if (error) return say(frError(error.message));
    setThread((t) => [...(t || []), data as BookingMessage]); setText('');
  }

  const title = role === 'brand' ? r.creator_label : role === 'creator' ? r.brand_company : `${r.brand_company} → ${r.creator_label}`;
  const todo = needsAction(r, role);
  const left = 2 - (r.revisions || 0);

  return (
    <article className={`rq${todo ? ' todo-on' : ''}`}>
      <div className="rq-h">
        <div><b>{title || '—'}</b><span>{fmt(r.created_at)} · {STATUS_LABEL[r.status]}{r.revisions ? ` · ${r.revisions} révision${r.revisions > 1 ? 's' : ''}` : ''}</span></div>
        <span className="amt">{dh(r.total_mad)}</span>
      </div>
      <RequestSteps status={r.status} />
      <div className="rq-opts"><span>Vidéo {dh(r.base_price)}</span>{(r.options || []).map((o) => <span key={o.key}>{o.title} +{dh(o.price_mad)}</span>)}</div>
      {r.brief ? <details><summary className="small muted">Le brief</summary><p className="small pre">{r.brief}</p></details> : null}
      {r.creator_message ? <p className="rq-say"><b>{r.creator_label} :</b> {r.creator_message}</p> : null}
      {r.delivery_url ? <p className="small"><b>{r.status === 'controle' ? 'Version précédente :' : 'Vidéo livrée :'}</b> <a className="link" href={r.delivery_url} target="_blank" rel="noopener nofollow">ouvrir le lien</a></p> : null}
      {r.admin_note ? <p className="rq-note"><b>Kivora :</b> {r.admin_note}</p> : null}

      {/* ---------- actions du créateur ---------- */}
      {role === 'creator' && r.status === 'envoyee' ? (
        <div className="rq-act">
          <label className="f"><span>Un mot pour la marque <em>(facultatif)</em></span><input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex. Avec plaisir ! Envoie-moi le produit à Casablanca." /></label>
          <div className="savebar">
            <button className="btn ink" disabled={busy} onClick={() => update({ status: 'acceptee', creator_message: msg.trim() || null }, 'Demande acceptée')}>Accepter</button>
            <button className="btn quiet" disabled={busy} onClick={() => { if (confirm('Refuser cette demande ?')) update({ status: 'refusee', creator_message: msg.trim() || null }, 'Demande refusée'); }}>Refuser</button>
          </div>
        </div>
      ) : null}
      {role === 'creator' && r.status === 'acceptee' ? <p className="small muted">La marque règle sa commande à Kivora. Tu reçois une notification dès que c’est payé : tu pourras alors tourner.</p> : null}
      {role === 'creator' && r.status === 'controle' ? (
        <p className="rq-note">Ta vidéo est entre les mains de Kivora pour un contrôle qualité{rv ? <> (<a className="link" href={rv.url} target="_blank" rel="noopener nofollow">ton lien</a>)</> : null}. Elle part à la marque dès qu’elle est validée, en général sous 24 heures.</p>
      ) : null}
      {role === 'creator' && (r.status === 'payee' || r.status === 'revision') ? (
        <div className="rq-act">
          {rv?.decision === 'a_corriger' ? <p className="rq-note"><b>Kivora demande une correction :</b> {rv.note}</p>
            : r.status === 'revision' ? <p className="rq-note">La marque demande une révision. Regarde ses remarques dans la conversation, puis livre la nouvelle version.</p> : null}
          <label className="f"><span>Lien de la vidéo</span><input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/…" /><small>Drive, WeTransfer ou Dropbox. La marque doit pouvoir la télécharger.{reviewOn ? ' Kivora la vérifie avant de l’envoyer à la marque.' : ''}</small></label>
          <button className="btn ink" style={{ justifySelf: 'start' }} disabled={busy || !/^https?:\/\/\S+\.\S+/.test(link.trim())} onClick={() => update({ status: 'livree', delivery_url: link.trim() }, 'Vidéo livrée')}>Livrer la vidéo</button>
        </div>
      ) : null}

      {/* ---------- actions de la marque ---------- */}
      {role === 'brand' && r.status === 'envoyee' ? <p className="small muted">Le créateur accepte ou refuse votre demande, en général sous 48 heures.</p> : null}
      {role === 'brand' && r.status === 'acceptee' ? <p className="rq-note">{r.creator_label} a accepté. Kivora vous envoie le lien de paiement ; le tournage commence dès réception.</p> : null}
      {role === 'brand' && r.status === 'controle' ? <p className="rq-note">{r.creator_label} a livré{r.revisions ? ' la nouvelle version' : ' la vidéo'}. Kivora fait un contrôle qualité avant de vous l’envoyer, en général sous 24 heures.</p> : null}
      {role === 'brand' && r.status === 'livree' ? (
        <div className="rq-act">
          <p className="small">Regardez la vidéo, puis validez-la. La validation déclenche le paiement du créateur et vous cède les droits publicitaires.</p>
          <div className="savebar">
            <button className="btn ink" disabled={busy} onClick={() => update({ status: 'validee' }, 'Vidéo validée')}>Valider la vidéo</button>
            {left > 0 ? <button className="btn quiet" disabled={busy} onClick={() => { setShowThread(true); if (thread === null) openThread(); update({ status: 'revision' }, 'Révision demandée : précisez vos remarques dans la conversation'); }}>Demander une révision ({left} restante{left > 1 ? 's' : ''})</button> : <span className="small muted">Les deux révisions ont été utilisées.</span>}
          </div>
        </div>
      ) : null}
      {role === 'brand' && ['envoyee', 'acceptee'].includes(r.status) ? (
        <button className="link small" style={{ justifySelf: 'start' }} disabled={busy} onClick={() => { if (confirm('Annuler cette demande ?')) update({ status: 'annulee' }, 'Demande annulée'); }}>Annuler la demande</button>
      ) : null}

      {/* ---------- supervision ---------- */}
      {role === 'admin' && r.status === 'controle' ? (
        <div className="rq-act rq-review">
          <p className="small"><b>À contrôler</b>{rv ? <> · envoyée le {fmt(rv.submitted_at)}</> : null}. La marque ne voit pas cette vidéo tant que tu ne l’as pas validée.</p>
          {rv ? <a className="btn quiet sm" style={{ justifySelf: 'start' }} href={rv.url} target="_blank" rel="noopener nofollow">Regarder la vidéo</a> : <p className="small muted">Lien introuvable : recharge la page.</p>}
          {fixing ? (
            <label className="f"><span>Ce que le créateur doit corriger <em>(lui seul le voit)</em></span><textarea rows={2} value={fix} onChange={(e) => setFix(e.target.value)} placeholder="Ex. Le son est trop bas et le produit n’apparaît pas dans les 3 premières secondes." /></label>
          ) : null}
          <div className="savebar">
            {fixing ? <>
              <button className="btn ink sm" disabled={busy || !fix.trim()} onClick={() => decide(false)}>Renvoyer au créateur</button>
              <button className="btn quiet sm" disabled={busy} onClick={() => setFixing(false)}>Annuler</button>
            </> : <>
              <button className="btn ink sm" disabled={busy} onClick={() => decide(true)}>Valider et envoyer à la marque</button>
              <button className="btn quiet sm" disabled={busy} onClick={() => setFixing(true)}>Demander une correction</button>
            </>}
          </div>
        </div>
      ) : null}
      {role === 'admin' && r.status !== 'controle' && rv?.decision === 'approuvee' ? <p className="small muted">✓ Contrôlée par Kivora le {fmt(rv.decided_at || rv.submitted_at)}</p> : null}
      {role === 'admin' && r.status !== 'controle' && rv?.decision === 'a_corriger' ? <p className="small muted">Correction demandée au créateur : {rv.note}</p> : null}
      {role === 'admin' ? (
        <div className="rq-act">
          <div className="savebar">
            {r.status === 'acceptee' ? <button className="btn ink sm" disabled={busy} onClick={() => update({ status: 'payee' }, 'Marquée payée')}>Marquer payée</button> : null}
            {contacts?.brand ? <a className="btn quiet sm" href={contacts.brand} target="_blank" rel="noopener">WhatsApp marque</a> : null}
            {contacts?.creator ? <a className="btn quiet sm" href={contacts.creator} target="_blank" rel="noopener">WhatsApp créateur</a> : null}
            <button className="link small" onClick={() => setAdmin(!admin)}>{admin ? 'Fermer' : 'Intervenir'}</button>
          </div>
          {admin ? (
            <div className="rq-admin">
              <label className="f"><span>Statut</span><select value={aStatus} onChange={(e) => setAStatus(e.target.value)}>{ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}</select></label>
              <label className="f"><span>Note visible par la marque et le créateur</span><input value={aNote} onChange={(e) => setANote(e.target.value)} placeholder="Ex. Litige en cours : la vidéo sera retournée avant le 25 octobre." /></label>
              <button className="btn ink sm" disabled={busy} onClick={() => update({ status: aStatus, admin_note: aNote.trim() || null }, 'Réservation corrigée')}>Enregistrer</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ---------- conversation ---------- */}
      <button className="link small" style={{ justifySelf: 'start' }} onClick={openThread}>{showThread ? 'Masquer la conversation' : 'Conversation'}</button>
      {showThread ? (
        <div className="thread">
          {thread === null ? <p className="small muted">Chargement…</p> : thread.length === 0 ? <p className="small muted">Aucun message. Utilisez la conversation pour l’envoi du produit, les remarques et les questions.</p>
            : thread.map((m) => (
              <div key={m.id} className={`msg ${m.author_id === userId ? 'me' : ''} ${m.author_role}`}>
                <span>{ROLE_NAME[m.author_role]} · {fmt(m.created_at)}</span><p>{m.body}</p>
              </div>
            ))}
          {r.status !== 'annulee' && r.status !== 'refusee' ? (
            <form className="savebar" onSubmit={send}>
              <input className="thread-in" value={text} onChange={(e) => setText(e.target.value)} placeholder="Écrire un message…" aria-label="Message" />
              <button className="btn ink sm" disabled={!text.trim()}>Envoyer</button>
            </form>
          ) : null}
          <p className="small muted">Pour votre protection, gardez les échanges et les paiements sur Kivora.</p>
        </div>
      ) : null}
    </article>
  );
}
