import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/vitrine', '/admin', '/createur', '/marque', '/auth', '/espace'] }], sitemap: `${site}/sitemap.xml` };
}
