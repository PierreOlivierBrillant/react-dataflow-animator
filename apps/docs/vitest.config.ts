import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // Pointer vers le source schema uniquement pour les tests (évite de charger
      // le bundle React complet de la lib alors qu'on n'a besoin que du JSON Schema).
      'react-dataflow-animator': fileURLToPath(
        new URL(
          '../../packages/react-dataflow-animator/src/schema.ts',
          import.meta.url
        )
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
