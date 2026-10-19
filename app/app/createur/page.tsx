import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AppBar from '@/components/AppBar';
import CreatorDashboard from '@/components/CreatorDashboard';
import { getSession, homeFor } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Mon espace créateur', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function CreatorPage() {
  const { supabase, user, role } = await getSession();
  if (!user) redirect('/connexion?suite=/createur');
  if (role !== 'creator') redirect(homeFor(role));
  const [{ data: creator }, { data: packages }, { data: refs }] = await Promise.all([
    supabase.from('creators').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('creator_packages').select('*').eq('creator_id', user.id).eq('archived', false).order('position').order('created_at'),
    supabase.rpc('my_referral_count'),
  ]);
  return (
    <div className="appmode">
      <AppBar label="Créateur" email={user.email} />
      {creator ? (
        <CreatorDashboard creator={creator} packages={packages ?? []} referrals={typeof refs === "number" ? refs : 0} email={user.email} />
      ) : (
        <main className="appwrap"><p className="empty">Ton profil est introuvable. Écris-nous, on règle ça tout de suite.</p></main>
      )}
    </div>
  );
}
