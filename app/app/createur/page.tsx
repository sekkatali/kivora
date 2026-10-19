import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AppBar from '@/components/AppBar';
import CreatorDashboard from '@/components/CreatorDashboard';
import { getSession, homeFor } from '@/lib/supabase/server';
import type { BookingRequest, BookingReview } from '@/lib/booking';

export const metadata: Metadata = { title: 'Mon espace créateur', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CreatorPage() {
  const { supabase, user, role } = await getSession();
  if (!user) redirect('/connexion?suite=/createur');
  if (role !== 'creator') redirect(homeFor(role));
  const [{ data: creator }, { data: packages }, { data: refs }, { data: bookings }, { data: reviews }, { data: settings }] = await Promise.all([
    supabase.from('creators').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('creator_packages').select('*').eq('creator_id', user.id).eq('archived', false).order('position').order('created_at'),
    supabase.rpc('my_referral_count'),
    supabase.from('booking_requests').select('*').eq('creator_id', user.id).order('created_at', { ascending: false }).limit(200),
    supabase.from('booking_reviews').select('*').limit(200),
    supabase.from('platform_settings').select('content_review').eq('id', 1).maybeSingle(),
  ]);
  return (
    <div className="appmode">
      <AppBar label="Créateur" email={user.email} />
      {creator ? (
        <CreatorDashboard creator={creator} packages={packages ?? []} referrals={typeof refs === "number" ? refs : 0} email={user.email} bookings={(bookings as BookingRequest[]) ?? []}
          reviews={(reviews as BookingReview[]) ?? []} reviewOn={settings?.content_review ?? false} />
      ) : (
        <main className="appwrap"><p className="empty">Ton profil est introuvable. Écris-nous, on règle ça tout de suite.</p></main>
      )}
    </div>
  );
}
