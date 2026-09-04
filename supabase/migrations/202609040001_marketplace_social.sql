begin;

create or replace function private.is_valid_pattern(definition jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  layer jsonb;
  color jsonb;
begin
  if jsonb_typeof(definition) <> 'object'
    or not (definition ? 'layers')
    or (select count(*) from jsonb_object_keys(definition)) <> 1
    or jsonb_typeof(definition->'layers') <> 'array'
    or jsonb_array_length(definition->'layers') not between 1 and 6 then
    return false;
  end if;

  for layer in select value from jsonb_array_elements(definition->'layers') loop
    if jsonb_typeof(layer) <> 'object'
      or not (layer ?& array['element', 'colors', 'scale', 'rotation'])
      or exists (
        select 1 from jsonb_object_keys(layer) key
        where key not in ('element', 'colors', 'scale', 'rotation', 'opacity')
      )
      or layer->>'element' not in (
        'stripe', 'chevron', 'zigzag', 'diamond', 'grid', 'checkerboard',
        'polkadot', 'triangle', 'hexagon', 'wave', 'crosshatch', 'lattice',
        'houndstooth', 'paisley', 'plaid', 'argyle', 'gingham', 'herringbone'
      )
      or jsonb_typeof(layer->'colors') <> 'array'
      or jsonb_array_length(layer->'colors') <> 2
      or jsonb_typeof(layer->'scale') <> 'number'
      or (layer->>'scale')::numeric not between 0.4 and 1.8
      or jsonb_typeof(layer->'rotation') <> 'number'
      or (layer->>'rotation')::numeric not between -45 and 45
      or (layer ? 'opacity' and (
        jsonb_typeof(layer->'opacity') <> 'number'
        or (layer->>'opacity')::numeric not between 0 and 1
      )) then
      return false;
    end if;

    for color in select value from jsonb_array_elements(layer->'colors') loop
      if jsonb_typeof(color) <> 'string'
        or not (color #>> '{}') ~* '^#[0-9a-f]{6}$' then
        return false;
      end if;
    end loop;
  end loop;

  return true;
exception when others then
  return false;
end;
$$;

drop policy shirts_public_or_owner_read on public.shirts;
drop policy patterns_public_or_owner_read on public.patterns;

create policy shirts_public_read on public.shirts
for select to anon, authenticated using (true);
create policy patterns_public_read on public.patterns
for select to anon, authenticated using (true);

create or replace function public.cancel_listing(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  listing_row public.listings%rowtype;
begin
  if actor is null then raise exception 'authentication required' using errcode = '42501'; end if;

  select * into listing_row from public.listings
  where id = p_listing_id for update;
  if not found then raise exception 'listing not found' using errcode = 'P0002'; end if;
  if listing_row.status = 'cancelled' and listing_row.seller_id = actor then
    return listing_row.id;
  end if;
  if listing_row.status <> 'active' then
    raise exception 'listing is no longer active' using errcode = '55000';
  end if;
  if listing_row.seller_id <> actor then
    raise exception 'only the seller may cancel this listing' using errcode = '42501';
  end if;

  update public.listings set status = 'cancelled', closed_at = now()
  where id = listing_row.id;
  return listing_row.id;
end;
$$;

create view public.leaderboard_sales
with (security_invoker = true)
as
select
  l.id as listing_id,
  l.shirt_id,
  s.name,
  pat.definition as pattern,
  s.layer_count,
  s.element_count,
  s.color_count,
  s.complexity_score,
  l.price,
  l.purchased_at,
  seller.username::text as seller_username,
  buyer.username::text as buyer_username
from public.listings l
join public.shirts s on s.id = l.shirt_id
join public.patterns pat on pat.id = s.pattern_id
join public.profiles seller on seller.id = l.seller_id
join public.profiles buyer on buyer.id = l.buyer_id
where l.status = 'sold';

create view public.profile_summaries
with (security_invoker = true)
as
select
  p.id as user_id,
  p.username::text as username,
  p.created_at as joined_at,
  (select count(*) from public.shirts s where s.owner_id = p.id)::bigint as shirts_owned,
  (select count(*) from public.shirts s where s.creator_id = p.id)::bigint as shirts_created,
  (
    select count(*) from public.listings l
    where l.seller_id = p.id and l.status = 'sold'
  )::bigint as sales_count
from public.profiles p;

create view public.shirt_collection
with (security_invoker = true)
as
select
  s.id as shirt_id,
  s.name,
  pat.definition as pattern,
  s.layer_count,
  s.element_count,
  s.color_count,
  s.complexity_score,
  s.price_floor,
  s.created_at,
  s.creator_id,
  creator.username::text as creator_username,
  s.owner_id,
  owner_profile.username::text as owner_username,
  active_listing.id as active_listing_id,
  active_listing.price as active_price,
  active_listing.created_at as active_listed_at,
  last_listing.id as last_listing_id,
  last_listing.status as last_listing_status,
  coalesce(selected_favorites.favorite_count, 0)::bigint as favorite_count
from public.shirts s
join public.patterns pat on pat.id = s.pattern_id
join public.profiles creator on creator.id = s.creator_id
join public.profiles owner_profile on owner_profile.id = s.owner_id
left join lateral (
  select l.id, l.price, l.created_at
  from public.listings l
  where l.shirt_id = s.id and l.status = 'active'
  limit 1
) active_listing on true
left join lateral (
  select l.id, l.status
  from public.listings l
  where l.shirt_id = s.id
  order by l.created_at desc, l.id desc
  limit 1
) last_listing on true
left join lateral (
  select count(*)::bigint as favorite_count
  from public.favorites f
  where f.listing_id = coalesce(active_listing.id, last_listing.id)
) selected_favorites on true;

revoke execute on function public.cancel_listing(uuid) from public, anon;
grant execute on function public.cancel_listing(uuid) to authenticated;

grant select on public.leaderboard_sales, public.profile_summaries, public.shirt_collection to anon, authenticated;

commit;
