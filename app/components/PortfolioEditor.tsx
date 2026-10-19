'use client';
import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { frError } from '@/lib/data';
import { MAX_MB, MAX_VIDEOS, posterOf, removeFiles, signUrls, uploadAvatar, uploadVideo, withPosters } from '@/lib/media';
import { Avatar, VideoTile, VideoViewer } from './Media';

/** Photo de profil et vidéos du créateur : ce que les marques voient en premier. */
export default function PortfolioEditor({ supabase, uid, first, last, videos, avatar, onChange, say }: {
  supabase: SupabaseClient; uid: string; first: string; last: string;
  videos: string[]; avatar: string | null;
  onChange: (p: { videos: string[]; avatar_path: string | null }) => void; say: (m: string) => void;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'' | 'photo' | 'video'>('');
  const [progress, setProgress] = useState('');
  const [view, setView] = useState<number | null>(null);
  const vIn = useRef<HTMLInputElement>(null);
  const pIn = useRef<HTMLInputElement>(null);

  const asked = useRef(new Set<string>());
  useEffect(() => {
    const missing = [avatar, ...withPosters(videos)].filter((p): p is string => !!p && !asked.current.has(p));
    if (!missing.length) return;
    missing.forEach((p) => asked.current.add(p));
    signUrls(supabase, missing).then((m) => setUrls((u) => ({ ...u, ...m })));
  }, [supabase, videos, avatar]);

  async function save(next: { videos: string[]; avatar_path: string | null }) {
    const { error } = await supabase.from('creators').update(next).eq('id', uid);
    if (error) throw new Error(error.message);
    onChange(next);
  }

  async function addVideos(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_VIDEOS - videos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) say(`${MAX_VIDEOS} vidéos maximum : seules les ${room} premières sont ajoutées.`);
    setBusy('video');
    let next = [...videos];
    for (const [k, f] of list.entries()) {
      setProgress(list.length > 1 ? `Envoi ${k + 1} / ${list.length}…` : 'Envoi en cours…');
      try {
        const path = await uploadVideo(supabase, uid, f);
        next = [...next, path];
        await save({ videos: next, avatar_path: avatar });
      } catch (e) { say(frError((e as Error).message)); }
    }
    setBusy(''); setProgress('');
    if (vIn.current) vIn.current.value = '';
    if (next.length > videos.length) say(next.length - videos.length > 1 ? 'Vidéos ajoutées' : 'Vidéo ajoutée');
  }

  async function removeVideo(path: string) {
    if (!confirm('Retirer cette vidéo de ton profil ?')) return;
    try {
      await save({ videos: videos.filter((v) => v !== path), avatar_path: avatar });
      await removeFiles(supabase, [path]);
      say('Vidéo retirée');
    } catch (e) { say(frError((e as Error).message)); }
  }

  async function makeCover(path: string) {
    try { await save({ videos: [path, ...videos.filter((v) => v !== path)], avatar_path: avatar }); say('Vidéo mise en couverture'); }
    catch (e) { say(frError((e as Error).message)); }
  }

  async function setPhoto(files: FileList | null) {
    const f = files?.[0]; if (!f) return;
    setBusy('photo');
    try {
      const path = await uploadAvatar(supabase, uid, f);
      const old = avatar;
      await save({ videos, avatar_path: path });
      if (old) await removeFiles(supabase, [old]);
      say('Photo enregistrée');
    } catch (e) { say(frError((e as Error).message)); }
    setBusy('');
    if (pIn.current) pIn.current.value = '';
  }

  const srcs = videos.map((v) => urls[v]).filter(Boolean);

  return (
    <section className="panel" aria-labelledby="h-port">
      <div className="ph"><h2 id="h-port">Ma photo et mes vidéos</h2><span className={`tag ${videos.length >= 3 ? 'good' : 'warn'}`}>{videos.length} / {MAX_VIDEOS} vidéos</span></div>
      <p className="small muted">C’est ce que les marques regardent en premier. Mets tes 3 à 6 meilleures vidéos face caméra, au format vertical. La première sert de couverture dans le catalogue.</p>

      <div className="port-photo">
        <Avatar src={avatar ? urls[avatar] : null} id={uid} first={first} last={last} size={72} />
        <div>
          <button type="button" className="btn quiet sm" disabled={!!busy} onClick={() => pIn.current?.click()}>{busy === 'photo' ? 'Envoi…' : avatar ? 'Changer ma photo' : 'Ajouter ma photo'}</button>
          <small className="muted">Une photo nette de ton visage, recadrée en carré.</small>
        </div>
        <input ref={pIn} type="file" accept="image/*" hidden onChange={(e) => setPhoto(e.target.files)} />
      </div>

      <div className="port-grid">
        {videos.map((v, k) => (
          <div className="port-item" key={v}>
            {urls[v] ? <VideoTile src={urls[v]} poster={urls[posterOf(v)]} label={`Lire la vidéo ${k + 1}`} onOpen={() => setView(srcs.indexOf(urls[v]))}>{k === 0 ? <span className="vt-tag">Couverture</span> : null}</VideoTile>
              : <span className="vt vt-wait">Chargement…</span>}
            <div className="port-act">
              {k > 0 ? <button type="button" className="link small" onClick={() => makeCover(v)}>Mettre en couverture</button> : <span />}
              <button type="button" className="link small" onClick={() => removeVideo(v)}>Retirer</button>
            </div>
          </div>
        ))}
        {videos.length < MAX_VIDEOS ? (
          <button type="button" className="port-add" disabled={!!busy} onClick={() => vIn.current?.click()}>
            <span aria-hidden="true">{busy === 'video' ? '…' : '+'}</span>
            <b>{busy === 'video' ? progress : 'Ajouter des vidéos'}</b>
            <small>MP4 de préférence (export CapCut), {MAX_MB} Mo max</small>
          </button>
        ) : null}
      </div>
      <input ref={vIn} type="file" accept="video/mp4,video/quicktime,video/webm" multiple hidden onChange={(e) => addVideos(e.target.files)} />
      {view !== null && srcs.length ? <VideoViewer srcs={srcs} start={Math.max(0, view)} title="Mes vidéos" onClose={() => setView(null)} /> : null}
    </section>
  );
}
