import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Transforma o site num app instalável (PWA): ícone na tela inicial,
    // abre em tela cheia e recebe notificações mesmo fechado.
    VitePWA({
      // Versão nova publicada no Netlify entra sozinha na próxima abertura
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Diário — Gestão de Notas e Aulas',
        short_name: 'Diário',
        description: 'Notas, turmas, frequência e agenda do professor',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        theme_color: '#4759a8',
        background_color: '#f7f8fb',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // SPA: qualquer rota abre o index.html em cache, igual ao redirect do Netlify
        navigateFallback: '/index.html',
        // Recebe e mostra as notificações do aviso diário (ver public/sw-push.js)
        importScripts: ['sw-push.js'],
      },
    }),
  ],
})
