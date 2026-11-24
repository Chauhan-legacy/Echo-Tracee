import fs from 'fs';
import path from 'path';

function getDirSize(dir: string): number {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  function walk(d: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      if (ent.isDirectory()) {
        walk(full);
      } else if (ent.isFile()) {
        try {
          total += fs.statSync(full).size;
        } catch {}
      }
    }
  }
  walk(dir);
  return total;
}

const targets = ['.', 'node_modules', '.git', 'dist', 'packages', 'src', 'public', 'test-media'];
console.log('=== PROJECT DIRECTORY SIZES ===');
for (const t of targets) {
  const bytes = getDirSize(t);
  console.log(`${t.padEnd(16)} : ${(bytes / 1024 / 1024).toFixed(2)} MB (${bytes.toLocaleString()} bytes)`);
}
