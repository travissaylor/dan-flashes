begin;

create extension if not exists citext with schema extensions;
create schema if not exists private;

create type public.listing_status as enum ('active', 'sold', 'cancelled');
create type public.ledger_entry_type as enum (
  'signup_bonus',
  'daily_reward',
  'listing_fee',
  'purchase_debit',
  'sale_credit',
  'house_cut'
);

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
      or layer->>'element' not in ('houndstooth', 'paisley', 'diamond', 'chevron', 'plaid', 'grid', 'zigzag', 'stripe')
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

create or replace function private.pattern_layer_count(definition jsonb)
returns integer language sql immutable strict set search_path = ''
as $$ select jsonb_array_length(definition->'layers') $$;

create or replace function private.pattern_element_count(definition jsonb)
returns integer language sql immutable strict set search_path = ''
as $$
  select count(distinct layer->>'element')::integer
  from jsonb_array_elements(definition->'layers') layer
$$;

create or replace function private.pattern_color_count(definition jsonb)
returns integer language sql immutable strict set search_path = ''
as $$
  select count(distinct lower(color #>> '{}'))::integer
  from jsonb_array_elements(definition->'layers') layer
  cross join jsonb_array_elements(layer->'colors') color
$$;

create or replace function private.pattern_complexity(definition jsonb)
returns integer language sql immutable strict set search_path = ''
as $$
  select private.pattern_layer_count(definition)
    * private.pattern_element_count(definition)
    * private.pattern_color_count(definition)
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username::text ~ '^[a-zA-Z0-9_]{3,24}$')
);

create table public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint wallets_nonnegative_balance check (balance >= 0),
  constraint wallets_safe_balance check (balance <= 9007199254740991)
);

create table public.patterns (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  constraint patterns_valid_definition check (private.is_valid_pattern(definition))
);

create table public.shirts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  creator_id uuid not null references public.profiles(id) on delete restrict,
  owner_id uuid not null references public.profiles(id) on delete restrict,
  pattern_id uuid not null unique references public.patterns(id) on delete restrict,
  layer_count integer not null,
  element_count integer not null,
  color_count integer not null,
  complexity_score integer not null,
  price_floor bigint not null,
  creation_idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shirts_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint shirts_complexity_positive check (complexity_score > 0),
  constraint shirts_price_floor_matches check (price_floor = complexity_score * 50),
  unique (creator_id, creation_idempotency_key)
);

create or replace function private.set_shirt_complexity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare definition jsonb;
begin
  select p.definition into definition from public.patterns p where p.id = new.pattern_id;
  if definition is null then raise exception 'pattern not found' using errcode = '23503'; end if;
  new.layer_count := private.pattern_layer_count(definition);
  new.element_count := private.pattern_element_count(definition);
  new.color_count := private.pattern_color_count(definition);
  new.complexity_score := private.pattern_complexity(definition);
  new.price_floor := new.complexity_score * 50;
  return new;
end;
$$;

create trigger shirts_authoritative_complexity
before insert or update of pattern_id, layer_count, element_count, color_count, complexity_score, price_floor
on public.shirts for each row execute function private.set_shirt_complexity();

create or replace function private.reject_pattern_mutation()
returns trigger language plpgsql set search_path = ''
as $$ begin raise exception 'saved pattern definitions are immutable' using errcode = '55000'; end; $$;

create trigger patterns_immutable
before update or delete on public.patterns
for each row execute function private.reject_pattern_mutation();

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  shirt_id uuid not null references public.shirts(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  buyer_id uuid references public.profiles(id) on delete restrict,
  price bigint not null,
  listing_fee bigint not null default 100,
  status public.listing_status not null default 'active',
  listing_idempotency_key uuid not null,
  purchase_idempotency_key uuid,
  created_at timestamptz not null default now(),
  purchased_at timestamptz,
  closed_at timestamptz,
  constraint listings_positive_price check (price > 0 and price <= 2000000000),
  constraint listings_fee_nonnegative check (listing_fee >= 0),
  constraint listings_close_shape check (
    (status = 'active' and buyer_id is null and purchase_idempotency_key is null and purchased_at is null and closed_at is null)
    or (status = 'sold' and buyer_id is not null and purchase_idempotency_key is not null and purchased_at is not null and closed_at is not null)
    or (status = 'cancelled' and buyer_id is null and purchase_idempotency_key is null and purchased_at is null and closed_at is not null)
  ),
  unique (seller_id, listing_idempotency_key)
);

