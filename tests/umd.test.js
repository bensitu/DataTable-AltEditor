// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { expect, test } from 'vitest';

const require = createRequire(import.meta.url);
for (const mode of ['browser', 'AMD', 'CommonJS']) {
  test(`loads through ${mode}`, () => {
    const dom = new JSDOM('<table></table>', {
      runScripts: 'outside-only',
      url: 'http://localhost',
    });
    const win = dom.window;
    win.eval(readFileSync(require.resolve('jquery'), 'utf8'));
    win.eval(
      readFileSync(
        require.resolve(process.env.DATATABLES_PACKAGE || 'datatables.net'),
        'utf8'
      )
    );
    if (mode === 'AMD') {
      win.define = (_deps, factory) => {
        win.AltEditor = factory(win.jQuery, win.DataTable);
      };
      win.define.amd = true;
    }
    if (mode === 'CommonJS') {
      const initialize = require('../dist/dataTables.altEditor.js');
      const AltEditor = initialize(win, win.jQuery);
      expect(AltEditor).toBe(win.DataTable.altEditor);
    }
    if (mode !== 'CommonJS')
      win.eval(readFileSync('dist/dataTables.altEditor.js', 'utf8'));
    const table = new win.DataTable('table', {
      data: [[1]],
      columns: [{ title: 'Value' }],
      altEditor: true,
    });
    expect(table.table().node().altEditor).toBeTruthy();
    table.destroy();
    win.close();
  });
}
