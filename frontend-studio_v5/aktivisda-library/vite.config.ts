import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts({ include: ['lib'] })],
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/index.ts'),
      formats: ['es']
    }
  },
  resolve: {
      alias: {
          '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
  },
  test: {
    environment: 'jsdom',
    pool:'forks',
    testTimeout: 10000,
    threads: false,
    coverage: {
      provider: 'v8'
    },
  },
  mode: 'testing'

})
