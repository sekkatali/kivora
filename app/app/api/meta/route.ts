import { NextResponse } from 'next/server';
import { createHash } from 'crypto';

const ALLOWED = new Set(['Lead', 'CompleteRegistration', 'ViewContent', 'Contact']);
const sha = (s: string) => createHash('sha256').update(s.trim().toLowerCase()).digest('hex');

/** API Conversions Meta. Inactive tant que NEXT_PUBLIC_META_PIXEL_ID et META_CAPI_TOKEN ne sont pas renseignés. */
export async function POST(req: Request) {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return NextResponse.json({ skipped: true });

  let body: { event?: string; eventId?: string; email?: string; url?: string; data?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'json' }, { status: 400 }); }
  if (!body.event || !ALLOWED.has(body.event) || !body.eventId) return NextResponse.json({ error: 'event' }, { status: 400 });

  const cookie = req.headers.get('cookie') || '';
  const pick = (n: string) => cookie.match(new RegExp(`(?:^|; )${n}=([^;]+)`))?.[1];
  const user_data: Record<string, unknown> = {
    client_ip_address: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || undefined,
    client_user_agent: req.headers.get('user-agent') || undefined,
    fbp: pick('_fbp'),
    fbc: pick('_fbc'),
  };
  if (body.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) user_data.em = [sha(body.email)];

  const res = await fetch(`https://graph.facebook.com/v21.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data: [{
        event_name: body.event,
        event_time: Math.floor(Date.now() / 1000),
        event_id: body.eventId.slice(0, 100),
        action_source: 'website',
        event_source_url: body.url?.slice(0, 500),
        user_data,
        custom_data: body.data && typeof body.data === 'object' ? body.data : undefined,
      }],
    }),
  }).catch(() => null);
  return NextResponse.json({ sent: !!res?.ok });
}
