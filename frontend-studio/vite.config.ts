import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const OFL_FONTS = path.resolve(rootDir, '../server/fonts');

/** Serve the same OFL Inter files slides use — no second copy, no fonts.gstatic (D-SC-7). */
function oflFontsPlugin(): Plugin {
  const mount = (middlewares: { use: Function }) => {
    middlewares.use('/studio-fonts', (req: { url?: string }, res: any, next: () => void) => {
      const name = path.basename((req.url || '').split('?')[0]);
      if (!/^[\w.-]+\.woff2$/i.test(name) && !/^OFL-[\w.-]+\.txt$/i.test(name)) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      const file = path.join(OFL_FONTS, name);
      if (!file.startsWith(OFL_FONTS) || !fs.existsSync(file)) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      res.setHeader('Content-Type', name.endsWith('.txt') ? 'text/plain' : 'font/woff2');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      fs.createReadStream(file).pipe(res);
    });
  };
  return {
    name: 'ofl-fonts',
    configureServer(server) { mount(server.middlewares); },
    configurePreviewServer(server) { mount(server.middlewares); },
  };
}

/*
 * Studio is an intentional exception to CONTRIBUTING ("no build step for frontend/js").
 * Dashboard stays vanilla. This island alone uses Vite + React + Fabric/Layerhub.
 * base must be '/studio/' so the built assets work when mounted under the CMS origin.
 */
export default defineConfig({
  base: '/studio/',
  plugins: [react(), oflFontsPlugin()],
  server: {
    port: 5174,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Spike budget note (not a kill): record gzip size in LICENSE-AUDIT after build.
    chunkSizeWarningLimit: 3500,
  },
});
