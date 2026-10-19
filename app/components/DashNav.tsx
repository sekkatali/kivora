'use client';
import { useEffect, useState } from 'react';
import { STATUS_FLOW, STATUS_LABEL } from '@/lib/booking';
export { STATUS_FLOW, STATUS_LABEL, isMissingTable, type BookingRequest } from '@/lib/booking';

const PATHS = {
  home: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  inbox: <><path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" /><path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20" /></>,
  building: <><rect x="5" y="3.5" width="14" height="17" rx="1.5" /><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10.5 20.5v-4h3v4" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1.2-3.6 4-5.5 7-5.5s5.8 1.9 7 5.5" /></>,
  users: <><circle cx="8" cy="9" r="3" /><circle cx="17" cy="10" r="2.5" /><path d="M2.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5M14 15.2c2.6-.5 5 .8 6 3.8" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></>,
  tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="8" cy="9" r="1.4" /></>,
};
export type IconName = keyof typeof PATHS;
export type NavItem<T extends string> = { id: T; label: string; icon: IconName; badge?: number; dot?: boolean };

export function NavIcon({ name }: { name: IconName }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PATHS[name]}</svg>;
}

/** Onglet courant, gardé dans l'adresse (#onglet) pour pouvoir partager un lien direct. */
export function useHashTab<T extends string>(ids: readonly T[], fallback: T) {
  const [tab, setTabState] = useState<T>(fallback);
  useEffect(() => {
    const read = () => { const h = window.location.hash.slice(1) as T; if (ids.includes(h)) setTabState(h); };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, [ids]);
  const setTab = (t: T) => {
    setTabState(t);
    window.history.replaceState(null, '', `#${t}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return [tab, setTab] as const;
}

export function DashNav<T extends string>({ items, tab, onChange, label }: { items: NavItem<T>[]; tab: T; onChange: (t: T) => void; label: string }) {
  return (
    <nav className="cd-nav" role="tablist" aria-label={label}>
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={tab === it.id} aria-controls="cd-panel" onClick={() => onChange(it.id)}>
          <NavIcon name={it.icon} /><span>{it.label}</span>
          {it.badge ? <b className="nb">{it.badge}</b> : it.dot ? <i className="dot" title="Modifications non enregistrées" /> : null}
        </button>
      ))}
    </nav>
  );
}

/** Barre d'avancement d'une réservation. */
export function RequestSteps({ status }: { status: string }) {
  if (status === 'annulee' || status === 'refusee') return <span className="tag bad">{STATUS_LABEL[status]}</span>;
  const pos = status === 'revision' || status === 'controle' ? 'livree' : status;
  const i = STATUS_FLOW.indexOf(pos as (typeof STATUS_FLOW)[number]);
  return (
    <ol className="rq-steps" aria-label={`Statut : ${STATUS_LABEL[status] || status}`}>
      {STATUS_FLOW.map((s, k) => <li key={s} className={k < i ? 'done' : k === i ? 'now' : ''}><i /><span>{k === i && status === 'revision' ? 'Révision' : k === i && status === 'controle' ? 'Contrôle' : STATUS_LABEL[s]}</span></li>)}
    </ol>
  );
}
