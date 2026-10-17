import { createClient } from '@supabase/supabase-js';

/** Client sans session, pour les données publiques (pages mises en cache). */
export async function publicCreatorCount(): Promise<number> {
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { data } = await sb.rpc('public_creator_count');
    return typeof data === 'number' ? data : 0;
  } catch { return 0; }
}
