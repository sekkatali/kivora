import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AppBar from '@/components/AppBar';
import AdminDashboard from '@/components/AdminDashboard';
import { isMissingTable, type BookingRequest } from '@/lib/booking';
import { getSession, homeFor } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { supabase, user, role } = await getSession();
  if (!user) redirect('/connexion?suite=/admin');
  if (role !== 'admin') redirect(homeFor(role));
  const [stats, creators, brands, pkgs, reqs] = await Promise.all([
    supabase.rpc('admin_stats'),
    supabase.from('creators').select('*, profiles!inner(email, role)').eq('profiles.role', 'creator').order('created_at', { ascending: false }).limit(5000),
    supabase.from('brands').select('*, profiles!inner(email, role)').eq('profiles.role', 'brand').order('created_at', { ascending: false }).limit(2000),
    supabase.from('creator_packages').select('creator_id, title, price_mad, active, option_key').eq('archived', false).limit(20000),
    supabase.from('booking_requests').select('*').order('created_at', { ascending: false }).limit(5000),
  ]);
  const requestsReady = !(reqs.error && isMissingTable(reqs.error.message));
  const error = stats.error?.message || creators.error?.message || brands.error?.message || pkgs.error?.message || (requestsReady ? reqs.error?.message : '') || '';
  return (
    <div className="appmode">
      <AppBar label="Admin" email={user.email} />
      <AdminDashboard stats={stats.data ?? {}} creators={creators.data ?? []} brands={brands.data ?? []} packages={pkgs.data ?? []}
        requests={(reqs.data as BookingRequest[]) ?? []} requestsReady={requestsReady} error={error} />
    </div>
  );
}
