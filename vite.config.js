import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import crossOriginIsolation from 'vite-plugin-cross-origin-isolation';
import { behaviorsPlugin } from './src/viz/sceneRuntime/viteBehaviorsPlugin.ts';
import { generatorsPlugin } from './src/viz/levelDef/viteGeneratorsPlugin.ts';
import { generatedScenesPlugin } from './src/viz/scenes/viteGeneratedScenesPlugin.ts';

const root = path.dirname(fileURLToPath(import.meta.url));
const vercelPlaytest = !!process.env.VERCEL;

const config = defineConfig({
  resolve: vercelPlaytest
    ? {
        alias: [
          {
            find: /geoscript[/\\]geoscriptExecutor(?:\.ts)?$/,
            replacement: path.join(root, 'src/playtest/geoscriptExecutorStub.ts'),
          },
          {
            find: /levelDef[/\\]loadLevelDef(?:\.ts)?$/,
            replacement: path.join(root, 'src/playtest/loadLevelDefStub.ts'),
          },
        ],
      }
    : {},
  plugins: [
    // Must run before `sveltekit()` so its `config()` hook writes the
    // `src/routes/(generated)/` tree before SvelteKit walks the routes dir.
    generatedScenesPlugin(),
    sveltekit(),
    devtoolsJson(),
    crossOriginIsolation(),
    behaviorsPlugin(),
    generatorsPlugin(),
  ],
  server: {
    port: 4800,
    proxy: {
      '/api': {
        target: 'https://3d.ameo.design/api',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
      '/cdn-assets': {
        target: 'https://assets.grudge-studio.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/cdn-assets/, ''),
      },
    },
    watch: {
      ignored: p =>
        /[\\/](?:node_modules|\.git|\.svelte-kit|dist|build)(?:[\\/]|$)/.test(p) ||
        /[\\/](?:backend|geoscript_backend)(?:[\\/]|$)/.test(p) ||
        /[\\/]src[\\/]viz[\\/]wasm(?:[\\/]|$)/.test(p),
    },
    allowedHosts: ['3d.p.ameo.design', '3d.grudge.studio', '3d.grudge-studio.com'],
  },
  optimizeDeps: {
    exclude: ['codemirror'],
  },
  build: {
    sourcemap: true,
    target: 'esnext',
  },
  worker: {
    format: 'es',
  },
});

export default config;
