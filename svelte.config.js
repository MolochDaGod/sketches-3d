import adapterNode from '@sveltejs/adapter-node';
import adapterVercel from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess({ script: true }),

  kit: {
    alias: {
      src: fileURLToPath(new URL('./src', import.meta.url)),
    },
    inlineStyleThreshold: 2048 * 2,
    ...(process.env.VERCEL ? { files: { routes: 'src/playtest-routes' } } : {}),
    prerender: {
      concurrency: 6,
    },
    adapter: process.env.VERCEL
      ? adapterVercel()
      : adapterNode({
          out: 'build',
          // Emit brotli-q11 + gzip-9 sidecars; nginx serves them via `brotli_static`/`gzip_static`
          // instead of its low-quality dynamic brotli (~30% larger on the big wasm/JS blobs).
          precompress: true,
        }),
  },
};

export default config;
