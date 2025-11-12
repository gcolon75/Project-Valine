import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'validate-api-base',
      buildStart() {
        const apiBase = process.env.VITE_API_BASE;
        const isProduction = process.env.NODE_ENV === 'production';

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
  server: { port: 3000, open: true },
  preview: { port: 3000 },
});