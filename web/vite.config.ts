import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, '../core'),
    },
  },
  server: {
    port: 5173,
    open: true,
    host: true, // Listen on all addresses (allows tunnel access)
    allowedHosts: ['aethea.me'], // Allow Cloudflare tunnel hostname
    hmr: {
      clientPort: 443, // Cloudflare tunnel uses HTTPS (port 443)
    },
  },
  build: {
    // Performance: Target modern browsers for smaller bundles
    target: 'es2020',
    // Code splitting: Separate vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    // Enable minification with terser for smaller bundles
    minify: 'esbuild',
    // Generate source maps for debugging (hidden from users)
    sourcemap: false,
    // CSS code splitting — each lazy route gets its own CSS
    cssCodeSplit: true,
    // Increase chunk size warning limit (pages are lazy loaded)
    chunkSizeWarningLimit: 600,
  },
  // CSS optimization
  css: {
    devSourcemap: true,
  },
});
