import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Visual validation harness: Vite serves THIS folder at the root and resolves
// the package sources directly (Stage, clipOpacity, easeInOutCubic are
// NOT publicly exported — we import them from src to remain faithful
// to the real render without polluting the public API). No added dependencies:
// vite + @vitejs/plugin-react are already devDeps of the package.
export default defineConfig({
  root: import.meta.dirname,
  server: { open: false, port: 5199 },
  plugins: [react()],
});
