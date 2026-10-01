import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'DHRUV - Polar Expedition Logistics',
        short_name: 'DHRUV',
        description: 'Integrated Polar Expedition Logistics and Asset Management System',
        theme_color: '#2F6B73',
        background_color: '#E4E8EA',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Cache API requests for offline availability with NetworkFirst strategy
            urlPattern: /^\/api\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true, // Listens on all local IP addresses (useful for testing on mobile/tablets over LAN)
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        ws: true, // Enables WebSocket proxying if using Django Channels or FastAPI WebSockets
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            console.warn('[Vite Proxy Warning] Backend unreachable at port 5001:', err.message);
          });
        }
      }
    }
  }
})