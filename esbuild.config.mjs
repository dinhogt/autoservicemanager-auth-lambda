import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
mkdirSync('dist/notify-os', { recursive: true });

await esbuild.build({
  entryPoints: ['src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'dist/handler.js',
  format: 'cjs',
  sourcemap: false,
  minify: true,
  external: [],
  logLevel: 'info',
});

await esbuild.build({
  entryPoints: ['src/notify-os/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'dist/notify-os/handler.js',
  format: 'cjs',
  sourcemap: false,
  minify: true,
  external: [],
  logLevel: 'info',
});

console.log('esbuild: dist/handler.js + dist/notify-os/handler.js');
