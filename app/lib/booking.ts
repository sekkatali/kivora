/* Demandes de réservation : statuts et utilitaires partagés (serveur et navigateur). */
export const STATUS_FLOW = ['nouvelle', 'confirmee', 'payee', 'en_tournage', 'livree', 'validee'] as const;
export const STATUS_LABEL: Record<string, string> = {
  nouvelle: 'Demande envoyée', confirmee: 'Confirmée', payee: 'Payée', en_tournage: 'En tournage', livree: 'Livrée', validee: 'Validée', annulee: 'Annulée',
};
export type BookingRequest = {
  id: string; brand_id: string; creator_id: string; brand_company: string | null; creator_label: string | null; base_price: number | null;
  options: { key: string; title: string; price_mad: number }[]; total_mad: number | null; brief: string | null; status: string;
  admin_note: string | null; created_at: string; updated_at?: string;
};

export const isMissingTable = (msg?: string) => !!msg && /booking_requests|does not exist|schema cache|PGRST205|42P01/i.test(msg);
