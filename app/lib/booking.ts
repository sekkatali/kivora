/* Réservations directes marque ↔ créateur : statuts et utilitaires partagés (serveur et navigateur). */
export const STATUS_FLOW = ['envoyee', 'acceptee', 'payee', 'livree', 'validee'] as const;
export const ALL_STATUSES = ['envoyee', 'acceptee', 'refusee', 'payee', 'controle', 'livree', 'revision', 'validee', 'annulee'] as const;
export const STATUS_LABEL: Record<string, string> = {
  envoyee: 'Envoyée', acceptee: 'Acceptée', refusee: 'Refusée', payee: 'Payée', controle: 'Contrôle Kivora', livree: 'Livrée',
  revision: 'Révision demandée', validee: 'Validée', annulee: 'Annulée',
};
export const OPEN_STATUSES = ['envoyee', 'acceptee', 'payee', 'controle', 'livree', 'revision'];
export const PAID_STATUSES = ['payee', 'controle', 'livree', 'revision', 'validee'];

export type BookingRequest = {
  id: string; brand_id: string; creator_id: string; brand_company: string | null; creator_label: string | null; base_price: number | null;
  options: { key: string; title: string; price_mad: number }[]; total_mad: number | null; brief: string | null; status: string;
  creator_message: string | null; delivery_url: string | null; revisions: number; admin_note: string | null;
  paid_at: string | null; delivered_at: string | null; validated_at: string | null; created_at: string; updated_at?: string;
};
/** Vidéo soumise au contrôle Kivora : lisible par le créateur et l'admin seulement. */
export type BookingReview = { booking_id: string; url: string; decision: 'en_attente' | 'approuvee' | 'a_corriger'; note: string | null; submitted_at: string; decided_at: string | null };
export type BookingMessage = { id: string; booking_id: string; author_id: string; author_role: 'brand' | 'creator' | 'admin'; body: string; created_at: string };

/** Ce que la personne doit faire maintenant (pour les pastilles et les tris). */
export const needsAction = (r: BookingRequest, role: 'brand' | 'creator' | 'admin') =>
  role === 'creator' ? ['envoyee', 'payee', 'revision'].includes(r.status)
    : role === 'brand' ? r.status === 'livree'
      : r.status === 'acceptee' || r.status === 'controle';

export const isMissingTable = (msg?: string) => !!msg && /booking_requests|booking_messages|booking_reviews|platform_settings|does not exist|schema cache|PGRST205|42P01/i.test(msg);
