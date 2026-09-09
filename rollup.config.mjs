import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import terser from '@rollup/plugin-terser';
import CleanCSS from 'clean-css';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const banner = `/*! DataTables AltEditor v${pkg.version}
 * Copyright (c) 2016 Kingkode, KasperOlesen, luca-vercelli, zack-hable
 * Copyright (c) 2026 Ben Situ and contributors
 * MIT License */`;
export default {
  input: 'src/index.js',
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
      generateBundle(options) {
        if (options.file.endsWith('.min.js')) return;
        const sourcePath = 'src/style/dataTables.altEditor.css';
        this.addWatchFile(sourcePath);
        const source = readFileSync(sourcePath, 'utf8');
        const result = new CleanCSS({
          level: { 1: { optimizeBackground: false } },
          rebase: false,
          sourceMap: true,
          sourceMapInlineSources: true,
        }).minify({ ['../' + sourcePath]: { styles: source } });
        if (result.errors.length) this.error(result.errors.join('\n'));
        for (const warning of result.warnings) this.warn(warning);
        const fileName = 'dataTables.altEditor.min.css';
        const map = result.sourceMap.toJSON();
        map.file = fileName;
        map.sources = map.sources.map((path) => path.replace(/\\/g, '/'));
        this.emitFile({
          type: 'asset',
          fileName: 'dataTables.altEditor.css',
          source,
        });
        this.emitFile({
          type: 'asset',
          fileName,
          source: `${result.styles}\n/*# sourceMappingURL=${fileName}.map */\n`,
        });
        this.emitFile({
          type: 'asset',
          fileName: fileName + '.map',
          source: JSON.stringify(map) + '\n',
        });
      },
      writeBundle(_options, bundle) {
        for (const [name, item] of Object.entries(bundle)) {
          if (item.type === 'chunk')
            console.log(
              `${name}: ${Buffer.byteLength(item.code)} bytes; gzip ${gzipSync(item.code).length} bytes`
            );
        }
      },
    },
  ],
};
