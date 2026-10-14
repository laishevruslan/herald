import fs from 'node:fs';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { type Connect, defineConfig, type Plugin } from 'vite';
import checker from 'vite-plugin-checker';

/** Serve herald-templates/ at templates/ in dev and copy it into the island build. */
function heraldTemplates(): Plugin {
  const srcDir = path.resolve(__dirname, 'herald-templates');
  let outDir = path.resolve(__dirname, 'build');

  const serve: Connect.NextHandleFunction = (req, res, next) => {
    const pathOnly = decodeURIComponent((req.url || '').split('?')[0]);
    const marker = '/templates/';
    const at = pathOnly.indexOf(marker);
    if (at < 0) {
      next();
      return;
    }
    const rel = pathOnly.slice(at + marker.length);
    if (!rel || rel.includes('..') || rel.includes('\\')) {
      next();
      return;
    }
    const root = path.resolve(srcDir);
    const file = path.resolve(root, rel);
    const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
    if (
      !file.startsWith(prefix) ||
      !fs.existsSync(file) ||
      !fs.statSync(file).isFile()
    ) {
      next();
      return;
    }
    const type = file.endsWith('.png')
      ? 'image/png'
      : 'application/json; charset=utf-8';
    res.setHeader('Content-Type', type);
    res.end(fs.readFileSync(file));
  };

  return {
    name: 'herald-templates',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(serve);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve);
    },
    closeBundle() {
      fs.cpSync(srcDir, path.join(outDir, 'templates'), { recursive: true });
    },
  };
}

// https://vitejs.dev/config/
// SUIKA_BASE=/suika/ when building the CMS island (same-origin under Herald).
// Default './' keeps standalone docker/demo (port 6167) relative-asset safe.
const base = process.env.SUIKA_BASE || './';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    checker({ typescript: true }),
    heraldTemplates(),
  ],
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
