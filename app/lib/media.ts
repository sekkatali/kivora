/* Photo et vidéos des créateurs : stockage privé « portfolio », un dossier par créateur. */
import type { SupabaseClient } from '@supabase/supabase-js';

export const BUCKET = 'portfolio';
export const MAX_VIDEOS = 6;
export const MAX_MB = 50;
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

/** Liens signés (1 h) pour une liste de chemins. Renvoie { chemin: lien }. */
export async function signUrls(supabase: SupabaseClient, paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const list = Array.from(new Set(paths.filter((p): p is string => !!p)));
  if (!list.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(list, 3600);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  data.forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}

const rand = () => Math.random().toString(36).slice(2, 8);

/** Vérifie et envoie une vidéo. Renvoie le chemin, ou lève une erreur lisible. */
export async function uploadVideo(supabase: SupabaseClient, uid: string, file: File): Promise<string> {
  const type = file.type || (/\.mov$/i.test(file.name) ? 'video/quicktime' : '');
  if (!VIDEO_TYPES.includes(type)) throw new Error(`« ${file.name} » : formats acceptés MP4, MOV ou WebM.`);
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`« ${file.name} » dépasse ${MAX_MB} Mo. Exporte-la en 1080p, 60 secondes maximum.`);
  const ext = type === 'video/quicktime' ? 'mov' : type === 'video/webm' ? 'webm' : 'mp4';
  const path = `${uid}/v-${Date.now()}-${rand()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: type, cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  // Miniature : le catalogue l'affiche sans télécharger la vidéo.
  const poster = await makePoster(file);
  if (poster) await supabase.storage.from(BUCKET).upload(posterOf(path), poster, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  return path;
}

/** Chemin de la miniature d'une vidéo. */
export const posterOf = (path: string) => `${path}.jpg`;

/** Image tirée de la vidéo (0,5 s), 540 px de large. Null si le navigateur ne sait pas lire le format. */
export function makePoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    let done = false;
    const end = (b: Blob | null) => { if (done) return; done = true; URL.revokeObjectURL(url); resolve(b); };
    const timer = setTimeout(() => end(null), 8000);
    v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.onloadedmetadata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = () => {
      const w = Math.min(540, v.videoWidth || 540);
      const h = Math.round((w / (v.videoWidth || 9)) * (v.videoHeight || 16));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx || !v.videoWidth) { clearTimeout(timer); return end(null); }
      ctx.drawImage(v, 0, 0, w, h);
      c.toBlob((b) => { clearTimeout(timer); end(b); }, 'image/jpeg', 0.8);
    };
    v.onerror = () => { clearTimeout(timer); end(null); };
    v.src = url;
  });
}

/** Réduit une photo à 640 px de côté (JPEG), puis l'envoie. */
export async function uploadAvatar(supabase: SupabaseClient, uid: string, file: File): Promise<string> {
  if (!/^image\//.test(file.type)) throw new Error('Choisis une photo (JPEG, PNG ou WebP).');
  const blob = await shrink(file, 640);
  const path = `${uid}/photo-${Date.now()}-${rand()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

async function shrink(file: File, max: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Photo illisible.')); i.src = url; });
    const side = Math.min(img.width, img.height);
    const size = Math.min(max, side);
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // Recadrage carré centré
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b || file), 'image/jpeg', 0.86));
  } finally { URL.revokeObjectURL(url); }
}

/** Retire des fichiers du stockage (sans bloquer si ça échoue). */
export async function removeFiles(supabase: SupabaseClient, paths: string[]) {
  const all = paths.flatMap((p) => (/^.+\/v-/.test(p) ? [p, posterOf(p)] : [p]));
  if (all.length) await supabase.storage.from(BUCKET).remove(all);
}

/** Chemins à signer pour afficher des vidéos (vidéo + miniature). */
export const withPosters = (paths: string[]) => paths.flatMap((p) => [p, posterOf(p)]);
