-- KIVORA · Validation des contenus par Kivora (interrupteur dans l'admin)
-- Déjà appliqué sur le projet KIVORA. À rejouer seulement sur une nouvelle base, après 09.
--
-- Interrupteur activé  : le créateur livre -> controle -> l'admin valide -> livree (la marque voit la vidéo)
--                                                   -> ou demande une correction -> payee | revision (le créateur relivre)
-- Interrupteur coupé   : le créateur livre -> livree directement.
-- Tant que la vidéo est en contrôle, son lien n'est lisible que par le créateur et l'admin.

-- 1. Réglages de la plateforme (une seule ligne)
create table if not exists public.platform_settings (
  id              smallint primary key default 1 check (id = 1),
  content_review  boolean not null default true,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id) on delete set null
);
insert into public.platform_settings (id) values (1) on conflict (id) do nothing;
alter table public.platform_settings enable row level security;
create policy "réglages : lecture" on public.platform_settings for select to authenticated using (true);
grant select on public.platform_settings to authenticated;

-- 2. Nouveau statut « controle »
alter table public.booking_requests drop constraint if exists booking_requests_status_check;
alter table public.booking_requests add constraint booking_requests_status_check
  check (status in ('envoyee', 'acceptee', 'refusee', 'payee', 'controle', 'livree', 'revision', 'validee', 'annulee'));

-- 3. Le lien soumis, tant qu'il n'est pas validé (invisible pour la marque)
create table if not exists public.booking_reviews (
  booking_id    uuid primary key references public.booking_requests (id) on delete cascade,
  url           text not null check (length(url) <= 500),
  decision      text not null default 'en_attente' check (decision in ('en_attente', 'approuvee', 'a_corriger')),
  note          text check (note is null or length(note) <= 1000),
  submitted_at  timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references public.profiles (id) on delete set null
);
alter table public.booking_reviews enable row level security;
create policy "contrôle : lecture créateur et admin" on public.booking_reviews for select to authenticated
  using (public.is_admin() or exists (select 1 from public.booking_requests r where r.id = booking_id and r.creator_id = (select auth.uid())));
grant select on public.booking_reviews to authenticated;

-- 4. Règles de passage (remplace la version de 09)
create or replace function public.booking_guard()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare wanted text[]; who text; tr text; review_on boolean;
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
      if tr in ('payee>livree', 'revision>livree') then
        if coalesce(new.delivery_url, '') !~ '^https?://' then raise exception 'Ajoute le lien de la vidéo'; end if;
        select s.content_review into review_on from public.platform_settings s where s.id = 1;
        if coalesce(review_on, false) then
          -- La vidéo part au contrôle Kivora : la marque garde l'ancienne version jusqu'à la validation.
          insert into public.booking_reviews as v (booking_id, url) values (old.id, new.delivery_url)
            on conflict (booking_id) do update set url = excluded.url, decision = 'en_attente', note = null,
              submitted_at = now(), decided_at = null, decided_by = null;
          new.delivery_url := old.delivery_url;
          new.status := 'controle';
        end if;
      else
        new.delivery_url := old.delivery_url;
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

  -- Sortie du contrôle vers la marque (bouton « Valider » ou intervention admin) : la vidéo contrôlée devient visible.
  if old.status = 'controle' and new.status = 'livree' then
    update public.booking_reviews v set decision = 'approuvee', decided_at = now(), decided_by = auth.uid()
      where v.booking_id = old.id returning v.url into new.delivery_url;
    new.delivery_url := coalesce(new.delivery_url, old.delivery_url);
  end if;

  if new.status = 'payee' and old.status <> 'payee' and old.paid_at is null then new.paid_at := now(); end if;
  if new.status = 'livree' and old.status <> 'livree' then new.delivered_at := now(); end if;
  if new.status = 'validee' and old.status <> 'validee' then new.validated_at := now(); end if;
  return new;
end $$;
revoke execute on function public.booking_guard() from public, anon, authenticated;

-- 5. Décision de l'admin sur une vidéo en contrôle
create or replace function public.review_delivery(p_booking uuid, p_ok boolean, p_note text default null)
returns public.booking_requests language plpgsql security definer set search_path = ''
as $$
declare r public.booking_requests;
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  select * into r from public.booking_requests where id = p_booking for update;
  if r.id is null or r.status <> 'controle' then raise exception 'Cette vidéo n''est plus en contrôle'; end if;
  if p_ok then
    update public.booking_requests set status = 'livree' where id = p_booking returning * into r;
  else
    if coalesce(trim(p_note), '') = '' then raise exception 'Explique au créateur ce qu''il doit corriger'; end if;
    update public.booking_reviews set decision = 'a_corriger', note = left(trim(p_note), 1000), decided_at = now(), decided_by = auth.uid()
      where booking_id = p_booking;
    update public.booking_requests set status = case when r.revisions > 0 then 'revision' else 'payee' end
      where id = p_booking returning * into r;
  end if;
  return r;
end $$;
revoke execute on function public.review_delivery(uuid, boolean, text) from public, anon;
grant execute on function public.review_delivery(uuid, boolean, text) to authenticated;

-- 6. Interrupteur. En le coupant, les vidéos en attente partent tout de suite aux marques.
create or replace function public.set_content_review(p_on boolean)
returns integer language plpgsql security definer set search_path = ''
as $$
declare released integer := 0;
begin
  if not public.is_admin() then raise exception 'Réservé aux admins'; end if;
  update public.platform_settings set content_review = p_on, updated_at = now(), updated_by = auth.uid() where id = 1;
  if not p_on then
    with done as (update public.booking_requests set status = 'livree' where status = 'controle' returning 1)
    select count(*) into released from done;
  end if;
  return released;
end $$;
revoke execute on function public.set_content_review(boolean) from public, anon;
grant execute on function public.set_content_review(boolean) to authenticated;
