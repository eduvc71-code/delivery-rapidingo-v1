# Supabase Migration

## 1. Create The Project

Create a Supabase project, then copy:

- Project URL
- Publishable/anon key

Put them in local `gradle.properties`:

```properties
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Do not commit real keys if the repository is public.

## 2. Create Tables And Bucket

Open Supabase SQL Editor and run:

```sql
-- paste supabase/schema.sql
```

This creates:

- `users`: cliente/repartidor
- `orders`: pedido activo, chat y fotos mientras el servicio esta en curso
- `delivery_reports`: importes livianos por repartidor al completar
- `order-media`: bucket privado para fotos/archivos temporales

## 3. Current Migration State

Android and PWA now use Supabase for shared service data:

- users
- active orders
- chat
- order status

Firebase remains only for Gmail sign-in. The PWA reads Supabase settings from `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, or from the same local `SUPABASE_URL` / `SUPABASE_ANON_KEY` values used by Android in `local.properties`.

## 4. Security Note

The SQL includes permissive development RLS policies because the current app identifies users by local device id, not Supabase Auth. Before production, replace those policies with authenticated-user policies.
