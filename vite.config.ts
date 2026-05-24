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
    // GitHub Pages sirve este repo en minúsculas independientemente del nombre del repo
    base: '/delivery-rapidingo/',
    define: {
      'process.env': JSON.stringify(env),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true
    }
  };
});
