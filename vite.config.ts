import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'Printly.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        },
        manifest: {
          name: 'Printly - College Print Shop',
          short_name: 'Printly',
          description: 'Your campus print shop in your pocket.',
          theme_color: '#0f172a',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'Printly.png',
              sizes: '1024x1024',
              type: 'image/png'
            },
            {
              src: 'Printly.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'Printly.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'Printly.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'Printly.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        }
      })
    ],
    define: {
      // 'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY), // Unused
      // 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) // Unused
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': ['framer-motion', 'sonner', 'lucide-react'],
          },
        },
      },
    }
  };
});
