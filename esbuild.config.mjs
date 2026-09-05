import * as esbuild from 'esbuild';
import { mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

await esbuild.build({
  entryPoints: ['src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  outfile: 'dist/handler.js',
  format: 'cjs',
  sourcemap: false,
  minify: true,
  // @aws-sdk is large; keep bundled for single-zip deploy (<5MB target).
  external: [],
  logLevel: 'info',
});

console.log('esbuild: dist/handler.js');
