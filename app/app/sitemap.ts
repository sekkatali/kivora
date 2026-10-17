import type { MetadataRoute } from 'next';
import { LAUNCH } from '@/lib/launch';
export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const pages = LAUNCH ? ['', '/confidentialite'] : ['', '/inscription', '/marques', '/confidentialite'];
  return pages.map((p) => ({ url: `${site}${p}`, changeFrequency: 'weekly' as const }));
}
