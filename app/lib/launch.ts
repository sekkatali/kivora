/**
 * Mode lancement (préinscription créateurs) : actif par défaut.
 * L'accueil affiche la préinscription ; la vitrine et la demande d'accès marques
 * sont réservées aux admins. L'espace /marque reste ouvert aux comptes marque
 * créés par l'équipe (et aux admins). Pour ouvrir le site : NEXT_PUBLIC_LAUNCH_MODE=off sur Vercel.
 */
export const LAUNCH = process.env.NEXT_PUBLIC_LAUNCH_MODE !== 'off';
export const ADMIN_ONLY_IN_LAUNCH = ['/vitrine', '/marques'];
export const BRAND_OR_ADMIN_IN_LAUNCH = ['/marque'];
