import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: false },
  // Force a minimal PostCSS config so Vite does NOT search for .postcssrc / postcss.config.*
  css: {
    postcss: {
      plugins: [], // add autoprefixer or tailwind later if/when you need them
    },
  },
});
