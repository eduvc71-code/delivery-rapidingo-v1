-- Rapidingo Supabase schema.
-- Run this in Supabase SQL Editor before switching Android from Firebase.
-- This keeps active-service data separate from lightweight delivery earnings.

create extension if not exists pgcrypto;

do $$ begin
  create type user_role as enum ('CLIENT', 'DELIVERY');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type order_status as enum (
    'PENDING_PRICE',
    'BIDDING',
    'WAITING_CONFIRM',
    'CONFIRMED_BY_CLIENT',
    'PICKING_UP',
    'IN_DELIVERY',
    'DELIVERED_BY_REPARTIDOR',
    'COMPLETED',
    'CANCELLED'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id text primary key,
  name text not null,
  phone text not null default '',
  email text not null default '',
  role user_role not null default 'CLIENT',
  location jsonb,
  online boolean not null default false,
  device_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  client_id text not null references public.users(id) on delete cascade,
  client_name text not null default '',
  client_phone text not null default '',
  delivery_id text references public.users(id) on delete set null,
  delivery_name text,
  delivery_phone text,
  category text not null default 'OTROS',
  description text not null default '',
  status order_status not null default 'PENDING_PRICE',
  product_price numeric(10, 2),
  service_price numeric(10, 2),
  total_price numeric(10, 2),
  photo_url text,
  payment_photo_url text,
  chat_history jsonb not null default '[]'::jsonb,
  client_location jsonb,
  destination_location jsonb,
  delivery_location jsonb,
  delivery_path jsonb not null default '[]'::jsonb,
  is_waze_active boolean not null default false,
  target_delivery_id text references public.users(id) on delete set null,
  rejected_by jsonb not null default '[]'::jsonb,
  created_at bigint not null,
  updated_at timestamptz not null default now()
);

alter table public.orders add column if not exists client_phone text not null default '';
alter table public.orders add column if not exists delivery_phone text;
alter table public.orders add column if not exists destination_location jsonb;

-- Asegurar columnas updated_at en tablas existentes
alter table public.users add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists updated_at timestamptz not null default now();

create table if not exists public.delivery_reports (
  id text primary key,
  delivery_id text not null references public.users(id) on delete cascade,
  delivery_name text,
  client_name text,
  category text not null default 'OTROS',
  description text not null default '',
  status order_status not null default 'COMPLETED',
  product_price numeric(10, 2),
  service_price numeric(10, 2),
  total_price numeric(10, 2),
  created_at bigint not null,
  completed_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value text not null
);

insert into public.settings (key, value)
values ('dispatch_mode', 'AUTOMATIC')
on conflict (key) do nothing;

create index if not exists users_role_online_idx on public.users(role, online);
create index if not exists users_email_idx on public.users(lower(email));
create index if not exists orders_client_idx on public.orders(client_id, status, created_at desc);
create index if not exists orders_delivery_idx on public.orders(delivery_id, status, created_at desc);
create index if not exists orders_target_delivery_idx on public.orders(target_delivery_id, status, created_at desc);
create index if not exists delivery_reports_delivery_idx on public.delivery_reports(delivery_id, completed_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('order-media', 'order-media', true, 10485760, array['image/jpeg', 'image/png', 'application/pdf', 'application/octet-stream'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.delivery_reports enable row level security;
alter table public.settings enable row level security;

-- Development policies for the current device-id based app.
-- Tighten these when Supabase Auth is enabled.
drop policy if exists "dev users read" on public.users;
create policy "dev users read" on public.users for select to anon using (true);

drop policy if exists "dev users write" on public.users;
create policy "dev users write" on public.users for all to anon using (true) with check (true);

drop policy if exists "dev orders read" on public.orders;
create policy "dev orders read" on public.orders for select to anon using (true);

drop policy if exists "dev orders write" on public.orders;
create policy "dev orders write" on public.orders for all to anon using (true) with check (true);

drop policy if exists "dev reports read" on public.delivery_reports;
create policy "dev reports read" on public.delivery_reports for select to anon using (true);

drop policy if exists "dev reports write" on public.delivery_reports;
create policy "dev reports write" on public.delivery_reports for insert to anon with check (true);

drop policy if exists "dev settings read" on public.settings;
create policy "dev settings read" on public.settings for select to anon using (true);

drop policy if exists "dev settings write" on public.settings;
create policy "dev settings write" on public.settings for all to anon using (true) with check (true);

drop policy if exists "dev order media read" on storage.objects;
create policy "dev order media read" on storage.objects
for select to anon using (bucket_id = 'order-media');

drop policy if exists "dev order media write" on storage.objects;
create policy "dev order media write" on storage.objects
for all to anon using (bucket_id = 'order-media') with check (bucket_id = 'order-media');

-- Sincronizar auth.users con public.users automáticamente al registrarse en Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role, phone, online)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1),
      'Usuario'
    ),
    coalesce(new.email, ''),
    'CLIENT',
    coalesce(new.raw_user_meta_data->>'phone', ''),
    false
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(excluded.name, public.users.name);
  return new;
exception
  when others then
    -- Previene bloquear el registro en auth.users si algo falla en public.users
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Pre-cargar todos los 10 restaurantes, administrador y operadora en la base de datos
INSERT INTO public.users (id, name, email, role, phone, online, device_id, location)
VALUES
  ('wings_drinks', 'wings_drinks', 'wings_drinks@rapidingo.com', 'CLIENT', '74721716', false, 'wings_drinks', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('el_brete', 'el_brete', 'el_brete@rapidingo.com', 'CLIENT', '69376937', false, 'el_brete', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('la_toscana_1', 'la_toscana_1', 'la_toscana_1@rapidingo.com', 'CLIENT', '73939626', false, 'la_toscana_1', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('la_toscana_2', 'la_toscana_2', 'la_toscana_2@rapidingo.com', 'CLIENT', '73939626', false, 'la_toscana_2', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('la_plazuela', 'la_plazuela', 'la_plazuela@rapidingo.com', 'CLIENT', '73900041', false, 'la_plazuela', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('la_coqueta', 'la_coqueta', 'la_coqueta@rapidingo.com', 'CLIENT', '72845195', false, 'la_coqueta', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('mr_grill', 'mr_grill', 'mr_grill@rapidingo.com', 'CLIENT', '77848655', false, 'mr_grill', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('el_benianito', 'el_benianito', 'el_benianito@rapidingo.com', 'CLIENT', '72815881', false, 'el_benianito', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('toby', 'toby', 'toby@rapidingo.com', 'CLIENT', '67270686', false, 'toby', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('la_toscana_rapido', 'la_toscana_rapido', 'la_toscana_rapido@rapidingo.com', 'CLIENT', '73939626', false, 'la_toscana_rapido', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('admin747', 'admin747', 'admin@rapidingo.com', 'CLIENT', '74721716', false, 'admin747', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}'),
  ('operador747', 'operador747', 'operador@rapidingo.com', 'CLIENT', '74721716', false, 'operador747', '{"selfie":null,"latitude":0,"longitude":0,"isVerified":true}')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  location = EXCLUDED.location;

