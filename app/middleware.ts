import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PRIVATE: Record<string, string> = { '/createur': 'creator', '/marque': 'brand', '/admin': 'admin' };

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
  const area = Object.keys(PRIVATE).find((p) => path === p || path.startsWith(p + '/'));
  if (area && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/connexion';
    url.search = '';
    url.searchParams.set('suite', path);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|woff2)$).*)'],
};