create unique index listings_one_active_per_shirt on public.listings (shirt_id) where status = 'active';
create unique index listings_purchase_idempotency on public.listings (buyer_id, purchase_idempotency_key) where purchase_idempotency_key is not null;
create index listings_marketplace_order on public.listings (created_at desc) where status = 'active';
create index listings_active_price on public.listings (price) where status = 'active';
create index shirts_owner on public.shirts (owner_id, created_at desc);
create index shirts_creator on public.shirts (creator_id, created_at desc);
create index patterns_definition_gin on public.patterns using gin (definition jsonb_path_ops);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
create index favorites_listing on public.favorites (listing_id);

create table public.daily_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_date date not null default (timezone('utc', now()))::date,
  amount bigint not null default 250,
  idempotency_key uuid not null,
  balance_after bigint not null,
  created_at timestamptz not null default now(),
  constraint daily_rewards_positive_amount check (amount > 0),
  unique (user_id, reward_date),
  unique (user_id, idempotency_key)
);

create table public.economy_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_user_id uuid references public.profiles(id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  delta bigint not null,
  balance_after bigint,
  reference_id uuid,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  constraint economy_ledger_nonzero_delta check (delta <> 0),
  constraint economy_ledger_balance_shape check (
    (wallet_user_id is null and balance_after is null)
    or (wallet_user_id is not null and balance_after is not null and balance_after >= 0)
  ),
  unique (entry_type, idempotency_key)
);
create index economy_ledger_wallet_history on public.economy_ledger (wallet_user_id, created_at desc);
create index economy_ledger_reference on public.economy_ledger (reference_id);

create or replace function private.reject_ledger_mutation()
returns trigger language plpgsql set search_path = ''
as $$ begin raise exception 'economy ledger entries are immutable' using errcode = '55000'; end; $$;

create trigger economy_ledger_immutable
before update or delete on public.economy_ledger
for each row execute function private.reject_ledger_mutation();

