import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, '.pages');
if (dirname(output) !== root.replace(/[\\/]$/, ''))
  throw new Error('Site output must be inside the repository');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'example', 'dist', 'translations'])
  cpSync(join(root, name), join(output, name), { recursive: true });
writeFileSync(join(output, '.nojekyll'), '');
console.log('Static examples written to .pages');
