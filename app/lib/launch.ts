/**
 * Mode lancement (préinscription créateurs) : actif par défaut.
 * L'accueil affiche la préinscription ; la vitrine et tout le côté marques
 * sont réservés aux admins. Pour ouvrir le site : NEXT_PUBLIC_LAUNCH_MODE=off sur Vercel.
 */
export const LAUNCH = process.env.NEXT_PUBLIC_LAUNCH_MODE !== 'off';
export const ADMIN_ONLY_IN_LAUNCH = ['/vitrine', '/marques', '/marque'];
