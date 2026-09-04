-- JIBU core PostgreSQL schema for Supabase — corrected v2
-- Run after the profiles/auth migration.

create extension if not exists pgcrypto;

-- Shared timestamp trigger.
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Complete the existing profile table without exposing financial privileges.
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists account_kind text not null default 'user';
alter table public.profiles add column if not exists is_verified boolean not null default false;
alter table public.profiles drop constraint if exists profiles_account_kind_check;
alter table public.profiles add constraint profiles_account_kind_check
  check (account_kind in ('user', 'owner', 'broker', 'business', 'admin'));
create unique index if not exists profiles_username_unique
  on public.profiles (lower(username)) where username is not null;

-- Wallet. Clients may read their wallet but may never modify it directly.
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_tetri bigint not null default 0 check (balance_tetri >= 0),
  currency text not null default 'GEL' check (currency = 'GEL'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_tetri bigint not null check (amount_tetri <> 0),
  balance_after_tetri bigint not null check (balance_after_tetri >= 0),
  transaction_type text not null check (transaction_type in
    ('top_up', 'listing_fee', 'vip', 'turbo', 'refresh', 'subscription', 'refund', 'adjustment')),
  status text not null default 'completed' check (status in ('pending', 'completed', 'failed', 'refunded')),
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_transactions_user_created_idx
  on public.wallet_transactions(user_id, created_at desc);

-- Real-estate listings.
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  publisher_kind text not null check (publisher_kind in ('owner', 'broker')),
  deal_type text not null check (deal_type in ('sale', 'rent')),
  property_type text not null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  country text not null default 'საქართველო',
  region text,
  city text not null,
  district text,
  street text not null,
  street_number text,
  location_label text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  price numeric(14,2) not null check (price >= 0),
  currency text not null default 'GEL' check (currency in ('GEL', 'USD')),
  area numeric(10,2) not null check (area > 0),
  rooms smallint check (rooms is null or rooms >= 0),
  bedrooms smallint check (bedrooms is null or bedrooms >= 0),
  floor smallint,
  total_floors smallint,
  contact_name text not null,
  contact_phone text not null,
  broker_share text,
  status text not null default 'draft' check (status in
    ('draft', 'pending_payment', 'active', 'paused', 'expired', 'sold', 'rented', 'archived', 'rejected')),
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_floors is null or floor is null or total_floors >= floor)
);
create index if not exists properties_public_feed_idx
  on public.properties(status, published_at desc);
create index if not exists properties_owner_idx
  on public.properties(user_id, created_at desc);
create index if not exists properties_location_idx
  on public.properties(city, district);
create index if not exists properties_price_idx on public.properties(price);
create index if not exists properties_area_idx on public.properties(area);
create index if not exists properties_map_idx on public.properties(latitude, longitude);

create table if not exists public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  public_url text,
  sort_order integer not null default 0 check (sort_order >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  file_size bigint check (file_size is null or file_size > 0),
  mime_type text check (mime_type is null or mime_type in ('image/jpeg','image/png','image/webp','image/avif')),
  created_at timestamptz not null default now(),
  unique(property_id, sort_order)
);
create index if not exists property_photos_property_idx
  on public.property_photos(property_id, sort_order);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, property_id)
);

create table if not exists public.property_views (
  id bigint generated by default as identity primary key,
  property_id uuid not null references public.properties(id) on delete cascade,
  viewer_user_id uuid references auth.users(id) on delete set null,
  visitor_key text,
  viewed_on date not null default current_date,
  created_at timestamptz not null default now(),
  check (viewer_user_id is not null or visitor_key is not null)
);
create unique index if not exists property_views_user_daily_unique
  on public.property_views(property_id, viewer_user_id, viewed_on)
  where viewer_user_id is not null;
create unique index if not exists property_views_guest_daily_unique
  on public.property_views(property_id, visitor_key, viewed_on)
  where visitor_key is not null;
create index if not exists property_views_property_idx
  on public.property_views(property_id, created_at desc);

