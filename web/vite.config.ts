import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const corePath = fs.existsSync(path.resolve(__dirname, './core'))
  ? path.resolve(__dirname, './core')
  : path.resolve(__dirname, '../core');

const runningInDocker = fs.existsSync('/.dockerenv');
const apiProxyTarget = runningInDocker ? 'http://backend:3001' : 'http://localhost:3001';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': corePath,
    },
  },
  server: {
    port: 5173,
    open: false,
    host: true,
    // Dynamically allow hosts: localhost is always allowed, aethea.me added for tunnel
    allowedHosts: true, 
    hmr: runningInDocker ? {
      clientPort: 443, // Only force port 443 if we are in the Docker/Tunnel environment
    } : true, // Standard HMR for local development
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  build: {
    // Performance: Target modern browsers for smaller bundles
    target: 'es2020',
    // Code splitting: Separate vendor chunks for better caching
    rollupOptions: {
      output: {
        // Let Vite/Rollup natively handle code splitting for optimal, warning-free bundles
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
