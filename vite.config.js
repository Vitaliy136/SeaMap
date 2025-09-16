import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 5178,
  },
  plugins: [vue(), VitePWA({
    //registerType: 'prompt',
    registerType: 'autoUpdate',
    injectRegister: false,
    includeManifestIcons: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'SeaMap',
      short_name: 'SeaMap',
      description: 'Sea map app',
      theme_color: '#ffffff',
      icons: [
      {
        "src": "assets/Compass-3d-3.png",
        "type": "image/png",
        "sizes": "144x144"
      },
      {
        "src": "assets/Compass-3d-2.png",
        "type": "image/png",
        "sizes": "192x192"
      },
      {
        "src": "assets/Compass-3d-1.png",
        "type": "image/png",
        "sizes": "512x512"
      },
      ],
        "screenshots": [
          {
            "src": "assets/Screenshot-1.png",
            "sizes": "1851x966",
            "type": "image/png",
            "form_factor": "wide",
            "label": "Wonder Widgets"
          },
          {
            "src": "assets/Screenshot-2.png",
            "sizes": "540x968",
            "type": "image/png",
            "label": "Wonder Widgets mob"
          }
        ],
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      navigateFallback: 'index.html',
    },
    devOptions: {
      enabled: true,
      navigateFallback: 'index.html',
      suppressWarnings: false,
      type: 'module',
    },
  })],
})