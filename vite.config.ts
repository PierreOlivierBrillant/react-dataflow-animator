import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Configuration utilisée pour :
//  - `vite` (dev) et `vite preview` : sert le site de démonstration via index.html ;
//  - `vite build` : compile la LIBRAIRIE (mode lib) publiée sur npm.
// Le site de démo a sa propre config de build : `vite.demo.config.ts`.
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ne pas copier `public/` (favicon du site de démo) dans le paquet npm.
  publicDir: false,
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/lib/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    sourcemap: true,
    rollupOptions: {
      // Ne pas embarquer React (peer), ni react-icons / prismjs (dependencies) :
      // le bundler du consommateur les résout et tree-shake les icônes utilisées.
      external: (id: string) => /^(react|react-dom|react-icons|prismjs)(\/|$)/.test(id),
    },
  },
});
