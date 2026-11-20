/**
 * Bundle the standalone Nova server into a single ESM file.
 *
 * Output: dist-server/index.mjs
 *
 * The bundle is fully self-contained: it imports only Node.js built-in
 * modules (node:http, node:fs, node:path) and uses the built-in Fetch API.
 * No node_modules directory is needed at runtime.
 */

import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

const result = await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outfile: 'dist-server/index.mjs',
  // The .env loader in server/index.ts is replaced by systemd EnvironmentFile
  // in production, but we keep it for local testing.
  //
  // Externalize only Node.js built-in modules.
  external: [
    'node:fs',
    'node:path',
    'node:http',
    'node:url',
    'node:crypto',
    'node:buffer',
    'node:stream',
    'node:events',
    'node:util',
    'node:net',
    'node:tls',
    'node:os',
  ],
  // Fail on any import that would pull in an npm package.
  logLevel: 'warning',
  metafile: true,
  minifySyntax: true,
  // Keep readable for debugging in production.
  minifyWhitespace: false,
  minifyIdentifiers: false,
  banner: {
    js: `// Nova server — ${pkg.name} — built ${new Date().toISOString().slice(0, 10)}\n`,
  },
});

// Verify that no external imports exist beyond node: built-ins.
const imports = Object.keys(result.metafile.outputs)
  .flatMap((out) => result.metafile.outputs[out].imports ?? [])
  .map((i) => i.path)
  .filter((p) => !p.startsWith('node:'));

if (imports.length > 0) {
  console.error('ERROR: bundle has non-node: external imports:', imports);
  process.exit(1);
}

console.log('dist-server/index.mjs built successfully.');
