/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { build } from 'vite';
import fs from 'fs';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const libDir = path.resolve(rootDir, 'packages', 'echotrace-math');
const outDir = path.resolve(libDir, 'dist');

async function run() {
  console.log('=== BUILDING ECHOTRACE-MATH LIBRARY ===\n');

  // 1. Build ESM & CJS single-file distributions using Vite
  await build({
    configFile: false,
    build: {
      lib: {
        entry: path.resolve(libDir, 'src', 'index.ts'),
        name: 'EchoTraceMath',
        formats: ['es', 'cjs', 'umd'],
        fileName: (format) => {
          if (format === 'es') return 'index.js';
          if (format === 'cjs') return 'index.cjs';
          return 'echotrace-math.min.js';
        },
      },
      outDir: outDir,
      emptyOutDir: false,
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          exports: 'named',
        },
      },
    },
  });

  // 2. Measure sizes
  const minBundle = path.resolve(outDir, 'echotrace-math.min.js');
  if (fs.existsSync(minBundle)) {
    const raw = fs.readFileSync(minBundle);
    const gz = zlib.gzipSync(raw);
    console.log(`\nSingle-File Minified Bundle:`);
    console.log(`  Raw size:  ${(raw.length / 1024).toFixed(2)} kB (${raw.length.toLocaleString()} bytes)`);
    console.log(`  Gzip size: ${(gz.length / 1024).toFixed(2)} kB (${gz.length.toLocaleString()} bytes)`);
  }
}

run().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
