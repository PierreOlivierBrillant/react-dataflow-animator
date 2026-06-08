import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build du SITE VITRINE déployé sur GitHub Pages (onglets Installation / Démos / API).
// La librairie elle-même est buildée par `vite.config.ts` (mode lib).
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/react-dataflow-animator/',
});
