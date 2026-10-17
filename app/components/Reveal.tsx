'use client';
import { useEffect } from 'react';

/** Ajoute .in aux sections .rv et #cta quand elles entrent à l'écran. */
export default function Reveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { rootMargin: '0px 0px -12% 0px' },
    );
    document.querySelectorAll('.rv, .cta').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
