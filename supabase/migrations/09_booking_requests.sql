-- KIVORA · Demandes de réservation (phase conciergerie)
-- À coller dans Supabase > SQL Editor > Run (une seule fois).
-- La marque demande une vidéo ; l'équipe fait avancer le statut ; le créateur voit ses réservations confirmées.

create table if not exists public.booking_requests (
  id            uuid primary key default gen_random_uuid(),
  brand_id      uuid not null references public.brands (id) on delete cascade,
  creator_id    uuid not null references public.creators (id) on delete cascade,
  brand_company text,
  creator_label text,
  base_price    integer,
  options       jsonb not null default '[]',
  total_mad     integer,
  brief         text check (brief is null or length(brief) <= 2000),
  status        text not null default 'nouvelle'
                check (status in ('nouvelle', 'confirmee', 'payee', 'en_tournage', 'livree', 'validee', 'annulee')),
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists booking_requests_brand_idx on public.booking_requests (brand_id);
create index if not exists booking_requests_creator_idx on public.booking_requests (creator_id);
alter table public.booking_requests enable row level security;

-- Prix, options et noms recalculés côté serveur : la marque ne peut pas les modifier.
create or replace function public.booking_prepare()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare wanted text[];
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
      into new.base_price, new.creator_label
      from public.creators c where c.id = new.creator_id;
    select b.company into new.brand_company from public.brands b where b.id = new.brand_id;
    select coalesce(jsonb_agg(jsonb_build_object('key', p.option_key, 'title', p.title, 'price_mad', p.price_mad) order by p.position), '[]'::jsonb),
           new.base_price + coalesce(sum(p.price_mad), 0)
      into new.options, new.total_mad
      from public.creator_packages p
      where p.creator_id = new.creator_id and p.active and not p.archived and p.option_key = any (wanted);
    new.status := 'nouvelle';
    new.admin_note := null;
    return new;
  end if;
  -- Mise à jour : seule l'équipe change le statut ; prix et parties restent figés.
  if not public.is_admin() and auth.uid() is not null then
    raise exception 'Réservé à l''équipe Kivora';
  end if;
  new.updated_at := now();
  new.brand_id := old.brand_id; new.creator_id := old.creator_id;
  new.base_price := old.base_price; new.options := old.options; new.total_mad := old.total_mad;
  return new;
end $$;
revoke execute on function public.booking_prepare() from public, anon, authenticated;

create trigger booking_requests_prepare before insert or update on public.booking_requests
  for each row execute function public.booking_prepare();

create policy "demande : création par la marque active" on public.booking_requests for insert to authenticated
  with check (brand_id = (select auth.uid()) and public.is_active_brand());
create policy "demande : lecture" on public.booking_requests for select to authenticated
  using (brand_id = (select auth.uid()) or public.is_admin()
         or (creator_id = (select auth.uid()) and status <> 'nouvelle'));
create policy "demande : mise à jour admin" on public.booking_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.booking_requests to authenticated;
