# Publicar PWAs separadas en Cloudflare Pages

Este proyecto genera dos PWAs instalables desde el mismo codigo:

- Cliente: `dist/cliente`
- Delivery: `dist/delivery`

## Preparar el build

```bash
npm ci
npm run build:pwas
```

El comando `build:pwas` compila la app y crea las carpetas finales para Cloudflare.

## Opcion recomendada: dos proyectos Pages desde GitHub

Crea dos proyectos en Cloudflare Pages usando el mismo repositorio de GitHub.

### Proyecto Cliente

- Project name: `rapidingo-cliente`
- Repository: `eduvc71-code/delivery-rapidingo-v1`
- Production branch: `main`
- Build command: `npm run build:pwas`
- Build output directory: `dist/cliente`
- Root directory: dejar vacio
- Environment variables:
  - `NODE_VERSION=20`
  - `VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=TU_ANON_KEY`

URL inicial esperada:

```text
https://rapidingo-cliente.pages.dev
```

### Proyecto Delivery

- Project name: `rapidingo-delivery`
- Repository: `eduvc71-code/delivery-rapidingo-v1`
- Production branch: `main`
- Build command: `npm run build:pwas`
- Build output directory: `dist/delivery`
- Root directory: dejar vacio
- Environment variables:
  - `NODE_VERSION=20`
  - `VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=TU_ANON_KEY`

URL inicial esperada:

```text
https://rapidingo-delivery.pages.dev
```

### Proyecto Restaurante

- Project name: `rapidingo-restaurante`
- Repository: `eduvc71-code/delivery-rapidingo-v1`
- Production branch: `main`
- Build command: `npm run build:pwas`
- Build output directory: `dist/restaurante`
- Root directory: dejar vacio
- Environment variables:
  - `NODE_VERSION=20`
  - `VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=TU_ANON_KEY`

URL inicial esperada:

```text
https://rapidingo-restaurante.pages.dev
```

## Opcion manual: Direct Upload

Si no quieres conectar GitHub todavia:

1. Ejecuta `npm run build:pwas`.
2. En Cloudflare Pages crea un proyecto con Direct Upload.
3. Para Cliente sube la carpeta `dist/cliente`.
4. Para Delivery crea otro proyecto y sube `dist/delivery`.

## Verificacion PWA

Despues de publicar, abre cada URL y revisa:

- `/manifest.json` devuelve el nombre correcto.
- `/sw.js` existe.
- El navegador permite instalar la PWA.

Cada carpeta tiene su propio `manifest.json`, `start_url`, `scope` y `sw.js`, por eso Cliente y Delivery se instalan como apps separadas.
