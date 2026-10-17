'use client';
import type { Lang } from '@/lib/i18n';
import { T } from '@/lib/i18n';

/** Bouton de langue : garde les paramètres de l'URL (UTM, parrainage). */
export default function LangSwitch({ lang }: { lang: Lang }) {
  const t = T[lang];
  return (
    <a className="langsw" href={t.switchHref} lang={lang === 'fr' ? 'ary' : 'fr'} dir={lang === 'fr' ? 'rtl' : 'ltr'}
      onClick={(e) => { e.preventDefault(); window.location.href = t.switchHref + window.location.search; }}>
      {t.switchTo}
    </a>
  );
}
