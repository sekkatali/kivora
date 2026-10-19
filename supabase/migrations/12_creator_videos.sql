-- KIVORA · Vidéos et photo des créateurs, visibles dans le profil côté marques
-- Déjà appliqué sur le projet KIVORA. À rejouer seulement sur une nouvelle base, après 11.
--
-- Les fichiers sont dans un espace de stockage PRIVÉ « portfolio », un dossier par créateur ({id}/...).
-- Lecture : le créateur lui-même, les admins, et les marques actives (seulement pour les créateurs vérifiés),
-- via des liens signés valables une heure.

-- 1. Colonnes
alter table public.creators add column if not exists avatar_path text;
alter table public.creators add column if not exists videos text[] not null default '{}';
alter table public.creators add constraint creators_videos_max check (cardinality(videos) <= 6);

-- 2. Un créateur ne peut référencer que ses propres fichiers
create or replace function public.protect_creator()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if public.is_admin() or auth.uid() is null then
    if new.status is distinct from old.status then new.reviewed_at := now(); end if;
    return new;
  end if;
  if new.status is distinct from old.status
     or new.admin_note is distinct from old.admin_note
     or new.referral_code is distinct from old.referral_code
     or new.referred_by is distinct from old.referred_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.consent_at is distinct from old.consent_at
     or new.utm is distinct from old.utm then
    raise exception 'Champ réservé à l''équipe Kivora';
  end if;
  if (new.avatar_path is not null and new.avatar_path not like new.id::text || '/%')
     or exists (select 1 from unnest(new.videos) v where v not like new.id::text || '/%') then
    raise exception 'Fichier invalide';
  end if;
  return new;
end $$;

-- 3. Espace de stockage privé (50 Mo par fichier, vidéos et images)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio', 'portfolio', false, 52428800,
        array['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 4. Règles d'accès aux fichiers (passer par une fonction : les marques ne lisent pas la table creators)
create or replace function public.portfolio_readable(p_folder text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_folder = (select auth.uid())::text
      or public.is_admin()
      or (public.is_active_brand() and exists (select 1 from public.creators c where c.id::text = p_folder and c.status = 'approved'));
$$;
revoke execute on function public.portfolio_readable(text) from public, anon;
grant execute on function public.portfolio_readable(text) to authenticated;

create policy "portfolio : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'portfolio' and public.portfolio_readable((storage.foldername(name))[1]));
create policy "portfolio : ajout par le créateur" on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio' and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'creator'));
create policy "portfolio : retrait par le créateur" on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));

-- 5. Catalogue avec photo et vidéos (les chemins ; le site les transforme en liens signés)
create or replace function public.get_creators_catalog(p_city text default null, p_niche text default null)
returns table (id uuid, first_name text, last_initial text, city text, languages text[], niches text[], instagram text, tiktok text,
               followers integer, portfolio_url text, bio text, min_price integer, packages jsonb, avatar_path text, videos text[])
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_active_brand()) then
    raise exception 'Catalogue réservé aux marques actives';
  end if;
  return query
    select c.id, c.first_name, left(c.last_name, 1), c.city, c.languages, c.niches,
           c.instagram, c.tiktok, c.followers, c.portfolio_url, c.bio, c.desired_rate,
           coalesce((select jsonb_agg(jsonb_build_object('key', p.option_key, 'title', p.title, 'price_mad', p.price_mad) order by p.position, p.price_mad)
                     from public.creator_packages p
                     where p.creator_id = c.id and p.active and not p.archived and p.option_key is not null), '[]'::jsonb),
           c.avatar_path, c.videos
    from public.creators c
    join public.profiles pr on pr.id = c.id and pr.role = 'creator'
    where c.status = 'approved' and c.desired_rate is not null
      and (p_city is null or c.city = p_city)
      and (p_niche is null or p_niche = any (c.niches))
    order by cardinality(c.videos) > 0 desc, c.reviewed_at desc nulls last;
end $$;
revoke execute on function public.get_creators_catalog(text, text) from public, anon;
grant execute on function public.get_creators_catalog(text, text) to authenticated;
