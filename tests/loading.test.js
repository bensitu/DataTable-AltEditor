import { expect, test } from 'vitest';
import DataTable from 'datatables.net';
import AltEditor from '../src/dataTables.altEditor.free.js';

test('registers an editor for automatic initialization', () => {
  document.body.innerHTML = '<table id="table"></table>';
  const table = new DataTable('#table', {
    data: [{ name: 'Alice' }],
    columns: [{ data: 'name', title: 'Name' }],
    altEditor: true,
  });
  expect(table.table().node().altEditor).toBeInstanceOf(AltEditor);
  table.destroy();
});
