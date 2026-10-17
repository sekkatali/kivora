import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import Attribution from '@/components/Attribution';
import './globals.css';

const display = localFont({ src: './fonts/Unbounded-800.woff2', weight: '800', variable: '--font-display', display: 'swap' });
const text = localFont({
  src: [{ path: './fonts/Onest-400.woff2', weight: '400' }, { path: './fonts/Onest-500.woff2', weight: '500' }],
  variable: '--font-text', display: 'swap',
});

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'Kivora — La plateforme UGC n°1 au Maroc', template: '%s · Kivora' },
  description: 'Des créateurs marocains vérifiés, des vidéos UGC qui convertissent. Les créateurs fixent leurs prix, les marques réservent.',
  openGraph: { siteName: 'Kivora', locale: 'fr_MA', type: 'website' },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0f1f10' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${text.variable}`}>
      <body>
        {children}
        <Attribution />
        {PIXEL ? (
          <Script id="meta-pixel" strategy="afterInteractive">{`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL}');fbq('track','PageView');`}</Script>
        ) : null}
      </body>
    </html>
  );
}
