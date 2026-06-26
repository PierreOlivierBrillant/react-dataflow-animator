import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const watchMode = process.argv.includes('--watch');

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    emptyOutDir: false,
    sourcemap: true,
    // En mode --watch, Rollup surveille le module graph mais pas les CSS (traités
    // par le plugin Vite avant Rollup). On les ajoute explicitement.
    watch: watchMode ? { include: ['src/**/*.css'] } : null,
    rollupOptions: {
      external: (id: string) =>
        /^(react|react-dom|react-icons|prismjs)(\/|$)/.test(id),
    },
  },
});
