import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss()
    ],
    // Cambia esto al nombre exacto de tu repositorio en GitHub
    base: '/delivery-rapidingo/',
    define: {
      'process.env': JSON.stringify(env)
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true
    }
  };
});