import { redirect } from 'next/navigation';
import { getSession, homeFor } from '@/lib/supabase/server';

export default async function Espace() {
  const { user, role } = await getSession();
  if (!user) redirect('/connexion');
  redirect(homeFor(role));
}
