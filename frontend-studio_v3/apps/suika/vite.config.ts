import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';

// https://vitejs.dev/config/
// SUIKA_BASE=/suika/ when building the CMS island (same-origin under Herald).
// Default './' keeps standalone docker/demo (port 6167) relative-asset safe.
const base = process.env.SUIKA_BASE || './';

export default defineConfig({
  plugins: [react(), tailwindcss(), checker({ typescript: true })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base,
  server: {
    port: 6167,
    host: true,
  },
  build: {
    outDir: 'build',
    cssCodeSplit: false,
  },
});
