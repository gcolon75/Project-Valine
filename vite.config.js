import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
  plugins: [
    react(),
    {
      name: 'validate-api-base',
      buildStart() {
        const apiBase = env.VITE_API_BASE;
        const isProduction = mode === 'production' || process.env.NODE_ENV === 'production';

        if (isProduction) {
          if (!apiBase) {
            throw new Error('VITE_API_BASE is required for production builds');
          }

          let hostname;
          try {
            const url = new URL(apiBase);
            hostname = url.hostname;
          } catch {
            throw new Error(`VITE_API_BASE is not a valid URL. Got: ${apiBase}`);
          }

          if (hostname.endsWith('.cloudfront.net') && !apiBase.includes('/api')) {
            console.warn('⚠️  WARNING: VITE_API_BASE points to CloudFront without /api prefix. POSTs may fail.');
          }

          if (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === 'example.com' ||
            hostname.endsWith('.example.com')
          ) {
            throw new Error(`VITE_API_BASE cannot be localhost or example.com in production. Got: ${apiBase}`);
          }

          console.log('✅ API Base validated:', apiBase);
        }
      },
    },
  ],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    sourcemap: true, // Enable source maps for debugging production issues
    rollupOptions: {
      output: {
        // Ensure consistent naming for easier debugging
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  server: { port: 3000, open: true },
  preview: { port: 3000 },
}});
