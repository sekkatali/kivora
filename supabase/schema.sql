-- ============================================================================
-- KIVORA — schéma Supabase
-- À coller tel quel dans Supabase > SQL Editor > New query > Run.
-- Trois rôles : creator (créateur), brand (marque), admin.
-- Les rôles creator et brand sont choisis à l'inscription.
-- Le rôle admin ne s'attribue qu'à la main (voir la fin du fichier).
-- ============================================================================

-- ---------- Types ----------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('creator', 'brand', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.creator_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ae_status as enum ('oui', 'non', 'en_cours');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.brand_status as enum ('waitlist', 'active');
exception when duplicate_object then null; end $$;

-- ---------- Tables ---------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.user_role not null default 'creator',
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.creators (
  id             uuid primary key references public.profiles (id) on delete cascade,
  first_name     text not null default '',
  last_name      text not null default '',
  phone          text,
  city           text,
  languages      text[] not null default '{}',
  niches         text[] not null default '{}',
  instagram      text,
  tiktok         text,
  followers      integer,
  portfolio_url  text,
  desired_rate   integer check (desired_rate is null or desired_rate between 50 and 100000),
  ae_status      public.ae_status,
  bio            text,
  status         public.creator_status not null default 'pending',
  admin_note     text,
  referral_code  text unique,
  referred_by    text,
  utm            jsonb not null default '{}',
  consent_at     timestamptz,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.creator_packages (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references public.creators (id) on delete cascade,
  title       text not null check (length(title) between 2 and 80),
  description text,
  price_mad   integer not null check (price_mad between 50 and 100000),
  active      boolean not null default true,
  position    smallint not null default 0,
  archived    boolean not null default false,   -- « Retirer » dans l'espace créateur
  created_at  timestamptz not null default now()
);
create index if not exists creator_packages_creator_idx on public.creator_packages (creator_id);

create table if not exists public.brands (
  id              uuid primary key references public.profiles (id) on delete cascade,
  company         text not null default '',
  contact_name    text,
  phone           text,
  website         text,
  ice             text,
  sector          text,
  monthly_budget  text,
  status          public.brand_status not null default 'waitlist',
  utm             jsonb not null default '{}',
  consent_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists creators_status_idx on public.creators (status);
create index if not exists creators_referred_by_idx on public.creators (referred_by);

-- ---------- Fonctions utilitaires -----------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.is_active_brand()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.brands b where b.id = auth.uid() and b.status = 'active');
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists creators_touch on public.creators;
create trigger creators_touch before update on public.creators for each row execute function public.touch_updated_at();
drop trigger if exists brands_touch on public.brands;
create trigger brands_touch before update on public.brands for each row execute function public.touch_updated_at();

-- Seul un admin peut changer un rôle, le statut d'un créateur ou d'une marque.
-- auth.uid() nul = opération serveur (SQL Editor, trigger d'inscription).
create or replace function public.protect_profile()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if new.role is distinct from old.role or new.email is distinct from old.email then
    raise exception 'Changement de rôle interdit';
  end if;
  return new;
end $$;

create or replace function public.protect_creator()
returns trigger language plpgsql
set search_path = ''
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
  return new;
end $$;

create or replace function public.protect_brand()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if new.status is distinct from old.status
     or new.consent_at is distinct from old.consent_at
     or new.utm is distinct from old.utm then
    raise exception 'Champ réservé à l''équipe Kivora';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile();
drop trigger if exists creators_protect on public.creators;
create trigger creators_protect before update on public.creators for each row execute function public.protect_creator();
drop trigger if exists brands_protect on public.brands;
create trigger brands_protect before update on public.brands for each row execute function public.protect_brand();

-- ---------- Inscription : création automatique du profil -----------------
-- Le formulaire envoie les champs dans les métadonnées de supabase.auth.signUp().
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  m        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  r        public.user_role;
  code     text;
  rate     integer;
  fol      integer;
begin
  -- Seuls « creator » et « brand » peuvent être demandés à l'inscription.
  r := case when m->>'role' = 'brand' then 'brand'::public.user_role else 'creator'::public.user_role end;

  insert into public.profiles (id, role, email) values (new.id, r, new.email);

  if r = 'creator' then
    loop
      code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      exit when not exists (select 1 from public.creators c where c.referral_code = code);
    end loop;
    begin rate := nullif(m->>'desired_rate', '')::integer; exception when others then rate := null; end;
    begin fol  := nullif(m->>'followers', '')::integer;    exception when others then fol  := null; end;
    if rate is not null and (rate < 50 or rate > 100000) then rate := null; end if;

    insert into public.creators (
      id, first_name, last_name, phone, city, languages, niches, instagram, tiktok,
      followers, portfolio_url, desired_rate, ae_status, referral_code, referred_by, utm, consent_at
    ) values (
      new.id,
      left(coalesce(m->>'first_name', ''), 60),
      left(coalesce(m->>'last_name', ''), 60),
      left(m->>'phone', 30),
      left(m->>'city', 60),
      coalesce(array(select left(jsonb_array_elements_text(coalesce(m->'languages', '[]'::jsonb)), 40)), '{}'),
      coalesce(array(select left(jsonb_array_elements_text(coalesce(m->'niches', '[]'::jsonb)), 40)), '{}'),
      left(m->>'instagram', 80),
      left(m->>'tiktok', 80),
      fol,
      left(m->>'portfolio_url', 500),
      rate,
      case when m->>'ae_status' in ('oui', 'non', 'en_cours') then (m->>'ae_status')::public.ae_status end,
      code,
      nullif(upper(left(m->>'ref', 12)), ''),
      coalesce(m->'utm', '{}'::jsonb),
      case when (m->>'consent')::boolean then now() end
    );

    -- Le tarif souhaité devient la première offre de la grille.
    if rate is not null then
      insert into public.creator_packages (creator_id, title, description, price_mad, position)
      values (new.id, 'Vidéo UGC 30 s', '1 vidéo, 2 révisions', rate, 0);
    end if;
  else
    insert into public.brands (id, company, contact_name, phone, website, ice, sector, monthly_budget, utm, consent_at)
    values (
      new.id,
      left(coalesce(m->>'company', ''), 120),
      left(m->>'contact_name', 120),
      left(m->>'phone', 30),
      left(m->>'website', 200),
      left(m->>'ice', 30),
      left(m->>'sector', 80),
      left(m->>'monthly_budget', 40),
      coalesce(m->'utm', '{}'::jsonb),
      case when (m->>'consent')::boolean then now() end
    );
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Sécurité par ligne (RLS) --------------------------------------
alter table public.profiles         enable row level security;
alter table public.creators         enable row level security;
alter table public.creator_packages enable row level security;
alter table public.brands           enable row level security;

-- profiles
drop policy if exists "profil : lecture" on public.profiles;
create policy "profil : lecture" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
drop policy if exists "profil : mise à jour" on public.profiles;
create policy "profil : mise à jour" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin()) with check (id = (select auth.uid()) or public.is_admin());

-- creators : le créateur voit et modifie sa fiche ; l'admin voit tout.
-- Les marques passent par la fonction get_catalog() (champs publics seulement).
drop policy if exists "créateur : lecture" on public.creators;
create policy "créateur : lecture" on public.creators for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
drop policy if exists "créateur : mise à jour" on public.creators;
create policy "créateur : mise à jour" on public.creators for update to authenticated
  using (id = (select auth.uid()) or public.is_admin()) with check (id = (select auth.uid()) or public.is_admin());

-- creator_packages : le créateur gère sa grille ; l'admin voit tout.
drop policy if exists "offres : lecture" on public.creator_packages;
create policy "offres : lecture" on public.creator_packages for select to authenticated
  using (creator_id = (select auth.uid()) or public.is_admin());
drop policy if exists "offres : ajout" on public.creator_packages;
create policy "offres : ajout" on public.creator_packages for insert to authenticated
  with check (creator_id = (select auth.uid()));
drop policy if exists "offres : mise à jour" on public.creator_packages;
create policy "offres : mise à jour" on public.creator_packages for update to authenticated
  using (creator_id = (select auth.uid()) or public.is_admin()) with check (creator_id = (select auth.uid()) or public.is_admin());

-- brands
drop policy if exists "marque : lecture" on public.brands;
create policy "marque : lecture" on public.brands for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
drop policy if exists "marque : mise à jour" on public.brands;
create policy "marque : mise à jour" on public.brands for update to authenticated
  using (id = (select auth.uid()) or public.is_admin()) with check (id = (select auth.uid()) or public.is_admin());

-- ---------- Fonctions appelées par le site --------------------------------
-- Les comptes passés admin gardent leur fiche d'inscription : on les exclut partout.
-- Catalogue : créateurs validés, champs publics uniquement (ni téléphone ni e-mail).
create or replace function public.get_catalog(p_city text default null, p_niche text default null)
returns table (
  id uuid, first_name text, last_initial text, city text, languages text[], niches text[],
  instagram text, tiktok text, followers integer, portfolio_url text, bio text,
  min_price integer, packages jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (public.is_admin() or public.is_active_brand()) then
    raise exception 'Catalogue réservé aux marques actives';
  end if;
  return query
    select c.id, c.first_name, left(c.last_name, 1), c.city, c.languages, c.niches,
           c.instagram, c.tiktok, c.followers, c.portfolio_url, c.bio,
           (select min(p.price_mad) from public.creator_packages p where p.creator_id = c.id and p.active and not p.archived),
           coalesce((select jsonb_agg(jsonb_build_object('title', p.title, 'description', p.description, 'price_mad', p.price_mad) order by p.position, p.price_mad)
                     from public.creator_packages p where p.creator_id = c.id and p.active and not p.archived), '[]'::jsonb)
    from public.creators c
    join public.profiles pr on pr.id = c.id and pr.role = 'creator'
    where c.status = 'approved'
      and (p_city is null or c.city = p_city)
      and (p_niche is null or p_niche = any (c.niches))
    order by c.reviewed_at desc nulls last;
end $$;

-- Nombre de filleuls d'un créateur (pour son espace).
create or replace function public.my_referral_count()
returns integer language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.creators c
  where c.referred_by = (select referral_code from public.creators where id = auth.uid());
$$;

-- Compteur public (preuve sociale) : un seul nombre.
create or replace function public.public_creator_count()
returns integer language sql stable security definer set search_path = ''
as $$ select count(*)::integer from public.creators c join public.profiles p on p.id = c.id and p.role = 'creator'; $$;

-- Tableau de bord admin.
create or replace function public.admin_stats()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Réservé aux administrateurs'; end if;
  with cr as (select c.* from public.creators c join public.profiles p on p.id = c.id and p.role = 'creator'),
       br as (select b.* from public.brands b join public.profiles p on p.id = b.id and p.role = 'brand')
  select jsonb_build_object(
    'creators_total',    (select count(*) from cr),
    'creators_complete', (select count(*) from cr c
                          where c.portfolio_url is not null and c.portfolio_url <> ''
                            and exists (select 1 from public.creator_packages p where p.creator_id = c.id and p.active and not p.archived)),
    'creators_pending',  (select count(*) from cr where status = 'pending'),
    'creators_approved', (select count(*) from cr where status = 'approved'),
    'creators_rejected', (select count(*) from cr where status = 'rejected'),
    'ae_ready',          (select count(*) from cr where ae_status in ('oui', 'en_cours')),
    'brands_total',      (select count(*) from br),
    'brands_active',     (select count(*) from br where status = 'active'),
    'by_niche',  coalesce((select jsonb_object_agg(n, k) from (select n, count(*) k from cr, unnest(cr.niches) n group by n) t), '{}'),
    'by_city',   coalesce((select jsonb_object_agg(coalesce(city, 'Non renseignée'), k) from (select city, count(*) k from cr group by city) t), '{}'),
    'by_city_approved', coalesce((select jsonb_object_agg(coalesce(city, 'Non renseignée'), k) from (select city, count(*) k from cr where status = 'approved' group by city) t), '{}'),
    'by_niche_approved', coalesce((select jsonb_object_agg(n, k) from (select n, count(*) k from cr, unnest(cr.niches) n where cr.status = 'approved' group by n) t), '{}'),
    'by_source', coalesce((select jsonb_object_agg(src, k) from (select coalesce(utm->>'utm_source', 'direct') src, count(*) k from cr group by 1) t), '{}'),
    'by_day',    coalesce((select jsonb_object_agg(d, k) from (select to_char(created_at at time zone 'Africa/Casablanca', 'YYYY-MM-DD') d, count(*) k from cr
                            where created_at > now() - interval '30 days' group by 1) t), '{}')
  ) into result;
  return result;
end $$;

-- Droits d'exécution : uniquement les utilisateurs connectés,
-- sauf le compteur public, lisible par tous.
revoke execute on function public.get_catalog(text, text) from public, anon;
revoke execute on function public.my_referral_count()      from public, anon;
revoke execute on function public.admin_stats()            from public, anon;
grant  execute on function public.get_catalog(text, text) to authenticated;
grant  execute on function public.my_referral_count()      to authenticated;
grant  execute on function public.admin_stats()            to authenticated;
grant  execute on function public.public_creator_count()   to anon, authenticated;
revoke execute on function public.is_admin()               from public, anon;
revoke execute on function public.is_active_brand()        from public, anon;
grant  execute on function public.is_admin()               to authenticated;
grant  execute on function public.is_active_brand()        to authenticated;
revoke execute on function public.handle_new_user()        from public, anon, authenticated;

-- ---------- Créer ton compte admin ----------------------------------------
-- 1. Inscris-toi sur le site (comme créateur ou comme marque).
-- 2. Puis exécute dans Supabase > SQL Editor, avec ton adresse :
--    update public.profiles set role = 'admin' where email = 'ton.adresse@exemple.com';
--    Ta fiche d'inscription reste en base mais n'est plus comptée nulle part.

-- ============================================================================
-- Mise à jour : un seul prix par créateur (creators.desired_rate)
-- + des options qui s'ajoutent au total (table creator_packages, colonne option_key).
-- ============================================================================
alter table public.creator_packages add column if not exists option_key text;
create unique index if not exists creator_packages_option_uidx on public.creator_packages (creator_id, option_key);

create or replace function public.option_label(k text)
returns text language sql immutable set search_path = ''
as $$
  select case k
    when 'rushes'    then 'Rushes bruts'
    when 'hooks'     then '3 accroches en plus'
    when 'ads'       then 'Diffusion depuis mon compte'
    when 'formats'   then 'Formats en plus'
    when 'express'   then 'Livraison express'
    when 'subtitles' then 'Sous-titres incrustés'
  end;
$$;
-- La version à jour de handle_new_user, get_catalog et admin_stats (avec les options) est appliquée sur le projet Supabase (migration kivora_08_prix_unique_options).
