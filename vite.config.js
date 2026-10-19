import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

import { VitePWA } from 'vite-plugin-pwa'

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  plugins: [
    react(),
    nodePolyfills({ include: ['stream', 'buffer', 'process', 'util', 'path'] }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Keuangan',
        short_name: 'Keuangan',
        description: 'Aplikasi Pengelola Keuangan Cerdas dan Transparan',
        theme_color: '#f9fafb',
        background_color: '#f9fafb',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  build: {
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-excel': ['exceljs'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  },
  base: '/',
})
