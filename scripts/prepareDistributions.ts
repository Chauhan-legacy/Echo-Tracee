import fs from 'fs';
import path from 'path';

function copyDirRecursive(src: string, dest: string, filter?: (p: string) => boolean) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (filter && !filter(srcPath)) continue;
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, filter);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function prepare() {
  console.log('=== PREPARING DIST-A-SITE & DIST-B-LIBRARY ===\n');

  const root = path.resolve('.');
  const distA = path.resolve(root, 'dist-a-site');
  const distB = path.resolve(root, 'dist-b-library');

  // Clean targets
  if (fs.existsSync(distA)) fs.rmSync(distA, { recursive: true, force: true });
  if (fs.existsSync(distB)) fs.rmSync(distB, { recursive: true, force: true });
  fs.mkdirSync(distA, { recursive: true });
  fs.mkdirSync(distB, { recursive: true });

  // 1. Prepare Distribution A (App Site)
  console.log('[1/2] Populating dist-a-site...');
  copyDirRecursive(path.join(root, 'src'), path.join(distA, 'src'));
  copyDirRecursive(path.join(root, 'public'), path.join(distA, 'public'));
  copyDirRecursive(path.join(root, 'tests'), path.join(distA, 'tests'));
  copyDirRecursive(path.join(root, 'packages'), path.join(distA, 'packages'));

  const filesA = [
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'tailwind.config.js',
    'postcss.config.js',
    'index.html',
  ];
  for (const f of filesA) {
    if (fs.existsSync(path.join(root, f))) {
      fs.copyFileSync(path.join(root, f), path.join(distA, f));
    }
  }

  // 2. Prepare Distribution B (Math Library)
  console.log('[2/2] Populating dist-b-library...');
  const libSrc = path.join(root, 'packages', 'echotrace-math');
  copyDirRecursive(path.join(libSrc, 'src'), path.join(distB, 'src'));
  copyDirRecursive(path.join(libSrc, 'tests'), path.join(distB, 'tests'));
  copyDirRecursive(path.join(libSrc, 'docs'), path.join(distB, 'docs'));
  copyDirRecursive(path.join(libSrc, 'dist'), path.join(distB, 'dist'));

  // Create examples folder in dist-b-library if not present
  const exDir = path.join(distB, 'examples');
  fs.mkdirSync(exDir, { recursive: true });
  fs.writeFileSync(
    path.join(exDir, 'quickstart.ts'),
    `import { evaluateGoertzelBin, kalmanENFTrack, computePCE } from '../src/index';

console.log('--- echotrace-math Quickstart Demo ---');
const signal = new Float32Array(44100).map((_, i) => Math.sin(2 * Math.PI * 19400 * (i / 44100)));
const res = evaluateGoertzelBin(signal, 19400, 44100);
console.log('19.4 kHz Goertzel magnitude:', res.magnitude, 'powerDb:', res.powerDb.toFixed(2), 'dB');
`
  );

  const filesB = [
    'package.json',
    'tsconfig.json',
    'tsconfig.build.json',
    'CHANGELOG.md',
    'CITATION.cff',
  ];
  for (const f of filesB) {
    if (fs.existsSync(path.join(libSrc, f))) {
      fs.copyFileSync(path.join(libSrc, f), path.join(distB, f));
    }
  }

  console.log('Distributions prepared successfully.');
}

prepare().catch(err => {
  console.error(err);
  process.exit(1);
});
