import type { Metadata } from 'next';
import Preinscription from '@/components/Preinscription';
import Vitrine from './vitrine/page';
import { LAUNCH } from '@/lib/launch';

export const revalidate = 300;
export const metadata: Metadata = LAUNCH
  ? {
      title: { absolute: 'Kivora · Créateurs UGC au Maroc : fixe ton prix, les marques réservent' },
      description: 'Créateur de contenu au Maroc ? Préinscris-toi gratuitement sur Kivora : tu fixes tes tarifs, les marques réservent tes vidéos.',
    }
  : {};

export default function Home() {
  return LAUNCH ? <Preinscription /> : <Vitrine />;
}
