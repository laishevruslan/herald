import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  build: { outDir: "dist" },
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react-dom/test-utils": "preact/test-utils",
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5178,
    watch: {
      // D1/miniflare writes .sqlite-wal/.sqlite-shm under .wrangler on every API hit;
      // without this Vite treats them as source changes and full-reloads the page.
      ignored: [
        path.join(root, ".wrangler"),
        "**/.wrangler/**",
        "**/*.sqlite",
        "**/*.sqlite-*",
      ],
    },
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});

