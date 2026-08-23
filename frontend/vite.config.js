import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Chaque "espace" migré vers React devient une entrée séparée ici.
// On ajoutera 'faculte-dashboard', 'secretariat-dashboard', etc. au fur
// et à mesure de la migration, sans toucher au reste du projet Django.
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src'),
  base: '/static/gestion_eleves/dist/',
  build: {
    outDir: resolve(__dirname, '../static/gestion_eleves/dist'),
    emptyOutDir: true,
    manifest: false,
    rollupOptions: {
      input: {
        'etu-dashboard': resolve(__dirname, 'src/pages/etudiant-dashboard.jsx'),

        'fac-dashboard': resolve(__dirname, 'src/pages/faculte/fac-dashboard.jsx'),
        'fac-liste-classe': resolve(__dirname, 'src/pages/faculte/fac-liste-classe.jsx'),
        'fac-saisie-notes': resolve(__dirname, 'src/pages/faculte/fac-saisie-notes.jsx'),
        'fac-note-individuelle': resolve(__dirname, 'src/pages/faculte/fac-note-individuelle.jsx'),
        'fac-deliberation': resolve(__dirname, 'src/pages/faculte/fac-deliberation.jsx'),
        'fac-promotion': resolve(__dirname, 'src/pages/faculte/fac-promotion.jsx'),
        'fac-orientation-s3': resolve(__dirname, 'src/pages/faculte/fac-orientation-s3.jsx'),
        'fac-matrice-a3': resolve(__dirname, 'src/pages/faculte/fac-matrice-a3.jsx'),
        'fac-enseignants': resolve(__dirname, 'src/pages/faculte/fac-enseignants.jsx'),

        'sec-dashboard': resolve(__dirname, 'src/pages/secretariat/sec-dashboard.jsx'),
        'sec-liste-etudiants': resolve(__dirname, 'src/pages/secretariat/sec-liste-etudiants.jsx'),
        'sec-ajouter-etudiant': resolve(__dirname, 'src/pages/secretariat/sec-ajouter-etudiant.jsx'),
        'sec-annees-academiques': resolve(__dirname, 'src/pages/secretariat/sec-annees-academiques.jsx'),
        'sec-facultes': resolve(__dirname, 'src/pages/secretariat/sec-facultes.jsx'),
        'sec-matrice-a3': resolve(__dirname, 'src/pages/secretariat/sec-matrice-a3.jsx'),

        'rh-dashboard': resolve(__dirname, 'src/pages/rh/rh-dashboard.jsx'),
        'rh-enseignants': resolve(__dirname, 'src/pages/rh/rh-enseignants.jsx'),
        'rh-ajouter-enseignant': resolve(__dirname, 'src/pages/rh/rh-ajouter-enseignant.jsx'),
        'rh-personnel': resolve(__dirname, 'src/pages/rh/rh-personnel.jsx'),
        'rh-ajouter-personnel': resolve(__dirname, 'src/pages/rh/rh-ajouter-personnel.jsx'),

      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
})
