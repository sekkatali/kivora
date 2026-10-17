'use client';
import { useEffect, useState } from 'react';

/** Bouton fixe sur mobile, masqué quand le formulaire est à l'écran. */
export default function StickyCta({ label = 'Je me préinscris · 2 min' }: { label?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const form = document.getElementById('preinscription');
    const hero = document.getElementById('top');
    if (!form || !hero) return;
    let formIn = false, heroIn = true;
    const update = () => setShow(!formIn && !heroIn);
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.target === form) formIn = e.isIntersecting; else heroIn = e.isIntersecting; });
      update();
    }, { threshold: 0.05 });
    io.observe(form); io.observe(hero);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`sticky-cta${show ? ' on' : ''}`} aria-hidden={!show}>
      <a className="btn ink big" href="#preinscription" tabIndex={show ? 0 : -1}>{label}</a>
    </div>
  );
}
