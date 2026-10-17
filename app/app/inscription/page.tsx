import type { Metadata } from 'next';
import Preinscription from '@/components/Preinscription';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Préinscription créateurs',
  description: 'Créateur de contenu au Maroc ? Fixe ton prix, les marques réservent. Préinscris-toi gratuitement sur Kivora.',
  alternates: { canonical: '/' },
};

export default function Inscription() {
  return <Preinscription />;
}
