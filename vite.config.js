import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

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
          
          // Warn if pointing to CloudFront (should use API Gateway or /api/* proxy)
          if (apiBase.includes('cloudfront.net') && !apiBase.includes('/api')) {
            console.warn('⚠️  WARNING: VITE_API_BASE points to CloudFront without /api prefix. POSTs may fail.');
          }
          
          // Error if pointing to localhost or example domains
          if (apiBase.includes('localhost') || apiBase.includes('example.com') || apiBase.includes('127.0.0.1')) {
            throw new Error(`VITE_API_BASE cannot be localhost or example.com in production. Got: ${apiBase}`);
          }
          
          console.log('✅ API Base validated:', apiBase);
        }
      }
    }
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  server: { port: 3000, open: true },
  preview: { port: 3000 }
})
