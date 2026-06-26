import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Harnais de validation visuelle : Vite sert CE dossier en racine et résout
// directement les sources du package (Stage, clipOpacity, easeInOutCubic ne
// sont PAS exportés publiquement — on les importe depuis src pour rester fidèle
// au rendu réel sans polluer l'API publique). Aucune dépendance ajoutée :
// vite + @vitejs/plugin-react sont déjà des devDeps du package.
export default defineConfig({
  root: import.meta.dirname,
  server: { open: false, port: 5199 },
  plugins: [react()],
});
