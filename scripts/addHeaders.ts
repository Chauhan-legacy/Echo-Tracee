import fs from 'fs';
import path from 'path';

const tsHeader = `/**
 * Copyright 2026 Priyansh Chauhan
 * SPDX-License-Identifier: Apache-2.0
 */\n`;

const ps1Header = `# Copyright 2026 Priyansh Chauhan | SPDX-License-Identifier: Apache-2.0\n`;

function processFile(filePath: string) {
  const ext = path.extname(filePath);
  if (!['.ts', '.tsx', '.js', '.css', '.ps1'].includes(ext)) return;
  if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('dist')) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes('Copyright 2026 Priyansh Chauhan')) return;

  const header = ext === '.ps1' ? ps1Header : tsHeader;
  fs.writeFileSync(filePath, header + content);
  console.log('Added header to:', path.relative('.', filePath));
}

function walkDir(dir: string) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== 'node_modules' && ent.name !== '.git' && ent.name !== 'dist' && ent.name !== 'dist-a-site' && ent.name !== 'dist-b-library') {
        walkDir(full);
      }
    } else if (ent.isFile()) {
      processFile(full);
    }
  }
}

console.log('=== ADDING APACHE 2.0 HEADERS TO ALL SOURCE FILES ===');
['src', 'packages/echotrace-math/src', 'packages/echotrace-math/tests', 'scripts', 'tests'].forEach(walkDir);
console.log('Done.');
