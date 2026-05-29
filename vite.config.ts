import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readFileSync } from 'node:fs';

function loadLocalProperties() {
  if (!existsSync('local.properties')) return {};

  return readFileSync('local.properties', 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .reduce<Record<string, string>>((values, line) => {
      const [key, ...rest] = line.split('=');
      const value = rest.join('=').trim().replace(/\\:/g, ':');
      values[key.trim()] = value;
      return values;
    }, {});
}

export default defineConfig(({ mode }) => {
  const env = {
    ...loadLocalProperties(),
    ...loadEnv(mode, '.', ''),
  };
  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    // Rutas relativas para publicar cada PWA como sitio independiente.
    base: './',
    define: {
      'process.env': JSON.stringify(env),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) return 'charts';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('lucide-react')) return 'icons';
              return 'vendor';
            }
            if (id.includes('/components/admin/')) return 'admin';
            if (id.includes('/components/client/')) return 'client';
            if (id.includes('/components/delivery/')) return 'delivery';
            if (id.includes('/components/restaurant/')) return 'restaurant';
            return undefined;
          }
        }
      }
    }
  };
});
