import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AppBar from '@/components/AppBar';
import BrandDashboard from '@/components/BrandDashboard';
import { getSession, homeFor } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Espace marque', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function BrandPage() {
  const { supabase, user, role } = await getSession();
  if (!user) redirect('/connexion?suite=/marque');
  if (role !== 'brand') redirect(homeFor(role));
  const { data: brand } = await supabase.from('brands').select('*').eq('id', user.id).maybeSingle();
  return (
    <div className="appmode">
      <AppBar label="Marque" email={user.email} />
      {brand ? <BrandDashboard brand={brand} /> : <main className="appwrap"><p className="empty">Compte marque introuvable. Écrivez-nous.</p></main>}
    </div>
  );
}
