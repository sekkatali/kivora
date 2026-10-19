import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AppBar from '@/components/AppBar';
import BrandDashboard from '@/components/BrandDashboard';
import { isMissingTable, type BookingRequest } from '@/lib/booking';
import { getSession, homeFor } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Espace marque', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function BrandPage() {
  const { supabase, user, role } = await getSession();
  if (!user) redirect('/connexion?suite=/marque');
  if (role !== 'brand') redirect(homeFor(role));
  const [{ data: brand }, reqs] = await Promise.all([
    supabase.from('brands').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('booking_requests').select('*').eq('brand_id', user.id).order('created_at', { ascending: false }).limit(500),
  ]);
  const requestsReady = !(reqs.error && isMissingTable(reqs.error.message));
  return (
    <div className="appmode">
      <AppBar label="Marque" email={user.email} />
      {brand ? <BrandDashboard brand={brand} email={user.email} requests={(reqs.data as BookingRequest[]) ?? []} requestsReady={requestsReady} />
        : <main className="appwrap"><p className="empty">Compte marque introuvable. Écrivez-nous.</p></main>}
    </div>
  );
}
