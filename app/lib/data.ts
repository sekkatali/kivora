export const CITIES = [
  'Casablanca', 'Rabat', 'Marrakech', 'Tanger', 'Fès', 'Agadir', 'Meknès', 'Kénitra',
  'Oujda', 'Tétouan', 'El Jadida', 'Salé', 'Mohammédia', 'Témara', 'Autre ville',
];

export const NICHES = [
  'Beauté', 'Skincare', 'Mode', 'Food', 'Fitness', 'Famille', 'Tech', 'Maison',
  'Voyage', 'Auto', 'Finance', 'Gaming', 'Animaux', 'Santé',
];

export const LANGUAGES = ['Darija', 'Français', 'Arabe', 'Amazigh', 'Anglais', 'Espagnol'];

export const AE_LABEL: Record<string, string> = {
  oui: 'Oui, je suis auto-entrepreneur',
  en_cours: 'En cours d’inscription',
  non: 'Pas encore',
};

export const SECTORS = [
  'Cosmétique et beauté', 'Mode et accessoires', 'Alimentation et boissons', 'E-commerce',
  'Tech et télécoms', 'Santé et bien-être', 'Maison et déco', 'Tourisme et restauration',
  'Banque et assurance', 'Agence marketing', 'Autre',
];

export const BUDGETS = ['Moins de 5 000 DH', '5 000 à 15 000 DH', '15 000 à 50 000 DH', 'Plus de 50 000 DH'];

export const RATE_HINTS = [300, 500, 800, 1200];

export const dh = (n: number | null | undefined) =>
  n == null ? '—' : Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' DH';

export const initials = (first?: string | null, last?: string | null) =>
  ((first?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase() || 'K';

const TONES = ['#e0527a', '#3f8f5a', '#3d63c9', '#1f8a8a', '#c98a1a', '#b8434b', '#2e7fa8', '#7f8a2e', '#c2557a'];
export const toneFor = (id: string) => {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP || '';

/** Traduit les erreurs Supabase les plus courantes. */
export function frError(message?: string): string {
  if (!message) return 'Une erreur est survenue. Réessaie dans un instant.';
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return 'Un compte existe déjà avec cette adresse. Connecte-toi.';
  if (m.includes('invalid login')) return 'Adresse ou mot de passe incorrect.';
  if (m.includes('email not confirmed')) return 'Confirme d’abord ton adresse : clique sur le lien reçu par e-mail.';
  if (m.includes('password should be') || m.includes('weak')) return 'Mot de passe trop faible : 8 caractères minimum.';
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patiente quelques minutes.';
  if (m.includes('invalid email') || m.includes('unable to validate email')) return 'Adresse e-mail invalide.';
  if (m.includes('fetch')) return 'Connexion impossible. Vérifie ton réseau.';
  return message;
}
