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
    // In --watch mode, watch ALL source files. `watch.include` is NOT additive:
    // as soon as it is set, Rollup narrows watching to the matching files only.
    // A CSS-only pattern (which Vite processes before Rollup, so it is otherwise
    // missed) would silently stop watching every `.ts`/`.tsx` in the graph — a
    // lib source edit would then never rebuild `dist/`, and the docs site (which
    // imports the built lib) would serve a stale bundle. `src/**/*` covers both.
    watch: watchMode ? { include: ['src/**/*'] } : null,
    rollupOptions: {
      external: (id: string) =>
        /^(react|react-dom|react-icons|prismjs)(\/|$)/.test(id),
    },
  },
});
