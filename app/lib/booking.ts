/* Réservations directes marque ↔ créateur : statuts et utilitaires partagés (serveur et navigateur). */
export const STATUS_FLOW = ['envoyee', 'acceptee', 'payee', 'livree', 'validee'] as const;
export const ALL_STATUSES = ['envoyee', 'acceptee', 'refusee', 'payee', 'livree', 'revision', 'validee', 'annulee'] as const;
export const STATUS_LABEL: Record<string, string> = {
  envoyee: 'Envoyée', acceptee: 'Acceptée', refusee: 'Refusée', payee: 'Payée', livree: 'Livrée',
  revision: 'Révision demandée', validee: 'Validée', annulee: 'Annulée',
};
export const OPEN_STATUSES = ['envoyee', 'acceptee', 'payee', 'livree', 'revision'];
export const PAID_STATUSES = ['payee', 'livree', 'revision', 'validee'];

export type BookingRequest = {
  id: string; brand_id: string; creator_id: string; brand_company: string | null; creator_label: string | null; base_price: number | null;
  options: { key: string; title: string; price_mad: number }[]; total_mad: number | null; brief: string | null; status: string;
  creator_message: string | null; delivery_url: string | null; revisions: number; admin_note: string | null;
  paid_at: string | null; delivered_at: string | null; validated_at: string | null; created_at: string; updated_at?: string;
};
export type BookingMessage = { id: string; booking_id: string; author_id: string; author_role: 'brand' | 'creator' | 'admin'; body: string; created_at: string };

/** Ce que la personne doit faire maintenant (pour les pastilles et les tris). */
export const needsAction = (r: BookingRequest, role: 'brand' | 'creator' | 'admin') =>
  role === 'creator' ? ['envoyee', 'payee', 'revision'].includes(r.status)
    : role === 'brand' ? r.status === 'livree'
      : r.status === 'acceptee';

export const isMissingTable = (msg?: string) => !!msg && /booking_requests|booking_messages|does not exist|schema cache|PGRST205|42P01/i.test(msg);
