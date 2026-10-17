import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const safe = (s: string | null) => (s && s.startsWith('/') && !s.startsWith('//') ? s : '/espace');

/** Lien de confirmation par token_hash : fonctionne même si l'e-mail est ouvert sur un autre appareil. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type') as EmailOtpType | null;
  const suite = safe(url.searchParams.get('suite') || (type === 'recovery' ? '/mot-de-passe' : null));
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(suite, url.origin));
  }
  return NextResponse.redirect(new URL('/connexion?erreur=lien', url.origin));
}
