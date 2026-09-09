import { readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import terser from '@rollup/plugin-terser';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const banner = `/*! DataTables AltEditor v${pkg.version}
 * Copyright (c) 2016 Kingkode, KasperOlesen, luca-vercelli, zack-hable
 * Copyright (c) 2026 Ben Situ and contributors
 * MIT License */`;
export default {
  input: 'src/dataTables.altEditor.free.js',
  external: ['jquery', 'datatables.net'],
  output: [false, true].map((minify) => ({
    file: `dist/dataTables.altEditor${minify ? '.min' : ''}.js`,
    format: 'umd',
    name: 'AltEditor',
    globals: { jquery: 'jQuery', 'datatables.net': 'DataTable' },
    sourcemap: true,
    banner,
    plugins: minify ? [terser({ format: { comments: /^!/ } })] : [],
  })),
  plugins: [
    {
      name: 'distribution',
      writeBundle(_options, bundle) {
        mkdirSync('dist', { recursive: true });
        copyFileSync(
          'src/style/dataTables.altEditor.css',
          'dist/dataTables.altEditor.css',
        );
        for (const [name, item] of Object.entries(bundle)) {
          if (item.type === 'chunk')
            console.log(
              `${name}: ${Buffer.byteLength(item.code)} bytes; gzip ${gzipSync(item.code).length} bytes`,
            );
        }
      },
    },
  ],
};
