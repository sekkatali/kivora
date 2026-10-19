-- KIVORA · Réservations directes entre marques et créateurs
-- À coller dans Supabase > SQL Editor > Run (une seule fois).
--
-- Parcours :
--   la marque envoie une demande        -> envoyee
--   le créateur accepte ou refuse       -> acceptee | refusee
--   le paiement est reçu par Kivora     -> payee      (admin pour l'instant, paiement en ligne ensuite)
--   le créateur livre (lien de la vidéo)-> livree
--   la marque valide ou demande une révision (2 au maximum) -> validee | revision -> livree
--   la marque peut annuler tant que rien n'est payé -> annulee
-- L'admin supervise et peut tout corriger en cas de litige.

create table if not exists public.booking_requests (
  id              uuid primary key default gen_random_uuid(),
  brand_id        uuid not null references public.brands (id) on delete cascade,
  creator_id      uuid not null references public.creators (id) on delete cascade,
  brand_company   text,
  creator_label   text,
  base_price      integer,
  options         jsonb not null default '[]',
  total_mad       integer,
  brief           text check (brief is null or length(brief) <= 2000),
  status          text not null default 'envoyee'
                  check (status in ('envoyee', 'acceptee', 'refusee', 'payee', 'livree', 'revision', 'validee', 'annulee')),
  creator_message text check (creator_message is null or length(creator_message) <= 1000),
  delivery_url    text check (delivery_url is null or length(delivery_url) <= 500),
  revisions       smallint not null default 0,
  admin_note      text,
  paid_at         timestamptz,
  delivered_at    timestamptz,
  validated_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists booking_requests_brand_idx on public.booking_requests (brand_id);
create index if not exists booking_requests_creator_idx on public.booking_requests (creator_id);
alter table public.booking_requests enable row level security;

create table if not exists public.booking_messages (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.booking_requests (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  author_role text not null check (author_role in ('brand', 'creator', 'admin')),
  body        text not null check (length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists booking_messages_booking_idx on public.booking_messages (booking_id, created_at);
alter table public.booking_messages enable row level security;

-- Création : prix, options et noms recalculés côté serveur.
-- Mise à jour : chaque partie ne peut faire que ses propres étapes.
create or replace function public.booking_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare wanted text[]; who text; tr text;
begin
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.creators c where c.id = new.creator_id and c.status = 'approved' and c.desired_rate is not null) then
      raise exception 'Créateur indisponible';
    end if;
    wanted := coalesce(array(
      select coalesce(e->>'key', e#>>'{}')
      from jsonb_array_elements(case when jsonb_typeof(new.options) = 'array' then new.options else '[]'::jsonb end) e
    ), '{}');
    select c.desired_rate, c.first_name || ' ' || left(c.last_name, 1) || '.'
      into new.base_price, new.creator_label from public.creators c where c.id = new.creator_id;
    select b.company into new.brand_company from public.brands b where b.id = new.brand_id;
    select coalesce(jsonb_agg(jsonb_build_object('key', p.option_key, 'title', p.title, 'price_mad', p.price_mad) order by p.position), '[]'::jsonb),
           new.base_price + coalesce(sum(p.price_mad), 0)
      into new.options, new.total_mad
      from public.creator_packages p
      where p.creator_id = new.creator_id and p.active and not p.archived and p.option_key = any (wanted);
    new.status := 'envoyee'; new.revisions := 0; new.creator_message := null; new.delivery_url := null;
    new.admin_note := null; new.paid_at := null; new.delivered_at := null; new.validated_at := null;
    return new;
  end if;

  new.updated_at := now();
  -- Ce qui ne bouge jamais après la création
  new.brand_id := old.brand_id; new.creator_id := old.creator_id; new.brand_company := old.brand_company;
  new.creator_label := old.creator_label; new.base_price := old.base_price; new.options := old.options;
  new.total_mad := old.total_mad; new.brief := old.brief; new.created_at := old.created_at;

  if not (public.is_admin() or auth.uid() is null) then
    who := case when auth.uid() = old.creator_id then 'creator' when auth.uid() = old.brand_id then 'brand' end;
    if who is null then raise exception 'Action impossible'; end if;
    new.admin_note := old.admin_note;
    tr := old.status || '>' || new.status;
    if who = 'creator' then
      new.revisions := old.revisions;
      if new.status <> old.status and tr not in ('envoyee>acceptee', 'envoyee>refusee', 'payee>livree', 'revision>livree') then
        raise exception 'Action impossible à cette étape';
      end if;
      if new.status = 'livree' and coalesce(new.delivery_url, '') !~ '^https?://' then
        raise exception 'Ajoute le lien de la vidéo';
      end if;
    else
      new.creator_message := old.creator_message; new.delivery_url := old.delivery_url;
      if new.status <> old.status and tr not in ('envoyee>annulee', 'acceptee>annulee', 'livree>validee', 'livree>revision') then
        raise exception 'Action impossible à cette étape';
      end if;
      if tr = 'livree>revision' then
        if old.revisions >= 2 then raise exception 'Les deux révisions ont déjà été utilisées'; end if;
        new.revisions := old.revisions + 1;
      else
        new.revisions := old.revisions;
      end if;
    end if;
  end if;

  if new.status = 'payee' and old.status <> 'payee' then new.paid_at := now(); end if;
  if new.status = 'livree' and old.status <> 'livree' then new.delivered_at := now(); end if;
  if new.status = 'validee' and old.status <> 'validee' then new.validated_at := now(); end if;
  return new;
end $$;
revoke execute on function public.booking_guard() from public, anon, authenticated;

create trigger booking_requests_guard before insert or update on public.booking_requests
  for each row execute function public.booking_guard();

-- Qui voit quoi
create policy "réservation : création par la marque active" on public.booking_requests for insert to authenticated
  with check (brand_id = (select auth.uid()) and public.is_active_brand());
create policy "réservation : lecture des parties" on public.booking_requests for select to authenticated
  using (brand_id = (select auth.uid()) or creator_id = (select auth.uid()) or public.is_admin());
create policy "réservation : mise à jour des parties" on public.booking_requests for update to authenticated
  using (brand_id = (select auth.uid()) or creator_id = (select auth.uid()) or public.is_admin())
  with check (brand_id = (select auth.uid()) or creator_id = (select auth.uid()) or public.is_admin());

create policy "message : lecture des parties" on public.booking_messages for select to authenticated
  using (public.is_admin() or exists (select 1 from public.booking_requests r where r.id = booking_id
         and (r.brand_id = (select auth.uid()) or r.creator_id = (select auth.uid()))));
create policy "message : envoi par les parties" on public.booking_messages for insert to authenticated
  with check (author_id = (select auth.uid()) and (public.is_admin() or exists (select 1 from public.booking_requests r where r.id = booking_id
         and ((r.brand_id = (select auth.uid()) and author_role = 'brand') or (r.creator_id = (select auth.uid()) and author_role = 'creator')))));

grant select, insert, update on public.booking_requests to authenticated;
grant select, insert on public.booking_messages to authenticated;