-- Records at most one view per signed-in user or anonymous visitor per day.
create or replace function public.record_property_view(
  target_property_id uuid,
  anonymous_visitor_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  safe_visitor_key text;
begin
  if not exists (
    select 1 from public.properties
    where id::text = target_property_id::text
      and status = 'active'
      and published_at <= now()
      and expires_at > now()
  ) then
    return false;
  end if;

  if current_user_id is null then
    if anonymous_visitor_key is null or char_length(anonymous_visitor_key) < 16 then
      return false;
    end if;
    safe_visitor_key := encode(extensions.digest(anonymous_visitor_key, 'sha256'), 'hex');
  end if;

  insert into public.property_views(property_id, viewer_user_id, visitor_key)
  values(target_property_id, current_user_id, safe_visitor_key)
  on conflict do nothing;

  return true;
end;
$$;
revoke all on function public.record_property_view(uuid,text) from public;
grant execute on function public.record_property_view(uuid,text) to anon, authenticated;

-- Server-controlled pricing and paid promotion history.
create table if not exists public.promotion_packages (
  kind text not null check (kind in ('vip', 'turbo')),
  days integer not null check (days > 0),
  price_tetri integer not null check (price_tetri >= 0),
  active boolean not null default true,
  primary key(kind, days)
);
insert into public.promotion_packages(kind, days, price_tetri) values
  ('vip',1,200),('vip',3,600),('vip',7,1200),('vip',15,2400),('vip',30,4200),
  ('turbo',1,400),('turbo',3,1200),('turbo',7,2400),('turbo',15,4800),('turbo',30,8400)
on conflict(kind, days) do update set price_tetri=excluded.price_tetri;

create table if not exists public.property_promotions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('vip', 'turbo')),
  days integer not null check (days > 0),
  price_tetri integer not null check (price_tetri >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  payment_id uuid,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists property_promotions_active_idx
  on public.property_promotions(property_id, kind, ends_at desc);

create table if not exists public.property_refreshes (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  price_tetri integer not null default 25 check (price_tetri = 25),
  previous_expires_at timestamptz,
  new_expires_at timestamptz not null,
  payment_id uuid,
  created_at timestamptz not null default now()
);

-- VIP Broker subscription and private sheet.
create table if not exists public.broker_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'vip_broker' check (plan = 'vip_broker'),
  price_tetri integer not null default 2900 check (price_tetri >= 0),
  status text not null default 'pending' check (status in ('pending','active','past_due','cancelled','expired')),
  starts_at timestamptz,
  ends_at timestamptz,
  auto_renew boolean not null default false,
  payment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists broker_subscription_one_active_idx
  on public.broker_subscriptions(user_id)
  where status = 'active';

create table if not exists public.broker_sheet_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  deal_type text not null default 'sale' check (deal_type in ('sale','rent')),
  title text not null default '',
  location text not null default '',
  area numeric(10,2),
  floor text,
  price numeric(14,2),
  currency text not null default 'GEL' check (currency in ('GEL','USD')),
  phone text,
  broker_share text,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists broker_sheet_rows_user_idx
  on public.broker_sheet_rows(user_id, sort_order, created_at);

-- Payments are written only by a trusted payment callback/server function.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_payment_id text unique,
  purpose text not null check (purpose in
    ('wallet_top_up','listing','vip','turbo','refresh','vip_broker')),
  amount_tetri bigint not null check (amount_tetri > 0),
  currency text not null default 'GEL' check (currency = 'GEL'),
  status text not null default 'pending' check (status in
    ('pending','authorized','paid','failed','cancelled','refunded')),
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_user_created_idx
  on public.payments(user_id, created_at desc);

alter table public.property_promotions
  drop constraint if exists property_promotions_payment_fk;
alter table public.property_promotions
  add constraint property_promotions_payment_fk foreign key(payment_id) references public.payments(id) on delete set null;
alter table public.property_refreshes
  drop constraint if exists property_refreshes_payment_fk;
alter table public.property_refreshes
  add constraint property_refreshes_payment_fk foreign key(payment_id) references public.payments(id) on delete set null;
alter table public.broker_subscriptions
  drop constraint if exists broker_subscriptions_payment_fk;
alter table public.broker_subscriptions
  add constraint broker_subscriptions_payment_fk foreign key(payment_id) references public.payments(id) on delete set null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null default '',
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx
  on public.notifications(user_id, read_at, created_at desc);

-- Generic private materials for future JIBU sections.
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket_id text not null,
  storage_path text not null,
  media_kind text not null default 'file' check (media_kind in ('image','video','document','file')),
  original_name text,
  mime_type text,
  file_size bigint check (file_size is null or file_size >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(bucket_id, storage_path)
);

-- Automatically create a zero wallet for every new user.
create or replace function public.handle_new_user_wallet()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.wallets(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_wallet_created on auth.users;
create trigger on_auth_user_wallet_created after insert on auth.users
for each row execute function public.handle_new_user_wallet();
insert into public.wallets(user_id)
select id from auth.users on conflict(user_id) do nothing;

-- updated_at triggers.
do $$
declare table_name text;
begin
  foreach table_name in array array['wallets','properties','broker_subscriptions','broker_sheet_rows','payments']
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

-- RLS.
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.properties enable row level security;
alter table public.property_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.property_views enable row level security;
alter table public.promotion_packages enable row level security;
alter table public.property_promotions enable row level security;
alter table public.property_refreshes enable row level security;
alter table public.broker_subscriptions enable row level security;
alter table public.broker_sheet_rows enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.media_assets enable row level security;

-- Re-runnable policy setup.
drop policy if exists wallets_read_own on public.wallets;
create policy wallets_read_own on public.wallets for select to authenticated using ((select auth.uid())::text = user_id::text);
drop policy if exists wallet_transactions_read_own on public.wallet_transactions;
create policy wallet_transactions_read_own on public.wallet_transactions for select to authenticated using ((select auth.uid())::text = user_id::text);

drop policy if exists properties_public_read on public.properties;
create policy properties_public_read on public.properties for select to anon, authenticated
using (status = 'active' and published_at <= now() and expires_at > now());
drop policy if exists properties_owner_read on public.properties;
create policy properties_owner_read on public.properties for select to authenticated using ((select auth.uid())::text = user_id::text);
drop policy if exists properties_owner_insert on public.properties;
create policy properties_owner_insert on public.properties for insert to authenticated
with check ((select auth.uid())::text = user_id::text and status in ('draft','pending_payment'));
drop policy if exists properties_owner_update on public.properties;
create policy properties_owner_update on public.properties for update to authenticated
using ((select auth.uid())::text = user_id::text) with check ((select auth.uid())::text = user_id::text);
drop policy if exists properties_owner_delete on public.properties;
create policy properties_owner_delete on public.properties for delete to authenticated using ((select auth.uid())::text = user_id::text);

drop policy if exists property_photos_public_read on public.property_photos;
create policy property_photos_public_read on public.property_photos for select to anon, authenticated
using (exists(select 1 from public.properties p where p.id::text=property_photos.property_id::text and (p.user_id::text=(select auth.uid())::text or (p.status='active' and p.expires_at>now()))));
drop policy if exists property_photos_owner_insert on public.property_photos;
create policy property_photos_owner_insert on public.property_photos for insert to authenticated
with check ((select auth.uid())::text=property_photos.owner_id::text and exists(select 1 from public.properties p where p.id::text=property_photos.property_id::text and p.user_id::text=(select auth.uid())::text));
drop policy if exists property_photos_owner_update on public.property_photos;
create policy property_photos_owner_update on public.property_photos for update to authenticated
using ((select auth.uid())::text=property_photos.owner_id::text) with check ((select auth.uid())::text=property_photos.owner_id::text);
drop policy if exists property_photos_owner_delete on public.property_photos;
create policy property_photos_owner_delete on public.property_photos for delete to authenticated using ((select auth.uid())::text=property_photos.owner_id::text);

drop policy if exists favorites_manage_own on public.favorites;
create policy favorites_manage_own on public.favorites for all to authenticated
using ((select auth.uid())::text=user_id::text) with check ((select auth.uid())::text=user_id::text);
drop policy if exists views_read_listing_owner on public.property_views;
create policy views_read_listing_owner on public.property_views for select to authenticated
using (exists(select 1 from public.properties p where p.id::text=property_views.property_id::text and p.user_id::text=(select auth.uid())::text));

drop policy if exists promotion_packages_public_read on public.promotion_packages;
create policy promotion_packages_public_read on public.promotion_packages for select to anon, authenticated using (active);
drop policy if exists property_promotions_public_read on public.property_promotions;
create policy property_promotions_public_read on public.property_promotions for select to anon, authenticated using (ends_at > now());
drop policy if exists property_promotions_owner_read on public.property_promotions;
create policy property_promotions_owner_read on public.property_promotions for select to authenticated using ((select auth.uid())::text=user_id::text);
drop policy if exists property_refreshes_owner_read on public.property_refreshes;
create policy property_refreshes_owner_read on public.property_refreshes for select to authenticated using ((select auth.uid())::text=user_id::text);
drop policy if exists subscriptions_owner_read on public.broker_subscriptions;
create policy subscriptions_owner_read on public.broker_subscriptions for select to authenticated using ((select auth.uid())::text=user_id::text);

drop policy if exists broker_sheet_active_member on public.broker_sheet_rows;
create policy broker_sheet_active_member on public.broker_sheet_rows for all to authenticated
using ((select auth.uid())::text=user_id::text and exists(select 1 from public.broker_subscriptions s where s.user_id::text=(select auth.uid())::text and s.status='active' and s.ends_at>now()))
with check ((select auth.uid())::text=user_id::text and exists(select 1 from public.broker_subscriptions s where s.user_id::text=(select auth.uid())::text and s.status='active' and s.ends_at>now()));

drop policy if exists payments_read_own on public.payments;
create policy payments_read_own on public.payments for select to authenticated using ((select auth.uid())::text=user_id::text);
drop policy if exists notifications_manage_own on public.notifications;
create policy notifications_manage_own on public.notifications for select to authenticated using ((select auth.uid())::text=user_id::text);
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
using ((select auth.uid())::text=user_id::text) with check ((select auth.uid())::text=user_id::text);
drop policy if exists media_assets_manage_own on public.media_assets;
create policy media_assets_manage_own on public.media_assets for all to authenticated
using ((select auth.uid())::text=owner_id::text) with check ((select auth.uid())::text=owner_id::text);

-- Explicit privileges: financial writes remain server-only.
grant select on public.promotion_packages, public.properties, public.property_photos to anon, authenticated;
grant insert, update, delete on public.properties, public.property_photos, public.favorites to authenticated;
grant select on public.favorites, public.wallets, public.wallet_transactions, public.property_views,
  public.property_promotions, public.property_refreshes, public.broker_subscriptions,
  public.broker_sheet_rows, public.payments, public.notifications, public.media_assets to authenticated;
grant insert, update, delete on public.broker_sheet_rows, public.media_assets to authenticated;
grant update on public.notifications to authenticated;
revoke insert, update, delete on public.wallets, public.wallet_transactions, public.promotion_packages,
  public.property_promotions, public.property_refreshes, public.broker_subscriptions, public.payments from anon, authenticated;

-- Storage buckets.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-images','property-images',true,15728640,array['image/jpeg','image/png','image/webp','image/avif']),
  ('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp','image/avif']),
  ('jibu-materials','jibu-materials',false,52428800,null)
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists property_images_insert_own_folder on storage.objects;
create policy property_images_insert_own_folder on storage.objects for insert to authenticated
with check (bucket_id='property-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists property_images_update_own on storage.objects;
create policy property_images_update_own on storage.objects for update to authenticated
using (bucket_id='property-images' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='property-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists property_images_delete_own on storage.objects;
create policy property_images_delete_own on storage.objects for delete to authenticated
using (bucket_id='property-images' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists avatars_insert_own_folder on storage.objects;
create policy avatars_insert_own_folder on storage.objects for insert to authenticated
with check (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
using (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
using (bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

drop policy if exists materials_read_own on storage.objects;
create policy materials_read_own on storage.objects for select to authenticated
using (bucket_id='jibu-materials' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists materials_insert_own_folder on storage.objects;
create policy materials_insert_own_folder on storage.objects for insert to authenticated
with check (bucket_id='jibu-materials' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists materials_update_own on storage.objects;
create policy materials_update_own on storage.objects for update to authenticated
using (bucket_id='jibu-materials' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='jibu-materials' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists materials_delete_own on storage.objects;
create policy materials_delete_own on storage.objects for delete to authenticated
using (bucket_id='jibu-materials' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Listing cards/detail/map query with calculated views and promotion state.
create or replace view public.property_catalog
with (security_invoker = true) as
select p.*,
  coalesce(v.view_count,0)::bigint as view_count,
  exists(select 1 from public.property_promotions x where x.property_id::text=p.id::text and x.kind='vip' and x.starts_at<=now() and x.ends_at>now()) as is_vip,
  exists(select 1 from public.property_promotions x where x.property_id::text=p.id::text and x.kind='turbo' and x.starts_at<=now() and x.ends_at>now()) as is_turbo,
  (select ph.public_url from public.property_photos ph where ph.property_id::text=p.id::text order by ph.sort_order limit 1) as cover_url
from public.properties p
left join (select property_id,count(*) view_count from public.property_views group by property_id) v on v.property_id::text=p.id::text;
grant select on public.property_catalog to anon, authenticated;