create or replace function private.provision_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  final_username text;
begin
  base_username := regexp_replace(
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(coalesce(new.email, 'pattern'), '@', 1))),
    '[^a-z0-9_]', '_', 'g'
  );
  base_username := left(trim(both '_' from base_username), 15);
  if char_length(base_username) < 3 then base_username := 'pattern'; end if;
  final_username := base_username || '_' || left(replace(new.id::text, '-', ''), 8);

  insert into public.profiles (id, username) values (new.id, final_username)
  on conflict (id) do nothing;
  insert into public.wallets (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger a_on_auth_user_created
after insert on auth.users
for each row execute function private.provision_user();

create or replace function private.award_signup_bonus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_balance bigint;
begin
  if new.email_confirmed_at is null or (tg_op = 'UPDATE' and old.email_confirmed_at is not null) then
    return new;
  end if;

  perform 1 from public.wallets where user_id = new.id for update;
  if exists (
    select 1 from public.economy_ledger
    where entry_type = 'signup_bonus' and idempotency_key = 'signup:' || new.id::text
  ) then return new; end if;

  update public.wallets set balance = balance + 2000, updated_at = now()
  where user_id = new.id returning balance into new_balance;
  insert into public.economy_ledger (wallet_user_id, entry_type, delta, balance_after, idempotency_key)
  values (new.id, 'signup_bonus', 2000, new_balance, 'signup:' || new.id::text);
  insert into public.economy_ledger (entry_type, delta, idempotency_key)
  values ('signup_bonus', -2000, 'signup:system:' || new.id::text);
  return new;
end;
$$;

create trigger b_on_auth_email_verified
after insert or update of email_confirmed_at on auth.users
for each row execute function private.award_signup_bonus();

create or replace function public.create_shirt(
  p_name text,
  p_pattern jsonb,
  p_idempotency_key uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  existing_id uuid;
  new_pattern_id uuid;
  new_shirt_id uuid;
  layers integer;
  elements integer;
  colors integer;
  complexity integer;
begin
  if actor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null then raise exception 'idempotency key required' using errcode = '22023'; end if;
  select id into existing_id from public.shirts
    where creator_id = actor and creation_idempotency_key = p_idempotency_key;
  if existing_id is not null then return existing_id; end if;
  if char_length(btrim(p_name)) not between 1 and 80 then raise exception 'shirt name must be 1 to 80 characters' using errcode = '22023'; end if;
  if not private.is_valid_pattern(p_pattern) then raise exception 'invalid pattern definition' using errcode = '22023'; end if;

  layers := private.pattern_layer_count(p_pattern);
  elements := private.pattern_element_count(p_pattern);
  colors := private.pattern_color_count(p_pattern);
  complexity := layers * elements * colors;
  insert into public.patterns (created_by, definition) values (actor, p_pattern) returning id into new_pattern_id;
  insert into public.shirts (
    name, creator_id, owner_id, pattern_id, layer_count, element_count, color_count,
    complexity_score, price_floor, creation_idempotency_key
  ) values (
    btrim(p_name), actor, actor, new_pattern_id, layers, elements, colors,
    complexity, complexity * 50, p_idempotency_key
  ) returning id into new_shirt_id;
  return new_shirt_id;
end;
$$;

create or replace function public.create_listing(
  p_shirt_id uuid,
  p_price bigint,
  p_idempotency_key uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  shirt_row public.shirts%rowtype;
  existing_id uuid;
  listing_id uuid;
  new_balance bigint;
begin
  if actor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null then raise exception 'idempotency key required' using errcode = '22023'; end if;
  select id into existing_id from public.listings
    where seller_id = actor and listing_idempotency_key = p_idempotency_key;
  if existing_id is not null then return existing_id; end if;

  select * into shirt_row from public.shirts where id = p_shirt_id for update;
  if not found then raise exception 'shirt not found' using errcode = 'P0002'; end if;
  if shirt_row.owner_id <> actor then raise exception 'only the owner may list this shirt' using errcode = '42501'; end if;
  if p_price < shirt_row.price_floor then raise exception 'price is below the complexity floor' using errcode = '22023'; end if;
  if p_price > 2000000000 then raise exception 'price exceeds the marketplace maximum' using errcode = '22023'; end if;
  if exists (select 1 from public.listings where shirt_id = p_shirt_id and status = 'active') then
    raise exception 'shirt is already listed' using errcode = '23505';
  end if;

  perform 1 from public.wallets where user_id = actor for update;
  if (select balance from public.wallets where user_id = actor) < 100 then
    raise exception 'insufficient Bones for listing fee' using errcode = 'P0001';
  end if;
  insert into public.listings (shirt_id, seller_id, price, listing_idempotency_key)
  values (p_shirt_id, actor, p_price, p_idempotency_key) returning id into listing_id;
  update public.wallets set balance = balance - 100, updated_at = now()
  where user_id = actor returning balance into new_balance;
  insert into public.economy_ledger (wallet_user_id, entry_type, delta, balance_after, reference_id, idempotency_key)
  values (actor, 'listing_fee', -100, new_balance, listing_id, p_idempotency_key::text);
  insert into public.economy_ledger (entry_type, delta, reference_id, idempotency_key)
  values ('house_cut', 100, listing_id, 'listing-house:' || p_idempotency_key::text);
  return listing_id;
end;
$$;

create or replace function public.purchase_listing(
  p_listing_id uuid,
  p_idempotency_key uuid
) returns table (
  listing_id uuid,
  shirt_id uuid,
  buyer_balance bigint,
  seller_proceeds bigint,
  house_cut bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  listing_row public.listings%rowtype;
  current_owner uuid;
  buyer_new_balance bigint;
  seller_new_balance bigint;
  cut bigint;
  proceeds bigint;
begin
  if actor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null then raise exception 'idempotency key required' using errcode = '22023'; end if;

  select * into listing_row from public.listings
  where id = p_listing_id for update;
  if not found then raise exception 'listing not found' using errcode = 'P0002'; end if;
  if listing_row.status = 'sold' and listing_row.buyer_id = actor
    and listing_row.purchase_idempotency_key = p_idempotency_key then
    return query select listing_row.id, listing_row.shirt_id, w.balance,
      listing_row.price - floor(listing_row.price * 1200 / 10000.0)::bigint,
      floor(listing_row.price * 1200 / 10000.0)::bigint
    from public.wallets w where w.user_id = actor;
    return;
  end if;
  if listing_row.status <> 'active' then raise exception 'listing is no longer available' using errcode = '55000'; end if;
  if listing_row.seller_id = actor then raise exception 'you already own this shirt' using errcode = '42501'; end if;

  select owner_id into current_owner from public.shirts where id = listing_row.shirt_id for update;
  if current_owner <> listing_row.seller_id then raise exception 'listing ownership is stale' using errcode = '55000'; end if;

  perform 1 from public.wallets
    where user_id in (actor, listing_row.seller_id)
    order by user_id for update;
  if (select balance from public.wallets where user_id = actor) < listing_row.price then
    raise exception 'insufficient Bones' using errcode = 'P0001';
  end if;

  cut := floor(listing_row.price * 1200 / 10000.0)::bigint;
  proceeds := listing_row.price - cut;
  update public.wallets set balance = balance - listing_row.price, updated_at = now()
    where user_id = actor returning balance into buyer_new_balance;
  update public.wallets set balance = balance + proceeds, updated_at = now()
    where user_id = listing_row.seller_id returning balance into seller_new_balance;
  update public.shirts set owner_id = actor, updated_at = now() where id = listing_row.shirt_id;
  update public.listings set status = 'sold', buyer_id = actor,
    purchase_idempotency_key = p_idempotency_key, purchased_at = now(), closed_at = now()
    where id = listing_row.id;

  insert into public.economy_ledger (wallet_user_id, entry_type, delta, balance_after, reference_id, idempotency_key)
  values (actor, 'purchase_debit', -listing_row.price, buyer_new_balance, listing_row.id, p_idempotency_key::text);
  insert into public.economy_ledger (wallet_user_id, entry_type, delta, balance_after, reference_id, idempotency_key)
  values (listing_row.seller_id, 'sale_credit', proceeds, seller_new_balance, listing_row.id, 'seller:' || p_idempotency_key::text);
  if cut > 0 then
    insert into public.economy_ledger (entry_type, delta, reference_id, idempotency_key)
    values ('house_cut', cut, listing_row.id, 'purchase-house:' || p_idempotency_key::text);
  end if;

  return query select listing_row.id, listing_row.shirt_id, buyer_new_balance, proceeds, cut;
end;
$$;

create or replace function public.claim_daily_reward(p_idempotency_key uuid)
returns table (reward_date date, amount bigint, balance_after bigint, already_claimed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  today date := (timezone('utc', now()))::date;
  existing public.daily_rewards%rowtype;
  new_balance bigint;
begin
  if actor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if p_idempotency_key is null then raise exception 'idempotency key required' using errcode = '22023'; end if;
  perform 1 from public.wallets where user_id = actor for update;
  select * into existing from public.daily_rewards dr where dr.user_id = actor and dr.reward_date = today;
  if found then
    return query select existing.reward_date, existing.amount, existing.balance_after, true;
    return;
  end if;

  update public.wallets set balance = balance + 250, updated_at = now()
  where user_id = actor returning balance into new_balance;
  insert into public.daily_rewards (user_id, reward_date, amount, idempotency_key, balance_after)
  values (actor, today, 250, p_idempotency_key, new_balance);
  insert into public.economy_ledger (wallet_user_id, entry_type, delta, balance_after, idempotency_key)
  values (actor, 'daily_reward', 250, new_balance, p_idempotency_key::text);
  insert into public.economy_ledger (entry_type, delta, idempotency_key)
  values ('daily_reward', -250, 'daily-system:' || p_idempotency_key::text);
  return query select today, 250::bigint, new_balance, false;
end;
$$;

create or replace function public.set_listing_favorite(p_listing_id uuid, p_favorite boolean)
returns table (favorited boolean, favorite_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.listings where id = p_listing_id) then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;
  if p_favorite then
    insert into public.favorites (user_id, listing_id) values (actor, p_listing_id) on conflict do nothing;
  else
    delete from public.favorites where user_id = actor and listing_id = p_listing_id;
  end if;
  return query select p_favorite, count(*) from public.favorites where listing_id = p_listing_id;
end;
$$;

create view public.marketplace_listings
with (security_invoker = true)
as
select
  l.id as listing_id,
  l.shirt_id,
  s.name,
  p.username::text as creator_username,
  l.price,
  l.status,
  l.created_at,
  pat.definition as pattern,
  s.layer_count,
  s.element_count,
  s.color_count,
  s.complexity_score,
  s.price_floor,
  count(f.user_id)::bigint as favorite_count
from public.listings l
join public.shirts s on s.id = l.shirt_id
join public.profiles p on p.id = s.creator_id
join public.patterns pat on pat.id = s.pattern_id
left join public.favorites f on f.listing_id = l.id
group by l.id, s.id, p.id, pat.id;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.patterns enable row level security;
alter table public.shirts enable row level security;
alter table public.listings enable row level security;
alter table public.favorites enable row level security;
alter table public.daily_rewards enable row level security;
alter table public.economy_ledger enable row level security;

create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
create policy wallets_owner_read on public.wallets for select to authenticated using ((select auth.uid()) = user_id);
create policy patterns_public_or_owner_read on public.patterns for select to anon, authenticated using (
  created_by = (select auth.uid()) or exists (
    select 1 from public.shirts s join public.listings l on l.shirt_id = s.id
    where s.pattern_id = patterns.id
  )
);
create policy shirts_public_or_owner_read on public.shirts for select to anon, authenticated using (
  owner_id = (select auth.uid()) or exists (select 1 from public.listings l where l.shirt_id = shirts.id)
);
create policy listings_public_read on public.listings for select to anon, authenticated using (true);
create policy favorites_public_read on public.favorites for select to anon, authenticated using (true);
create policy daily_rewards_owner_read on public.daily_rewards for select to authenticated using ((select auth.uid()) = user_id);
create policy ledger_owner_read on public.economy_ledger for select to authenticated using ((select auth.uid()) = wallet_user_id);

revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.patterns, public.shirts, public.listings, public.favorites, public.marketplace_listings to anon, authenticated;
grant select on public.wallets, public.daily_rewards, public.economy_ledger to authenticated;

revoke execute on function public.create_shirt(text, jsonb, uuid) from public, anon;
revoke execute on function public.create_listing(uuid, bigint, uuid) from public, anon;
revoke execute on function public.purchase_listing(uuid, uuid) from public, anon;
revoke execute on function public.claim_daily_reward(uuid) from public, anon;
revoke execute on function public.set_listing_favorite(uuid, boolean) from public, anon;
grant execute on function public.create_shirt(text, jsonb, uuid) to authenticated;
grant execute on function public.create_listing(uuid, bigint, uuid) to authenticated;
grant execute on function public.purchase_listing(uuid, uuid) to authenticated;
grant execute on function public.claim_daily_reward(uuid) to authenticated;
grant execute on function public.set_listing_favorite(uuid, boolean) to authenticated;

revoke all on schema private from public;
grant usage on schema public to anon, authenticated;

commit;
