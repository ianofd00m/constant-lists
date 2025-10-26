import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  envDir: './',
  plugins: [react()],
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable sourcemaps for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
    // Increase chunk size limit to avoid warnings
    chunkSizeWarningLimit: 1000,
    // Copy public assets
    copyPublicDir: true,
  },
  
  // Development server configuration
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          console.log('🔄 Proxying request:', path, '-> http://localhost:3001' + path);
          return path;
        }
      }
    },
    fs: { allow: ['..'] },
    historyApiFallback: true,
  },
  
  // Preview server configuration
  preview: {
    allowedHosts: ['constant-lists-front-end.onrender.com'],
    port: 4173
  }
})
