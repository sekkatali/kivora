import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { LAUNCH, ADMIN_ONLY_IN_LAUNCH } from '@/lib/launch';

const PRIVATE = ['/createur', '/marque', '/admin'];
const under = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(p + '/'));

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Rafraîchit la session à chaque requête.
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const go = (to: string, suite?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    if (suite) url.searchParams.set('suite', suite);
    return NextResponse.redirect(url);
  };

  // Pendant la préinscription : vitrine et côté marques réservés aux admins.
  if (LAUNCH && under(path, ADMIN_ONLY_IN_LAUNCH)) {
    if (!user) return go('/');
    const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (data?.role !== 'admin') return go('/');
    return response;
  }

  if (under(path, PRIVATE) && !user) return go('/connexion', path);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|fonts/|api/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2)$).*)'],
};
