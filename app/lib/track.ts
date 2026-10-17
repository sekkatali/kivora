'use client';

declare global {
  interface Window { fbq?: (...args: unknown[]) => void }
}

const KEY = 'kivora-attrib';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid'];

/** Mémorise les UTM et le code de parrainage de la première visite (30 jours). */
export function captureAttribution() {
  try {
    const p = new URLSearchParams(window.location.search);
    const found: Record<string, string> = {};
    UTM_KEYS.forEach((k) => { const v = p.get(k); if (v) found[k] = v.slice(0, 200); });
    const ref = p.get('ref');
    const prev = readAttribution();
    if (Object.keys(found).length || ref) {
      const next = {
        utm: Object.keys(found).length ? { ...found, landing: window.location.pathname } : prev.utm,
        ref: ref ? ref.slice(0, 12).toUpperCase() : prev.ref,
        at: Date.now(),
      };
      localStorage.setItem(KEY, JSON.stringify(next));
    } else if (!prev.at && document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (!host.endsWith(window.location.hostname)) {
        localStorage.setItem(KEY, JSON.stringify({ utm: { utm_source: host, landing: window.location.pathname }, ref: null, at: Date.now() }));
      }
    }
  } catch { /* stockage indisponible : on continue sans */ }
}

export function readAttribution(): { utm: Record<string, string>; ref: string | null; at?: number } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { utm: {}, ref: null };
    const v = JSON.parse(raw);
    if (v.at && Date.now() - v.at > 30 * 864e5) return { utm: {}, ref: null };
    return { utm: v.utm || {}, ref: v.ref || null, at: v.at };
  } catch { return { utm: {}, ref: null }; }
}

/** Événement Meta : pixel navigateur + API Conversions côté serveur, dédupliqués par eventID. */
export function track(event: 'Lead' | 'CompleteRegistration' | 'ViewContent' | 'Contact', data: Record<string, unknown> = {}, email?: string) {
  const eventId = `${event}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try { window.fbq?.('track', event, data, { eventID: eventId }); } catch { /* pixel bloqué */ }
  try {
    fetch('/api/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, eventId, email, url: window.location.href, data }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* hors ligne */ }
}
