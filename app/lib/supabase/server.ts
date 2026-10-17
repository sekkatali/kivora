import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          try { list.forEach(({ name, value, options }) => store.set(name, value, options)); }
          catch { /* appelé depuis un Server Component : le middleware rafraîchit la session */ }
        },
      },
    },
  );
}

export type Role = 'creator' | 'brand' | 'admin';

/** Utilisateur connecté et son rôle (null si déconnecté). */
export async function getSession() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null as Role | null };
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return { supabase, user, role: (data?.role ?? null) as Role | null };
}

export const homeFor = (role: Role | null) =>
  role === 'admin' ? '/admin' : role === 'brand' ? '/marque' : '/createur';
