import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Percorsi relativi: l'app funziona sotto qualunque cartella del sito
  // (es. https://marcofabbrini.com/vvf/gestionali/) senza ricompilare.
  base: './',
  server: {
    // In sviluppo le chiamate all'API PHP vengono inoltrate al server PHP locale
    // (vedi DEPLOY.md, sezione "Sviluppo in locale").
    proxy: {
      '/api/index.php': {
        target: process.env.GD_API_TARGET || 'http://127.0.0.1:8099',
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/api\/index\.php/, '/index.php'),
      },
    },
  },
})
