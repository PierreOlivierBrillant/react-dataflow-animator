import { defineConfig } from 'vitest/config';

// Les tests portent sur le cœur PUR du moteur (compiler / layout / geometry),
// d'où l'environnement `node` (aucun DOM requis).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
