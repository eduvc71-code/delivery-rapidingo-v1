-- Rapidingo performance + realtime patch
-- Ejecutar en Supabase SQL Editor sobre el proyecto remoto.
-- Es seguro repetirlo: usa IF NOT EXISTS y bloques idempotentes.

-- 1) Indices para consultas filtradas por rol.
create index if not exists orders_client_active_idx
on public.orders (client_id, created_at desc)
where status not in ('COMPLETED', 'CANCELLED');

create index if not exists orders_delivery_active_idx
on public.orders (delivery_id, created_at desc)
where status not in ('COMPLETED', 'CANCELLED');

create index if not exists orders_pending_price_idx
on public.orders (target_delivery_id, created_at asc)
where status = 'PENDING_PRICE';

create index if not exists orders_active_created_idx
on public.orders (created_at asc)
where status not in ('COMPLETED', 'CANCELLED');

create index if not exists users_delivery_online_idx
on public.users (online, name)
where role = 'DELIVERY' and online = true;

-- 2) Indice para cola delivery cuando se filtra rejected_by.
create index if not exists orders_rejected_by_gin_idx
on public.orders using gin (rejected_by);

-- 3) Indices complementarios para panel operadora/admin y cola.
create index if not exists orders_status_created_idx
on public.orders (status, created_at asc);

create index if not exists orders_target_pending_created_idx
on public.orders (target_delivery_id, status, created_at asc)
where status = 'PENDING_PRICE';

-- 4) Habilitar Postgres Changes para Realtime.
-- Si la tabla ya esta agregada a la publicacion, se ignora el error.
do $$
begin
  alter publication supabase_realtime add table public.orders;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'La publicacion supabase_realtime no existe en este proyecto.';
end $$;

do $$
begin
  alter publication supabase_realtime add table public.settings;
exception
  when duplicate_object then null;
  when undefined_object then
    raise notice 'La publicacion supabase_realtime no existe en este proyecto.';
end $$;

-- 5) Mejor payload en UPDATE/DELETE para Realtime.
alter table public.orders replica identity full;
alter table public.settings replica identity full;

-- 6) Refrescar estadisticas para el planner.
analyze public.users;
analyze public.orders;
analyze public.settings;

