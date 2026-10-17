import type { Metadata } from 'next';
import Preinscription from '@/components/Preinscription';

export const revalidate = 300;
export const metadata: Metadata = {
  title: { absolute: 'Kivora · حدد الثمن ديالك، والماركات كيحجزو' },
  description: 'نتا كريياتور فالمغرب؟ سجل فـKivora بلاش: كتحدد الثمن ديالك، والماركات كيحجزو الفيديوهات ديالك.',
  alternates: { languages: { fr: '/', 'ar-MA': '/dr' } },
};

export default function Darija() {
  return <Preinscription lang="dr" />;
}
