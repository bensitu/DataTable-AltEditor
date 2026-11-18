import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { minifyStylesheet } from './minify-stylesheet.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, '.pages');
if (dirname(output) !== root.replace(/[\\/]$/, ''))
  throw new Error('Site output must be inside the repository');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const name of ['index.html', 'example', 'dist', 'translations'])
  cpSync(join(root, name), join(output, name), { recursive: true });
const exampleAssets = readdirSync(join(output, 'example'), {
  recursive: true,
  withFileTypes: true,
});
for (const asset of exampleAssets) {
  if (!asset.isFile() || !asset.name.endsWith('.css')) continue;
  const path = join(asset.parentPath, asset.name);
  const { styles, warnings } = minifyStylesheet({
    [path]: { styles: readFileSync(path, 'utf8') },
  });
  for (const warning of warnings) console.warn(warning);
  writeFileSync(path, styles + '\n');
}
writeFileSync(join(output, '.nojekyll'), '');
console.log('Static examples written to .pages');
