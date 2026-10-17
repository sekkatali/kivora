import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const safe = (s: string | null) => (s && s.startsWith('/') && !s.startsWith('//') ? s : '/espace');

/** Lien de confirmation ou de mot de passe (flux PKCE, ?code=…). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const suite = safe(url.searchParams.get('suite'));
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(suite, url.origin));
  }
  return NextResponse.redirect(new URL('/connexion?erreur=lien', url.origin));
}
